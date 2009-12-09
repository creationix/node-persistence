process.mixin(require('sys'));

function Sqlite(path) {
  var conn = process.createChildProcess("sqlite3", ['-batch', '-header', '-nullvalue', "\r", '-separator', "\t", path]);
  var queue = [];
  var callback, want_close = false;
  
  function cycle(data) {
    // debug(queue.length);
    var next;

    // When we get data, call the callback and clear everything.
    if (data) {
      callback(data);
      callback = null;
    }
    
    // If the queue is empty, we're done
    if (queue.length === 0) {
      if (want_close) {
        conn.close();
      }
      return;
    }
    
    // If no query is active, insert another
    if (!callback) {
      next = queue.shift();
      callback = next[1];
      conn.write(next[0]);
    }
  }
  
  conn.addListener("output", cycle);
  
  conn.addListener("error", function (data) {
    if (data) {
      puts('<span style="color:red">');
      puts("ERROR: " + inspect(data));
      puts('<span style="color:red">');
    }
  });
  
  this.query = function (sql, cb) {
    queue.push([sql + ";\n", function (string) {
      var raw, headers;
      // Parse the output into cells.  newline for row, tab for field, and
      // carriage return for null values.
      raw = string.split("\n").map(function (row) {
        return row.split("\t").map(function (item) {
          return item == "\r" ? null : item;
        })
      });
      
      // pop off the always trailing empty row
      raw.pop();
      
      // Strip off the first row, it's the column names
      headers = raw.shift();
      
      // Merge the rest into an array of json objects
      cb(raw.map(function (row) {
        var data = {};
        headers.map(function (name, index) {
          data[name] = row[index];
        });
        return data;
      }));
      
    }]);
    cycle();
  };
  
  this.command = function (command) {
    queue.push(["." + command + "\n", puts]);
    cycle();
  }
  
  this.close = function () {
    want_close = true;
    cycle();
  }
  
}

var db = new Sqlite('test.db');
// db.command('schema');
for (var i = 0; i < 100000; i++) {
  setTimeout(function () {
    db.query("SELECT * from reservations LIMIT 2", function () {});
  }, 0);
}

setTimeout(function () {
  db.close();
}, 10);



