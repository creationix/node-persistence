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

function js_to_sql(class) {
  if (class === String) {
    return 'text';
  }
  if (class === Number) {
    return 'integer';
  }
  if (class === Boolean) {
    return 'bool';
  }
  throw "Unknown type " + class;
}

function condition_to_sql(condition, value) {
  var operator,
      p = condition.indexOf(' ');
  if (p === -1) {
    return condition + " = " + sql_escape(value);
  }
  operator = condition.substr(p + 1);
  condition = condition.substr(0, p);
  if (['<', '>', '=', '<=', '>=', '!=', '<>'].indexOf(operator) >= 0) {
    return condition + " " + operator + " " + sql_escape(value);
  }
  if (operator === '%') {
    return condition + " LIKE " + sql_escape(value);
  }
  sys.debug(operator);
  throw "Invalid operator " + operator;
}

function Store(conn, name, columns) {
  var key,
      types = [];

  this.name = name;
  this.conn = conn;

  for (key in columns) {
    if (columns.hasOwnProperty(key)) {
      types.push(key + " " + js_to_sql(columns[key]));
    }
  }

  conn.execute("CREATE TABLE " + name + "(" + types.join(", ") +")").wait();
}
Store.prototype = {

  get: function (id) {
    var promise = new process.Promise();
    this.conn.query(
      "SELECT rowid AS _id, * FROM " + this.name + " WHERE rowid = ?",
      id
    ).addCallback(function (data) {
      promise.emitSuccess(data[0]);
    });
    return promise;
  },
  
  find: function (conditions, row_callback) {
    var sql;
    // Shortcut if there are no conditions.
    if (conditions === undefined || conditions.length === 0) {
      return this.all();
    }

    if (conditions.constructor.name !== 'Array') {
      conditions = [conditions];
    }
    
    sql = "SELECT rowid AS _id, * FROM " + this.name + " WHERE " +
      conditions.map(function (group) {
        var ands = [], key;
        for (key in group) {
          if (group.hasOwnProperty(key)) {
            ands.push(condition_to_sql(key, group[key]));
          }
        }
        return "(" + ands.join(" AND ") + ")";
      }).join(" OR ");
    
    if (row_callback) {
      return this.conn.query(sql, row_callback);
    }
    return this.conn.query(sql);
  },
  
  each: function (row_callback) {
    return this.conn.query("SELECT rowid AS _id, * FROM " + this.name, row_callback);
  },
  
  all: function () {
    return this.conn.query("SELECT rowid AS _id, * FROM " + this.name);
  },
  
  // Save a data object to the database.  If it already has an _id do an update.
  save: function (data) {
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
      this.conn.execute("UPDATE " + this.name +
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
      this.conn.query("INSERT INTO " +
        this.name + "(" + keys.join(", ") + ")" +
        " VALUES (" + values.join(", ") + ");" +
        "SELECT last_insert_rowid() AS rowid"
      ).addCallback(function (result) {
        data._id = parseInt(result[0].rowid, 10);
        promise.emitSuccess(data._id);
      });
    }
    return promise;
  },

  // Remove an entry from the database and remove the _id from the data object.
  remove: function (data) {
    var promise = new process.Promise();
    if (typeof data === 'number') {
      data = {_id: data};
    }
    this.conn.execute("DELETE FROM " + this.name +
      " WHERE rowid = " + sql_escape(data._id)
    ).addCallback(function () {
      delete data._id;
      promise.emitSuccess();
    });
    return promise;
  },

  nuke: function () {
    return this.conn.query("DELETE FROM " + this.name);
  }
  
};

function Connection(path) {

  var child = process.createChildProcess("sqlite3", ['-interactive', '-header', '-nullvalue', "\r", '-separator', "\t", path]),
      queue = [], // Queue of sql requests
      dequeued = 0, // Pointer used by the delayed shift mechanism
      callback = null, // Callback for the query in progress
      started, terminated, // Flags set when connection is verified and when close is called.
      conn = this;

  // Enable the timer footer so that we can detect zero length results
  child.write(".timer on\n");

  // A inner state-machine that does all the queue logic.  This needs to 
  // be called any time an event happens that may change the flow.
  function cycle(string) {
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
      child.write(next[0]);
    }
  }
  child.addListener("output", cycle);

  // If sqlite3 isn't in the path or the arguments are bad, this will trigger.
  child.addListener("error", function (data) {
    // sys.debug("error: " + sys.inspect(data));
    // Ignore the null that sometimes gets emitted on close
    if (data) {
      conn.emit('error', data.replace(/\n+$/, ''));
    }
  });

  // Execute a sql statement
  conn.execute = function (sql/*, *parameters*/) {
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
        conn.emit('error', result.replace(/\n+$/, ''));
      } else {
        promise.emitSuccess(result);
      }
    }]);

    cycle();

    return promise;
  };

  // Execute a sql query
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
        conn.emit('error', data);
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

  // Get a new store object.
  conn.get_store = function (name, columns) {
    return new Store(this, name, columns);
  }

  // Close the child process as soon as the queue is empty.  This allows node to finish.
  conn.close = function () {
    terminated = true;
    cycle();
  };

}
Connection.prototype = new process.EventEmitter();

exports.new_connection = function (connection_parameters) {
  return new Connection(connection_parameters);
}