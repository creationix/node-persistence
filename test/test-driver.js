process.mixin(require("./common"));

var sqlite = require('./drivers/sqlite2');
var sys = require('sys');
var assert = require('assert');


// Connect to a database
var db = sqlite.new_connection('test2.db');
db.addListener('connection', function () {
  sys.debug("Connection established");
}).addListener('error', function (reason) {
  sys.debug(reason);
});

// Non-query example
db.execute("CREATE TABLE users(name text, age int)").addCallback(function () {
  sys.debug("Table created");
});

var store = db.get_store('users');

var data = {name: "Test", age: 100};
sys.debug("Starting save: " + sys.inspect(data));
store.save(data).addCallback(function (insert_id) {
  sys.debug("Save result: " + sys.inspect(insert_id));
  sys.debug("data after insert: " + sys.inspect(data));
  data.name = "Test Changed";
  sys.debug("Saving with new value: " + sys.inspect(data));
  store.save(data).addCallback(function () {
    sys.debug("data after update: " + sys.inspect(data));
    sys.debug("Removing from database: " + sys.inspect(data));
    store.remove(data).addCallback(function () {
      sys.debug("data after remove: " + sys.inspect(data));
    });
  });
});
  
for (var i = 0; i < 10; i++) {
  store.save({name: "User" + i, age: i});
}

// Buffered query
sys.debug("Starting buffered query");
db.query("SELECT * FROM users").addCallback(function (data) {
  sys.debug("buffered Done: " + sys.inspect(data));
});

// Streaming query
sys.debug("Starting streaming query");
db.query("SELECT * FROM users", function (row) {
  sys.debug("streaming Row: " + sys.inspect(row));
}).addCallback(function () {
  sys.debug("streaming Done");
});

// Query with positioned parameters
db.query("SELECT * FROM users WHERE age > ? AND age <= ?", 18, 50).addCallback(sys.p);

// Query with named parameters
db.query("SELECT * FROM users WHERE age > :min AND age <= :max", {min: 18, max: 50}).addCallback(sys.p);

db.close();
