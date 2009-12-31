var sys = require('sys');

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
  get: function (id) {
    var promise = new process.Promise();
    var table = this.data;
    setTimeout(function () {
      var data = table[id - 1];
      if (data) {
        promise.emitSuccess(make_row(id, data));
      } else {
        promise.emitSuccess(data);
      }
    });
    return promise;
  },
  find: function (conditions, row_callback) {
    var table = this.data;
    var promise = new process.Promise();

    // Shortcut if there are no conditions.
    if (conditions === undefined || conditions.length === 0) {
      return this.all();
    }

    setTimeout(function () {
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
        promise.emitSuccess();
      } else {
        promise.emitSuccess(results);
      }
    });
    return promise;

  },
  each: function (row_callback) {
    var promise = new process.Promise();
    this.data.forEach(function (data, i) {
      setTimeout(function () {
        row_callback(make_row(i + 1, data));
      });
    });
    setTimeout(function () {
      promise.emitSuccess();
    });
    return promise;
  },
  all: function () {
    var promise = new process.Promise();
    var table = this.data;
    setTimeout(function () {
      promise.emitSuccess(table.map(function (data, index) {
        return make_row(index + 1, data);
      }));
    });
    return promise;
  },
  save: function (row) {
    var promise = new process.Promise();
    var table = this.data;
    setTimeout(function () {
      var data = {},
          id = table.length + 1;
      process.mixin(data, row);
      if (data._id) {
        id = data._id;
        delete data._id;
        table[id - 1] = data;
        promise.emitSuccess();
      } else {
        table.push(data);
        row._id = table.length;
        promise.emitSuccess(row._id);
      }
    });
    return promise;
  },
  remove: function (row) {
    var promise = new process.Promise();
    var table = this.data;
    setTimeout(function () {
      var index;
      if (row instanceof Object) {
        index = row._id - 1;
        delete row._id;
      } else {
        index = row - 1;
      }
      table.splice(index, 1);
      promise.emitSuccess();
    });
    return promise;
  },
  nuke: function () {
    var promise = new process.Promise();
    var self = this;
    setTimeout(function () {
      self.data = [];
      promise.emitSuccess();
    });
    return promise;
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
  setTimeout(function () {
    db.emit('connection');
  });
  return db;
};