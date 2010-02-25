process.mixin(require("../common"));
var finished1 = false;
var finished2 = false;
var finished3 = false;
var finished4 = false;

before("postgres", function (db) {

  db.query("SELECT null AS test1, 2 AS test2, 'hello' AS test3, false AS test4, true AS test5", function (data) {
    assert.equal(data[0].test1, null);
    assert.equal(data[0].test2, 2);
    assert.equal(data[0].test3, 'hello');
    assert.equal(data[0].test4, false);
    assert.equal(data[0].test5, true);
    finished1 = true;
  })

  db.query("SELECT null AS test1, 2 AS test2, 'hello' AS test3, false AS test4, true AS test5", function (row) {
    assert.equal(row.test1, null);
    assert.equal(row.test2, 2);
    assert.equal(row.test3, 'hello');
    assert.equal(row.test4, false);
    assert.equal(row.test5, true);
    finished2 = true;
  }, function () {
    assert.equal(arguments.length, 0, "Streaming queries shouldn't return buffered results");
    finished3 = true;
  });

  db.query("THIS IS INVALID SQL");
  db.addListener('error', function (reason) {
    finished4 = true;
  });

});

process.addListener('exit', function () {
  assert.ok(finished1, "query failed");
  assert.ok(finished2, "stream row failed");
  assert.ok(finished3, "stream stop failed");
  assert.ok(finished4, "ERROR failed");
});
