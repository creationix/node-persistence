var sys = require('sys');

function Store(conn, columns) {
  this.conn = conn;
  this.columns = columns;
  this.data = [];
}
Store.prototype = {
  get: function () {
    throw "TODO: Implement Store.get()";
  },
  find: function () {
    throw "TODO: Implement Store.find()";
  },
  each: function () {
    throw "TODO: Implement Store.each()";
  },
  all: function () {
    throw "TODO: Implement Store.all()";
  },
  save: function () {
    throw "TODO: Implement Store.save()";
  },
  remove: function () {
    throw "TODO: Implement Store.remove()";
  },
  nuke: function () {
    throw "TODO: Implement Store.nuke()";
  }
};

exports.get_store = function (columns) {
  return new Store(this, columns);
};
