// Driver API
// - `new_connection(*connection_parameters)` - Returns a connection object. The connection parameters are driver specific.
//   - `<success>` - Event fired when a connection is successfully made.  Queries can safely be made before this point, but they won't se sent to the database engine yet for obvious reasons.
//   - `<error>(reason)` - Event fired when something goes wrong in either the connection or any of the sub-methods.
//   - `query(sql [, *params [, row_callback]])` - Method that queries the database.  If placeholders are used in the sql, they are filled in with the data from params.  If you wish to stream the results, pass in a callback function as the last argument
//     - `<success>(data)` - Event fired when the query has returned.  Contains an array of JSON objects if a row_callback wasn't passed in to the query method.
//   - `execute(sql, [*params])` - Execute arbitrary sql against the database.
//     - `<success>` - Event fired if successful.
//   - `save(table, data)` - Saves a row to the database.  If the id is undefined, then it's an insert, otherwise it's an update.
//     - `<success>([insert_id])` - Event fired when done.  If an insert was performed, the insert_id is returned.  Also the passed in data object from the save command has it's `_id` set automatically.
//   - `remove(table, id/data)` - Removes a record by id from the database.  Removes the `_id` if a data object is passed in.
//     - `<success>` - Event fired if successful.
//   - `close()` - Close the connection to the database once the queue is empty.

var sys = require('sys');

// Escape of values from native to SQL string.
// http://www.sqlite.org/lang_expr.html
function sql_escape(value) {
  if (value === null) {
    return "NULL";
  }
  if (value === true) {
    return "TRUE";
  }
  if (value === false) {
    return "FALSE";
  }
  if (value.constructor.name === 'String') {
    return "'" + value.replace("'", "''") + "'";
  }
  return value.toString();
}

// Fill in the placeholders with native values
function merge(sql, parameters) {
  if (parameters.length === 0) {
    return sql;
  }
  if (parameters.length === 1 && parameters[0].constructor.name === 'Object') {
    parameters = parameters[0];
    // Named parameters
    for (var key in parameters) {
      if (parameters.hasOwnProperty(key)) {
        sql = sql.replace(":" + key, sql_escape(parameters[key]));
      }
    }
  } else {
    if (parameters.length === 1 && parameters[0].constructor.name === 'Array') {
      parameters = parameters[0];
    }
    // ordered parameters
    parameters.forEach(function (param) {
      sql = sql.replace("?", sql_escape(param));
    });
  }
  return sql;
}

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

exports.new_connection = function (path) {

  var child = process.createChildProcess("sqlite3", ['-interactive', '-header', '-nullvalue', "\r", '-separator', "\t", path]),
      queue = [], // Queue of sql requests
      dequeued = 0, // Pointer used by the delayed shift mechanism
      callback = null, // Callback for the query in progress
      started, terminated, // Flags set when connection is verified and when close is called.
      conn = new process.Promise(); // The connection object that's returned.

  // Enable the timer footer so that we can detect zero length results
  child.write(".timer on\n");
  // A inner state-machine that does all the queue logic.  This needs to 
  // be called any time an event happens that may change the flow.
  function cycle(string) {
    var next;

    if (string !== undefined) {
      // sys.debug("output: " + sys.inspect(string));
      if (!started && string.match(/^SQLite version \d+\.\d+\.\d+/)) {
        conn.emitSuccess();
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
      if (terminated) {
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
      child.write(next[0]);
    }
  }

  // If sqlite3 isn't in the path or the arguments are bad, this will trigger.
  child.addListener("error", function (data) {
    // sys.debug("error: " + sys.inspect(data));
    // Ignore the null that sometimes gets emitted on close
    if (data) {
      conn.emitError(data);
    }
  });

  child.addListener("output", cycle);


  // Execute a non-query
  conn.execute = function (sql) {
    var promise = new process.Promise();

    // // Don't accept more if close has been called.
    // if (terminated) {
    //   return promise;
    // }
    
    // Merge the parameters in with the sql if needed.
    sql = merge(sql, Array.prototype.slice.call(arguments, 1));

    queue.push([sql + ";\n", function (result) {
      if (result.length > 0) {
        promise.emitError(result);
        conn.emitError(result);
      } else {
        promise.emitSuccess(result);
      }
    }]);

    cycle();
    
    return promise;
  };
  
  conn.query = function (sql/*, *parameters, row_callback*/) {
    var row_callback, parameters, promise;

    promise = new process.Promise();

    // // Don't accept more if close has been called.
    // if (terminated) {
    //   return promise;
    // }
    
    // Grab the variable length parameters and the row_callback is there is one.
    parameters = Array.prototype.slice.call(arguments, 1);
    if (typeof parameters[parameters.length - 1] === 'function') {
      row_callback = parameters.pop();
    }
    
    // Merge the parameters in with the sql if needed.
    if (parameters.length > 0) {
      sql = merge(sql, parameters);
    }

    queue.push([sql + ";\n", function (string) {

      // Parse the result into an array of rows
      var data = parse(string);
      
      // If parse returns a string it means there was an error.
      if (data.constructor.name !== "Array") {
        promise.emitError(data);
        conn.emitError(data);
        return;
      }
      
      // This sqlite driver doesn't support true data streaming, but we can
      // simulate it for api consistancy.
      if (row_callback) {
        data.forEach(function (row) {
          row_callback(row);
        });
        promise.emitSuccess();
      } else {
        promise.emitSuccess(data);
      }
    }]);

    cycle();
    
    return promise;
  };
  
  // Remove an entry from the database and remove the _id from the data object.
  conn.remove = function (table, data) {
    var promise = new process.Promise();
    if (typeof data === 'number') {
      data = {_id: data};
    }
    conn.execute("DELETE FROM " + table +
      " WHERE rowid = " + sql_escape(data._id)
    ).addCallback(function () {
      delete data._id;
      promise.emitSuccess();
    });
    return promise;
  };
  
  // Save a data object to the database.  If it already has an _id do an update.
  conn.save = function (table, data) {
    var keys = [], 
        values = [],
        pairs = [],
        promise = new process.Promise(),
        key;
    
    if (data._id) {
      for (key in data) {
        if (data.hasOwnProperty(key) && key !== '_id') {
          pairs.push(key + " = " + sql_escape(data[key]));
        }
      }
      conn.execute("UPDATE " + table +
        " SET " + pairs.join(", ") +
        " WHERE rowid = " + sql_escape(data._id)
      ).addCallback(function () {
        promise.emitSuccess();
      });
    } else {
      for (key in data) {
        if (data.hasOwnProperty(key)) {
          keys.push(key);
          values.push(sql_escape(data[key]));
        }
      }
      conn.query("INSERT INTO " +
        table + "(" + keys.join(", ") + ")" +
        " VALUES (" + values.join(", ") + ");" +
        "SELECT last_insert_rowid() AS rowid"
      ).addCallback(function (result) {
        data._id = parseInt(result[0].rowid, 10);
        promise.emitSuccess(data._id);
      });
    }
    return promise;
  };

  // Close the child process as soon as the queue is empty.  This allows node to finish.
  conn.close = function () {
    terminated = true;
    cycle();
  };
  
  return conn;
};

