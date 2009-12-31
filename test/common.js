// Set up some useful paths
var path = require("path");
var testDir = path.dirname(__filename);
var libDir = path.join(testDir, "../lib");


// Add our package to the front of the library path
require.paths.unshift(libDir);

var backends = {
  postgres: require('persistence/postgres'),
  sqlite: require('persistence/sqlite'),
  jsondb: require('persistence/jsondb'),
  memory: require('persistence/memory')
};

function connect(driver/*, *args */) {
  var path,
      args = Array.prototype.slice.call(arguments, 1);
  switch (driver.toLowerCase()) {
  case 'sqlite':
  case 'sqlite3':
    path = 'sqlite';
    break;
  case 'postgres':
  case 'postgresql':
    path = 'postgres';
    break;
  case 'mongo':
  case 'mongodb':
    path = 'mongo';
    break;
  case 'json':
  case 'jsondb':
    path = 'jsondb';
    break;
  case 'memory':
    path = 'memory';
    break;
  default:
    throw "Unknown driver: " + driver;
  }
  return backends[path].new_connection.apply(this, args);
}

exports.connect = connect;


// puts and family are nice to have
process.mixin(exports, require("sys"));

// preload the assert library.
exports.assert = require('assert');

// preload the persistence library.
exports.persistence = require('persistence');

exports.configs = {
  sqlite: "/tmp/test.db",
  postgres: {
    host: "localhost",
    database: "test",
    username: "test",
    password: "password"
  }
};

var before_execs = {
  postgres: "/usr/local/bin/dropdb " + exports.configs.postgres.database + "; /usr/local/bin/createdb -O " + exports.configs.postgres.username + " " + exports.configs.postgres.database,
  sqlite: "rm -f " + exports.configs.sqlite
}

// Call these before each test to clean the slate
exports.before = function (type) {
  var promise = new process.Promise();
  var done = function () {
    db = connect(type, configs[type]);
    promise.emitSuccess(db);
    setTimeout(function () {
      db.close();
    });
  }
  if (before_execs[type]) {
    exports.exec(before_execs[type]).addCallback(done).addErrback(function () {
      debug(arguments[2]);
      done();
    });
  } else {
    setTimeout(function () {
      done();
    });
  }
  return promise;
};
  
