process.mixin(require("./common"));

// Connect to a valid database
var db = persistence.connect('sqlite', testdb);

var finished1 = false;
var finished2 = false;
var finished3 = false;

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

db.close();

process.addListener('exit', function () {
  assert.ok(finished1);
  assert.ok(finished2);
  assert.ok(finished3);
});
