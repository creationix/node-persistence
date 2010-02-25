process.mixin(require("../common"));

var good_connected = false;

before("memory", function (db) {
  db.addListener('connection', function () {
    good_connected = true;
  });

});

process.addListener('exit', function () {
  assert.ok(good_connected, "good server failed to connect");
});
