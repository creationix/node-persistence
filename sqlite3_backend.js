var sys = require('sys');

function Sqlite(path) {
  var conn = process.createChildProcess("sqlite3", ['-batch', '-header', '-nullvalue', "\r", '-separator', "\t", "test.db"]),
      queue = [], dequeued = 0,
      callback, want_close = false;
  
  // Parse a result string from sqlite into an array of json objects
  function parse(string) {
    var headers, p;

    // Get the location of the first newline.
    p = string.indexOf("\n");
    
    // SQL errors return a single line ending in newline.
    if (p == string.length - 1) {
      sys.debug(string.substr(0, p));
      throw(string); // SQL Error
    }
    
    // Find and extract the header row.
    // It's \t seperated fields ending with a \n.
    headers = string.substr(0, p).split("\t");
    
    // Chop off the header from the string and the trailing newline.
    // Then split into rows seperated by "\n".
    // Then for each row, zip the fields seperated by "\t" with the headers as
    // keys, converting values of "\r" to null.
    return string.substr(p + 1, string.length - p - 2)
      .split("\n").map(function (row) {
        var data = {};
        row.split("\t").forEach(function (item, index) {
          data[headers[index]] = item === "\r" ? null : item;
        });
        return data;
      });
  }
  
  // A inner state-machine that does all the queue logic.  This needs to 
  // be called any time an event happens that may change the flow.
  function cycle(string) {
    // debug(queue.length);
    var next;

    // When we get data, call the callback and clear everything.
    if (string) {
      callback(string);
      callback = null;
    }
    
    // If the queue is empty, we're done
    if (queue.length === 0) {
      // Close the child process if desired.
      if (want_close) {
        conn.close();
      }
      return;
    }
    
    // If no query is active, insert another
    if (!callback) {

      // Use a delayed shift queue instead of shifting every time.
      next = queue[dequeued];
      dequeued += 1;
      if (dequeued * 2 > queue.length) {
        queue = queue.slice(dequeued);
        dequeued = 0;
      }
      
      callback = next[1];
      conn.write(next[0]);
    }
  }
  
  conn.addListener("output", cycle);

  // If sqlite3 isn't in the path or the arguments are bad, this will trigger.
  conn.addListener("error", function (data) {
    // Ignore the null that sometimes gets emitted on close
    if (data) {
      sys.debug(data);
      throw(data); // Connection Error
    }
  });
  
  this.query = function (sql, cb) {
    queue.push([sql + ";\n", function (string) {
      cb(parse(string));
    }]);
    cycle();
  };
  
  this.close = function () {
    want_close = true;
    cycle();
  };
  
}


var db = new Sqlite('test.db');
// db.command('schema');
db.query("SELECT * \n\tfrom reservations", sys.debug);

db.close();



// Common setup
connection = new DataObjects.Connection("sqlite3://test.db");
insert_command = connection.create_command("INSERT INTO users (login) VALUES (?)");
select_command = connection.create_command("SELECT * FROM users " +
  "WHERE username = :username AND password_hash = :password_hash");
data = {username: "admin", password_hash: "7992465911aa73783c3a5fd427637306"}

// Callback style
// Pros: Super simple, easy to implement, and easy on the machine.
// Cons: perhaps too simple, can't even emit error events has to resort to exceptions.
insert_command.execute_non_query('dbussink', sys.p);
select_command.execute_reader(data, sys.p);

// Promise style
// Pros: Still simple, can handle errors
// Cons: Adds some complication that might not be needed.
insert_command.execute_non_query('dbussink').addCallback(sys.p).addErrback(sys.debug);
select_command.execute_reader(data, sys.p).addCallback(sys.p).addErrback(sys.debug);

// EventEmitter style
// Pros: events can be tied to the command object itself.
// Cons: a little more complicated.
insert_command.execute_non_query('dbussink')
insert_command.addListener('done', sys.p);
insert_command.addListener('error', sys.debug);
select_command.execute_reader(data, sys.p)
insert_command.addListener('done', sys.p);
insert_command.addListener('error', sys.debug);

