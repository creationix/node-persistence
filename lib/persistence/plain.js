var fs = require('fs');
var defer = process.nextTick;

exports.connect = function connect(filename, callback) {
  defer(function () {
    callback({
      getStore: function getStore(name, callback) {
        defer(function () {
          callback({
            get: function get(query, options, callback) {},
            insert: function insert(data, callback) {},
            update: function update(data, query, options, callback) {},
            remove: function remove(query, options, callback) {}
          });
        })
      },
      close: function (callback) {
        defer(callback);
      }
    });
  });
};