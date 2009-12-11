var sqlite = require('./drivers/sqlite');
var sys = require('sys');

// Connect to a database
var db = sqlite.new_connection('test.db');
db.addCallback(function () {
  sys.debug("Connection established");
}).addErrback(function (reason) {
  sys.debug("Database error: " + reason);
});

// Non-query example
db.execute("CREATE TABLE users(id serial, name text, age int)").addCallback(function () {
  sys.debug("Table created");
});
  
// for (var i = 0; i < 100; i++) {
//   db.save('users', {name: "User" + i, age: i});
// }

// Buffered query
db.query("SELECT * FROM users").addCallback(function (data) {
  sys.p(data);
});

// Streaming query
db.query("SELECT * FROM users", function (row) {
  sys.p(row)
}).addCallback(function () {
  sys.debug("Done");
});

// Query with positioned parameters
db.query("SELECT * FROM users WHERE age > ? AND age <= ?", 18, 50).addCallback(sys.p);

// Query with named parameters
db.query("SELECT * FROM users WHERE age > :min AND age <= :max", {min: 18, max: 50}).addCallback(sys.p);

db.close();
