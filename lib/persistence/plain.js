var fs = require('fs');
var defer = process.nextTick;


exports.connect = function connect(filename, callback) {
  defer(function () {
    callback(null, {
      getStore: function getStore(name, callback) {
        defer(function () {
          callback(null, {
            get: function get(query, options, callback) {},
            insert: function insert(data, callback) {},
            update: function update(data, query, options, callback) {},
            remove: function remove(query, options, callback) {}
          });
        })
      },
      close: defer
    });
  });
};