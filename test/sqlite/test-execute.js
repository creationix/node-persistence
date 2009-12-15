process.mixin(require("../common"));

// Connect to a valid database
var db = persistence.connect('sqlite', testdb);

var finished1 = false;
var finished2 = false;
var finished3 = false;
var finished4 = false;

db.execute("CREATE TABLE foo(name text)").addCallback(function () {
  finished1 = true;
  db.execute("INSERT INTO foo(name) VALUES ('Hello')").addCallback(function () {
    finished2 = true;
    db.query("SELECT * FROM foo").addCallback(function (data) {
      finished3 = true;
      assert.equal(data[0].name, 'Hello');
    });
  });
});

db.execute("THIS IS INVALID SQL");
db.addListener('error', function (reason) {
  finished4 = true;
});

db.close();

process.addListener('exit', function () {
  assert.ok(finished1, "CREATE failed");
  assert.ok(finished2, "INSERT failed");
  assert.ok(finished3, "SELECT failed");
  assert.ok(finished4, "ERROR failed");
});
