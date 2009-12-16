// Escape of values from native to SQL string.
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

// Converter between JS types and SQL data types
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

// Convert a condition hash/array to a proper SQL where clause.
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

// overrides needs to contain at least the following
// index_col: the name of the special index column rowid in sqlite and oid in postgres
// do_insert: function (promise, data, keys, values) 
// do_update: function (promise, data, pairs) 

function Store(conn, name, columns, overrides) {
  var key,
      types = [];

  this.name = name;
  this.conn = conn;
  
  if (overrides.types) {
    types = overrides.types;
    delete overrides.types;
  }
  
  if (columns) {
    for (key in columns) {
      if (columns.hasOwnProperty(key)) {
        types.push(key + " " + js_to_sql(columns[key]));
      }
    }
  
    conn.execute("CREATE TABLE " + name + "(" + types.join(", ") +")").wait();
  }

  if (overrides) {
    process.mixin(this, overrides);
  }


}
Store.prototype = {

  get: function (id) {
    var promise = new process.Promise();
    this.conn.query(
      "SELECT " + this.index_col + " AS _id, * FROM " + this.name + " WHERE " + this.index_col + " = ?",
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
    
    sql = "SELECT " + this.index_col + " AS _id, * FROM " + this.name + " WHERE " +
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
    return this.conn.query("SELECT " + this.index_col + " AS _id, * FROM " + this.name, row_callback);
  },
  
  all: function () {
    return this.conn.query("SELECT " + this.index_col + " AS _id, * FROM " + this.name);
  },
  
  do_update: function (promise, data, pairs) {
    this.conn.execute("UPDATE " + this.name +
      " SET " + pairs.join(", ") +
      " WHERE " + this.index_col + " = " + sql_escape(data._id)
    ).addCallback(function () {
      promise.emitSuccess();
    });
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
      this.do_update(promise, data, pairs);
    } else {
      for (key in data) {
        if (data.hasOwnProperty(key)) {
          keys.push(key);
          values.push(sql_escape(data[key]));
        }
      }
      this.do_insert(promise, data, keys, values);
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
      " WHERE " + this.index_col + " = " + sql_escape(data._id)
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

exports.merge = merge;
exports.Store = Store;


