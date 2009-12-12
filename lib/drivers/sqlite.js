var sys = require('sys');

exports.new_connection = function (path) {

  var child = process.createChildProcess("sqlite3", ['-interactive', '-header', '-nullvalue', "\r", '-separator', "\t", path]),
      queue = [], // Queue of sql requests
      dequeued = 0, // Pointer used by the delayed shift mechanism
      callback = null, // Callback for the query in progress
      started, terminated, // Flags set when connection is verified and when close is called.
      conn = new process.EventEmitter(); // The connection object that's returned.

  // Enable the timer footer so that we can detect zero length results
  child.write(".timer on\n");
  // A inner state-machine that does all the queue logic.  This needs to 
  // be called any time an event happens that may change the flow.
  function cycle(string) {
    var next;

    if (string !== undefined) {
      // sys.debug("output: " + sys.inspect(string));
      if (!started && string.match(/^SQLite version \d+\.\d+\.\d+/)) {
        conn.emit('connection');
        started = true;
        string = undefined;
      }
    }
    
    // When we get data, call the callback and clear everything.
    if (string) {
      // Clean out the timer line
      string = string.replace(/CPU Time: user \d+\.\d+ sys \d+\.\d+\n/, "");
      
      callback(string);
      callback = null;
    }

    // If the queue is empty, we're done
    if (queue.length === 0) {
      // Close the child process if desired.
      if (terminated) {
        child.close();
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
      child.write(next[0]);
    }
  }

  // If sqlite3 isn't in the path or the arguments are bad, this will trigger.
  child.addListener("error", function (data) {
    // sys.debug("error: " + sys.inspect(data));
    // Ignore the null that sometimes gets emitted on close
    if (data) {
      conn.emit('error', data);
    }
  });

  child.addListener("output", cycle);

  return conn;
};

