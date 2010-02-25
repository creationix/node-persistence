process.mixin(require("../common"));
var finished1 = false;
var finished2 = false;
var finished3 = false;
var finished4 = false;

before("sqlite", function (db) {

  db.execute("CREATE TABLE foo(name text)", function () {
    finished1 = true;
    db.execute("INSERT INTO foo(name) VALUES ('Hello')", function () {
      finished2 = true;
      db.query("SELECT * FROM foo", function (data) {
        finished3 = true;
        assert.equal(data[0].name, 'Hello');
      });
    });
  });

  db.execute("THIS IS INVALID SQL");
  db.addListener('error', function (reason) {
    finished4 = true;
  });

});

process.addListener('exit', function () {
  assert.ok(finished1, "CREATE failed");
  assert.ok(finished2, "INSERT failed");
  assert.ok(finished3, "SELECT failed");
  assert.ok(finished4, "ERROR failed");
});
