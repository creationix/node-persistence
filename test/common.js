// Set up some useful paths
var path = require("path");
var testDir = path.dirname(__filename);
var libDir = path.join(testDir, "../lib");

// Add our package to the front of the library path
require.paths.unshift(libDir);

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

// Make sure the database is deleted before running each test.
var posix = require('posix');
posix.stat(exports.configs.sqlite).addCallback(function () {
  posix.unlink(exports.configs.sqlite);
});
