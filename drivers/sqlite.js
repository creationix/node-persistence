// Driver API
// - `new_connection(*connection_parameters)` - Returns a connection object. The connection parameters are driver specific.
//   - `<success>(settings)` - Event fired when a connection is successfully made.  Queries can safely be made before this point, but they won't se sent to the database engine yet for obvious reasons.
//   - `<error>(reason)` - Event fired when something goes wrong in either the connection or any of the sub-methods.
//   - `query(sql [, *params [, row_callback]])` - Method that queries the database.  If placeholders are used in the sql, they are filled in with the data from params.  If you wish to stream the results, pass in a callback function as the last argument
//     - `<success>(data)` - Event fired when the query has returned.  Contains an array of JSON objects if a row_callback wasn't passed in to the query method.
//   - `execute(sql, [*params])` - Execute arbitrary sql against the database.
//     - `<success>` - Event fired if successful.
//   - `save(table, data)` - Saves a row to the database.  If the id is undefined, then it's an insert, otherwise it's an update.
//     - `<success>(type)` - Event fired when done.  Type is either "insert", "update", or "upsert".  The insert id is not returned, however the passed in data object from the save command has it's ID set automatically.
//   - `delete(table, id)` - Deletes a record by id.
//     - `<success>` - Event fired if successful.

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
  return sql
}

// Parse a result string from sqlite into an array of json objects
function parse(string) {
  var headers, p;

  // Get the location of the first newline.
  p = string.indexOf("\n");

  // SQL errors return a single line ending in newline.
  if (p == string.length - 1) {
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

  var child = process.createChildProcess("sqlite3", ['-batch', '-header', '-nullvalue', "\r", '-separator', "\t", path]),
      queue = [], // Queue of sql requests
      dequeued = 0, // Pointer used by the delayed shift mechanism
      callback = null, // Callback for the query in progress
      want_close = false, // Flag set when a close has been called.
      conn = new process.Promise(); // The connection object that's returned.



  // If sqlite3 isn't in the path or the arguments are bad, this will trigger.
  child.addListener("error", function (data) {
    // Ignore the null that sometimes gets emitted on close
    if (data) {
      conn.emitError(data);
    }
  });

  // Test the connection
  child.write(".show\n");
  
  function startup (output) {
    var settings = {};
    if (output) {
      output.replace(/\n$/, "").split("\n").forEach(function (line) {
        var parts = line.split(": ");
        parts[1] = parts[1].replace(/ *$/, '');
        if (parts[1].match(/^\".*\"$/)) {
          parts[1] = JSON.parse(parts[1]);
        }
        settings[parts[0].replace(/^ */, '')] = parts[1];
      });
      conn.emitSuccess(settings);
      child.removeListener("output", startup);
      child.addListener("output", cycle);
    }
    
  }
  child.addListener("output", startup);

  // A inner state-machine that does all the queue logic.  This needs to 
  // be called any time an event happens that may change the flow.
  function cycle(string) {
    // debug(queue.length);
    var next;

    // When we get data, call the callback and clear everything.
    if (string && callback) {
      callback(string);
      callback = null;
    }
    
    // If the queue is empty, we're done
    if (queue.length === 0) {
      // Close the child process if desired.
      if (want_close) {
        child.write(".show\n");
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
  

  // Execute a non-query
  conn.execute = function (sql) {
    var promise = new process.Promise();
    
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
  
  conn.save = function (sql) {
    sys.debug("TODO: Implement save");
    return new process.Promise();
  };

  conn.query = function (sql/*, *parameters, row_callback*/) {
    var row_callback, parameters, promise;
    
    // Grab the variable length parameters and the row_callback is there is one.
    parameters = Array.prototype.slice.call(arguments, 1);
    if (typeof parameters[parameters.length - 1] === 'function') {
      row_callback = parameters.pop();
    }
    
    // Merge the parameters in with the sql if needed.
    if (parameters.length > 0) {
      sql = merge(sql, parameters);
    }

    promise = new process.Promise();
    
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
        })
        promise.emitSuccess();
      } else {
        promise.emitSuccess(data);
      }
    }]);

    cycle();
    
    return promise;
  };
  
  conn.close = function () {
    want_close = true;
    cycle();
    return new process.Promise();
  };
  
  return conn;
}

