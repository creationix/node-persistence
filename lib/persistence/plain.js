var fs = require('fs');
var defer = process.nextTick;
var sys = require('sys');


exports.connect = function connect(filename, callback) {
  // filename is optional
  if (typeof filename === 'function' && typeof callback === 'undefined') {
    callback = filename;
    filename = undefined;
  }
  
  var data = {}, dirty = false;
  
  if (filename) {
    // Load from disk if a filename was specified.
    fs.readFile(filename, function (err, json) { try {
      // If the file doesn't exist, then move on.
      if (err && err.errno === 2) {
        callback(null, makeConnection());
        return;
      }
      // If there is another error, then pass it on.
      if (err) { callback(err); return; }
      
      // Parse the data if there is a file.
      data = JSON.parse();
      callback(null, makeConnection());
    } catch (e) {callback(e)} });
  } else {
    defer(function () { try {
      callback(null, makeConnection());
    } catch (e) {callback(e);} });
  }
  
  function getStore(name, callback) {
    function get(query, options, callback) {}
    function insert(data, callback) {}
    function update(data, query, options, callback) {}
    function remove(query, options, callback) {}

    defer(function () {
      callback(null, {
        get: get,
        insert: insert,
        update: update,
        remove: remove
      });
    });
  }
  
  function makeConnection() {
    return { getStore: getStore, close: defer };
  }
};