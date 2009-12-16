process.mixin(require("../common"));

// Connect to a valid database
db = persistence.connect('postgres', configs.postgres);

var finished1 = false;
var finished2 = false;
var finished3 = false;
var finished4 = false;

db.query("SELECT null AS test1, 2 AS test2, 'hello' AS test3").addCallback(function (data) {
  assert.equal(data[0].test1, null);
  assert.equal(data[0].test2, '2');
  assert.equal(data[0].test3, 'hello');
  finished1 = true;
})

db.query("SELECT null AS test1, 2 AS test2, 'hello' AS test3", function (row) {
  assert.equal(row.test1, null);
  assert.equal(row.test2, '2');
  assert.equal(row.test3, 'hello');
  finished2 = true;
}).addCallback(function () {
  finished3 = true;
});

db.query("THIS IS INVALID SQL");
db.addListener('error', function (reason) {
  finished4 = true;
});

db.close();

process.addListener('exit', function () {
  assert.ok(finished1, "query failed");
  assert.ok(finished2, "stream row failed");
  assert.ok(finished3, "stream stop failed");
  assert.ok(finished4, "ERROR failed");
});
