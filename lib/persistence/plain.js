var fs = require('fs');
var defer = process.nextTick;


exports.connect = function connect(filename, callback) {
  // filename is optional
  if (typeof filename === 'function') {
    callback = filename;
    filename = undefined;
  }
  
  // Variable to store the in-memory database
  var data;
  
  // Load from disk if a filename was specified.
  if (filename) {
    fs.readFile(filename, function (err, json) {
      try {
        // If the file doesn't exist, then move on.
        if (err && err.errno === 2) {
          data = {};
          callback(null, makeConnection());
          return;
        }
        // If there is another error, then pass it on.
        if (err) { callback(err); return; }
        
        // Parse the data if there is a file.
        data = JSON.parse();
        callback(null, makeConnection());
      } catch (e) {
        callback(e);
      }
    });
  } else {
    defer(function () {
      try {
        data = {};
        callback(null, makeConnection());
      } catch (e) {
        callback(e);
      }
    });
  }
  
  function makeConnection() {
    return {
      getStore: function getStore(name, callback) {
        defer(function () {
          callback(null, {
            get: function get(query, options, callback) {},
            insert: function insert(data, callback) {},
            update: function update(data, query, options, callback) {},
            remove: function remove(query, options, callback) {}
          });
        });
      },
      close: defer
    }
  }
};