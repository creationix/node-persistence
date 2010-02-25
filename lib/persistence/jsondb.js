var sys = require('sys');


function Store(conn, name) {
  this.conn = conn;
  this.name = name;
  throw "TODO: Implement Store()";
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

function Connection(path) {
  var conn = this;
  
  // Close the child process as soon as the queue is empty.  This allows node to finish.
  conn.close = function () {
    throw "TODO: Implement Connection.close()";
  };

}
Connection.prototype = new process.EventEmitter();
Connection.prototype.get_store = function (name) {
  return new Store(this, name);
};

exports.new_connection = function (connection_parameters) {
  return new Connection(connection_parameters);
}