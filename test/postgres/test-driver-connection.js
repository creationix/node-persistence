process.mixin(require("../common"));

var good_connected = false,
    bad_failed = false,
    db2;

before("postgres", function (db) {

  db.addListener('connection', function () {
    good_connected = true;
  });

});

// Connect to an invalid database
db2 = connect('postgres', {invalid: "Stuff"});
db2.addListener('error', function (reason) {
  bad_failed = true;
});
db2.close();

process.addListener('exit', function () {
  assert.ok(good_connected, "good server failed to connect");
  assert.ok(bad_failed, "bad server failed to fail");
});
