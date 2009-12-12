// Set up some useful paths
var path = require("path");
var testDir = path.dirname(__filename);
var libDir = path.join(testDir, "../lib");

// Add our package to the front of the library path
require.paths.unshift(libDir);

// puts and family are nice to have
process.mixin(exports, require("sys"));

// store a path to the fixtures
exports.fixturesDir = path.join(testDir, "fixtures");

// preload the assert library.
exports.assert = require('assert');

// preload the persistence library.
exports.persistence = require('persistence');
