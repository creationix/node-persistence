var sys = require('sys');
var defer = process.nextTick;

function make_row(id, data) {
  var row = {};
  process.mixin(row, data);
  row._id = id;
  return row;
}

function Store(conn, columns) {
  this.conn = conn;
  this.columns = columns;
  this.data = [];
}
Store.prototype = {
  get: function (id, callback) {
    var table = this.data;
    defer(function () {
      var data = table[id - 1];
      if (data) {
        callback(make_row(id, data));
      } else {
        callback(data);
      }
    });
  },
  find: function (conditions, row_callback, callback) {
    // row_callback is optional
    if (typeof callback === 'undefined') {
      callback = row_callback;
      row_callback = false;
    }
    var table = this.data;

    // Shortcut if there are no conditions.
    if (conditions === undefined || conditions.length === 0) {
      return this.all(callback);
    }

    defer(function () {
      var results;
    

      if (conditions.constructor.name !== 'Array') {
        conditions = [conditions];
      }
    
      results = table.map(function (data, index) {
        return make_row(index + 1, data);
      }).filter(function (row) {
        return conditions.some(function (group) {
          return Object.keys(group).every(function (condition) {
            var value = group[condition],
                operator,
                p = condition.indexOf(' ');
            if (p === -1) {
              return row[condition] == value;
            }
            operator = condition.substr(p + 1);
            condition = condition.substr(0, p);
            switch (operator) {
            case '<':
              return row[condition] < value;
            case '>':
              return row[condition] > value;
            case '=':
              return row[condition] === value;
            case '<=':
              return row[condition] <= value;
            case '>=':
              return row[condition] >= value;
            case '!=':
            case '<>':
              return row[condition] !== value;
            case '~':
              return row[condition].match(new RegExp(value));
            }
            sys.debug(operator);
            throw "Invalid operator " + operator;
          });
        });
      });
    
      if (row_callback) {
        results.forEach(function (row) {
          row_callback(row);
        });
        callback();
      } else {
        callback(results);
      }
    });

  },
  each: function (row_callback, callback) {
    this.data.forEach(function (data, i) {
      defer(function () {
        row_callback(make_row(i + 1, data));
      });
    });
    defer(function () {
      callback();
    });
  },
  all: function (callback) {
    var table = this.data;
    defer(function () {
      callback(table.map(function (data, index) {
        return make_row(index + 1, data);
      }));
    });
  },
  save: function (row, callback) {
    var table = this.data;
    defer(function () {
      var data = {},
          id = table.length + 1;
      process.mixin(data, row);
      if (data._id) {
        id = data._id;
        delete data._id;
        table[id - 1] = data;
        callback();
      } else {
        table.push(data);
        row._id = table.length;
        callback(row._id);
      }
    });
  },
  remove: function (row, callback) {
    var table = this.data;
    defer(function () {
      var index;
      if (row instanceof Object) {
        index = row._id - 1;
        delete row._id;
      } else {
        index = row - 1;
      }
      table.splice(index, 1);
      callback();
    });
  },
  nuke: function (callback) {
    var self = this;
    defer(function () {
      self.data = [];
      callback();
    });
  }
};

function Connection() {}
Connection.prototype = new process.EventEmitter();
Connection.prototype.get_store = function (columns) {
  return new Store(this, columns);
};
Connection.prototype.close = function () {};

exports.get_store = function (columns) {
  return (new Connection).get_store(columns);
};
exports.new_connection = function () {
  var db = new Connection();
  defer(function () {
    db.emit('connection');
  });
  return db;
};