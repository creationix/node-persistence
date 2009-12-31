var memory = require('./persistence/memory');

// Driver is the result of the new_connection method on a particular driver
function Backend(driver) {
  this.driver = driver;
}
Backend.prototype = {
  
  // Define takes an optional table name, and a structure
  define: function () {
    
    var args = Array.prototype.slice.call(arguments, 0),
        name, columns, store, Resource;
    if (args[0] instanceof String) {
      name = args.shift();
    }
    columns = args.shift();
    if (name) {
      store = this.driver.get_store(name, columns);
    } else {
      store = memory.get_store(columns);
    }
    Resource = function (data) { };
    Resource.prototype = {
      save: function () { }
    };
    return Resource;
  }
  
};

exports.Backend = Backend;