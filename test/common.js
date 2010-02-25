// Add our package to the front of the library path
require.paths.unshift(__dirname + "/../lib");

var backends = {
  postgres: require('persistence/postgres'),
  sqlite: require('persistence/sqlite'),
  memory: require('persistence/memory')
};

function connect(driver/*, *args */) {
  var path,
      args = Array.prototype.slice.call(arguments, 1);
  return backends[driver].new_connection.apply(this, args);
}

exports.connect = connect;


// puts and family are nice to have
process.mixin(exports, require("sys"));

// preload the assert library.
exports.assert = require('assert');


exports.configs = {
  sqlite: "/tmp/test.db",
  postgres: {
    host: "localhost",
    database: "test",
    username: "test",
    password: "password"
  },
  memory: "/tmp/test.json"
};

// Alias process.nextTick
var defer = exports.defer = process.nextTick;

var before_execs = {
  postgres: "/usr/local/bin/dropdb " + exports.configs.postgres.database + "; /usr/local/bin/createdb -O " + exports.configs.postgres.username + " " + exports.configs.postgres.database,
  sqlite: "rm -f " + exports.configs.sqlite,
  memory: "rm -f " + exports.configs.memory
}

// Call these before each test to clean the slate
exports.before = function (type, callback) {
  var done = function () {
    db = connect(type, configs[type]);
    callback(db);
    defer(function () {
      db.close();
    });
  }
  if (before_execs[type]) {
    exports.exec(before_execs[type], function (err) {
      if (err) {
        debug(err);
      }
      // Wait to lessen chance of race condition happening
      // TODO: real async trigger
      setTimeout(done, 200);
    });
  } else {
    defer(function () {
      done();
    });
  }
};
