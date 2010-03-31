var sys = require('sys');
var sqllib = require('./common/sql');

// Parse a result string from sqlite into an array of json objects
function parse(string) {
  var headers, p;

  if (string.length === 0) {
    return [];
  }
  
  // Get the location of the first newline.
  p = string.indexOf("\n");

  // SQL errors return a single line ending in newline.
  if (p === string.length - 1) {
    return string.substr(0, p);
  }

  // Find and extract the header row.
  // It's \t seperated fields ending with a \n.
  headers = string.substr(0, p).split("\t");

  // Chop off the header from the string and the trailing newline.
  // Then split into rows seperated by "\n".
  // Then for each row, zip the fields seperated by "\t" with the headers as
  // keys, converting values of "\r" to null.
  return string.substr(p + 1, string.length - p - 2)
    .split("\n").map(function (row) {
      var data = {};
      row.split("\t").forEach(function (item, index) {
        data[headers[index]] = item === "\r" ? null : item;
      });
      return data;
    });
}

function Connection(path) {

  var child = require("child_process").spawn("sqlite3", ['-interactive', '-header', '-nullvalue', "\r", '-separator', "\t", path]),
      queue = [], // Queue of sql requests
      dequeued = 0, // Pointer used by the delayed shift mechanism
      callback = null, // Callback for the query in progress
      started, terminated, // Flags set when connection is verified and when close is called.
      conn = this;

  // Enable the timer footer so that we can detect zero length results
  child.stdin.write(".timer on\n");

  // A inner state-machine that does all the queue logic.  This needs to 
  // be called any time an event happens that may change the flow.
  function cycle(string) {
    if (typeof string === 'object') {
      string = string.toString();
    }
    var next;

    // Ignore nulls that get output from the child process.
    if (string === null) {
      return;
    }
    
    if (string !== undefined) {
      // sys.debug("output: " + sys.inspect(string));
      if (!started && string.match(/^SQLite version \d+\.\d+\.\d+/)) {
        conn.emit('connection');
        started = true;
        string = undefined;
      }
    }

    // When we get data, call the callback and clear everything.
    if (string) {
      // Clean out the timer line
      string = string.replace(/CPU Time: user \d+\.\d+ sys \d+\.\d+\n/, "");

      callback(string);
      callback = null;
    }

    // If the queue is empty, we're done
    if (queue.length === 0) {
      // Close the child process if desired.
      if (terminated && !callback) {
        child.close();
      }
      return;
    }

    // If no query is active, insert another
    if (!callback) {

      // Use a delayed shift queue instead of shifting every time.
      next = queue[dequeued];
      dequeued += 1;
      if (dequeued * 2 > queue.length) {
        queue = queue.slice(dequeued);
        dequeued = 0;
      }

      callback = next[1];
      child.stdin.write(next[0]);
    }
  }
  child.stdout.addListener("data", cycle);

  // If sqlite3 isn't in the path or the arguments are bad, this will trigger.
  child.stderr.addListener("data", function (data) {
    // sys.debug("error: " + sys.inspect(data));
    // Ignore the null that sometimes gets emitted on close
    if (data) {
      conn.emit('error', data.replace(/\n+$/, ''));
    }
  });

  // Execute a sql statement
  conn.execute = function (sql/*, parameters, callback*/) {
    var parameters = Array.prototype.slice.call(arguments, 1);
    var callback = parameters.pop();

    // Merge the parameters in with the sql if needed.
    sql = sqllib.merge(sql, parameters);

    queue.push([sql + ";\n", function (result) {
      if (result.length > 0) {
        conn.emit('error', result.replace(/\n+$/, ''));
      } else {
        callback(result);
      }
    }]);

    cycle();
  };

  // Execute a sql query
  conn.query = function (sql/*, *parameters, row_callback, callback*/) {
    var row_callback, parameters, callback;

    // Grab the variable length parameters and the row_callback is there is one.
    parameters = Array.prototype.slice.call(arguments, 1);
    callback = parameters.pop();
    if (typeof parameters[parameters.length - 1] === 'function') {
      row_callback = parameters.pop();
    }

    // Merge the parameters in with the sql if needed.
    if (parameters.length > 0) {
      sql = sqllib.merge(sql, parameters);
    }

    queue.push([sql + ";\n", function (string) {

      // Parse the result into an array of rows
      var data = parse(string);

      // If parse returns a string it means there was an error.
      if (data.constructor.name !== "Array") {
        conn.emit('error', data);
        return;
      }

      // This sqlite driver doesn't support true data streaming, but we can
      // simulate it for api consistancy.
      if (row_callback) {
        data.forEach(function (row) {
          row_callback(row);
        });
        callback();
      } else {
        callback(data);
      }
    }]);

    cycle();
  };

  // Close the child process as soon as the queue is empty.  This allows node to finish.
  conn.close = function () {
    terminated = true;
    cycle();
  };

}
Connection.prototype = new process.EventEmitter();
Connection.prototype.get_store = function (name, columns) {
  return new sqllib.Store(this, name, columns, {
    do_insert: function (data, keys, values, callback) {
      this.conn.query("INSERT INTO " +
        this.name + "(" + keys.join(", ") + ")" +
        " VALUES (" + values.join(", ") + ");" +
        "SELECT last_insert_rowid() AS _id",
        function (result) {
          data._id = parseInt(result[0]._id, 10);
          callback(data._id);
        }
      );
    },

    index_col: 'rowid'
  });
};

exports.new_connection = function (connection_parameters) {
  return new Connection(connection_parameters);
}


