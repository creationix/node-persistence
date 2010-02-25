process.mixin(require("../common"));

before("sqlite", function (db) {

  // Check that the db connection has the required methods
  ["query", "execute", "get_store", "close"].forEach(function (method_name) {
    assert.equal(
      typeof db[method_name],
      'function',
      inspect(method_name) + " is a required method in the Connection interface"
    );
  });

  var stuff = db.get_store('stuff');

  // Check that the store has the required methods
  ["get", "find", "each", "all", "save", "remove", "nuke"].forEach(function (method_name) {
    assert.equal(
      typeof stuff[method_name],
      'function',
      inspect(method_name) + " is a required method in the Store interface"
    );
  });

});