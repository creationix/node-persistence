# Persistence

Persistence is a project to allow a high level API for persisting data between process runs.  The goal is to support backends that are easy to use, powerful, flexible, or all of the above if possible.

## Drivers

Persistence has low level "drivers" that interact with the individual persistence technologies.

The four backend drivers that we plan on supporting initially are:

 - **PostgreSQL** - An enterprise level relational database.  The driver is implemented in pure JavaScript and communicates over TCP using the PostgreSQL wire protocol.
 - **Sqlite3** - A simple, fast, server-less relational database.  This driver is a wrapper around the command-line `sqlite3` program.  It requires `sqlite3` to be in the path.  The communication is extremely fast, but types aren't very precise.  There are only strings and nulls returned.
 - **MongoDB** - A scalable, high-performance, open source, schema-free, document-oriented database.  This driver also implements the wire protocol in JavaScript and communicated with the server over TCP.
 - **JSON-DB** - A homegrown system schema-free, document-oriented database that uses simple flat files containing JSON objects.  This has no requirements at all except node and a filesystem.  Performance is to be determined once it's implemented fully.
 
So far Sqlite3 driver is done, but returns all columns as text.  The PostgreSQL is partially done.  The other two are still in the research/implementation stage.

Each backend follows the same interface.  This means that new backends can be developed by independent parties and used.

### Driver API

All methods return promise objects.  The meaning and parameters of the success events are specified.

The error event on the connection object gets all errors from sub-events routed to it automatically.  For example, if you attach an errback to the `new Connection` object, then any errors emmited by query, save, execute, or delete will be routed to it.

  - `new_connection(*connection_parameters)` - Returns a connection object. The connection parameters are driver specific.
    - `<connection>` - Event fired when a connection is successfully made.  Queries can safely be made before this point, but they won't se sent to the database engine yet for obvious reasons.
    - `<error>(reason)` - Event fired when something goes wrong in either the connection or any of the sub-methods.
    - `query(sql [, *params [, row_callback]])` - Method that queries the database.  If placeholders are used in the sql, they are filled in with the data from params.  If you wish to stream the results, pass in a callback function as the last argument
      - `<success>(data)` - Event fired when the query has returned.  Contains an array of JSON objects if a row_callback wasn't passed in to the query method.
    - `execute(sql, [*params])` - Execute arbitrary sql against the database.
      - `<success>` - Event fired if successful.
    - `save(table, data)` - Saves a row to the database.  If the id is undefined, then it's an insert, otherwise it's an update.
      - `<success>([insert_id])` - Event fired when done.  If an insert was performed, the insert_id is returned.  Also the passed in data object from the save command has it's `_id` set automatically.
    - `remove(table, id/data)` - Removes a record by id from the database.  Removes the `_id` if a data object is passed in.
      - `<success>` - Event fired if successful.
    - `close()` - Close the connection to the database once the queue is empty.


Sample Usage:

    var sqlite = require('./drivers/sqlite');
    var sys = require('sys');

    // Connect to a database
    var db = sqlite.new_connection('test.db');
    db.addListener('connection', function () {
      sys.debug("Connection established");
    }).addListener('error', function (reason) {
      sys.debug("Database error: " + reason);
    });

    // Non-query example
    db.execute("CREATE TABLE users(name text, age int)").addCallback(function () {
      sys.debug("Table created");
    });

    var data = {name: "Test", age: 100};
    sys.debug("Starting save: " + sys.inspect(data));
    db.save('users', data).addCallback(function (insert_id) {
      sys.debug("Save result: " + sys.inspect(insert_id));
      sys.debug("data after insert: " + sys.inspect(data));
      data.name = "Test Changed";
      sys.debug("Saving with new value: " + sys.inspect(data));
      db.save('users', data).addCallback(function () {
        sys.debug("data after update: " + sys.inspect(data));
        sys.debug("Removing from database: " + sys.inspect(data));
        db.remove('users', data).addCallback(function () {
          sys.debug("data after remove: " + sys.inspect(data));
        });
      });
    });
  
    for (var i = 0; i < 10; i++) {
      db.save('users', {name: "User" + i, age: i});
    }

    // Buffered query
    sys.debug("Starting buffered query");
    db.query("SELECT * FROM users").addCallback(function (data) {
      sys.debug("buffered Done: " + sys.inspect(data));
    });

    // Streaming query
    sys.debug("Starting streaming query");
    db.query("SELECT * FROM users", function (row) {
      sys.debug("streaming Row: " + sys.inspect(row));
    }).addCallback(function () {
      sys.debug("streaming Done");
    });

    // Query with positioned parameters
    db.query("SELECT * FROM users WHERE age > ? AND age <= ?", 18, 50).addCallback(sys.p);

    // Query with named parameters
    db.query("SELECT * FROM users WHERE age > :min AND age <= :max", {min: 18, max: 50}).addCallback(sys.p);

    db.close();
    

*Note* that even though the database commands are asynchronous, the queries themselves are buffered internally in the Sqlite3 driver so we can treat the db commands as if they were synchronous..  This is probably bad practice since the PostgreSQL driver doesn't have this constraint.

## Object Mapper

This is an API layer in spirit to ActiveRecord or DataMapper, but not as closely tied to relational databases and of course designed for Node.

The following is some initial ideas about the syntax and api, it's subject to change:

    var db;
    // Can use a mongodb server as the backend
    db = new Persistance.Backend('mongodb://localhost/blog');
    // Can use a postgres server as the backend
    db = new Persistance.Backend('postgresql://user:pass@localhost:5432/blog');

    // Can use a sqlite database file
    db = new Persistance.Backend('sqlite://blog.db');
    // Can store data in folder with flat json files
    db = new Persistance.Backend('jsondb://blog_data');

    // Notice that comments don't have a table name.  They don't have standalone
    // entries in the database.
    var Comment = db.define({
      "posted_by": String,
      "created_at": Date,
      "email": String,
      "url": String,
      "body": String
    });

    // Post has a collection/table called "posts" and it embeds the Comment objects.
    var Post = db.define('posts', {
      "title": String,
      "body": String,
      "created_at": Date,
      // comments are an embedded array within the posts
      "comments": [Comment],
      // tags are a simple inline array
      "tags": [String]
    });

    // In a relational database this normally requires 4 tables, but in document
    // systems like mongodb, this only needs 1 collection.

    // Create a new in-memory object
    var welcome = new Post({
      title: "Welcome to my node based blog",
      body: "This is a really cool system, you should use it",
      created_at: new Date(),
      tags: ["node", "mongo", "persistance"]
    });

    // Save the data to the database (Creating collections/tables as needed)
    welcome.save();

    // Lets create a Comment object and add it to the post.
    welcome.comments.push(new Comment({
      posted_by: "Tim Caswell",
      created_at: new Date(),
      email: "tim@creationix.com",
      url: "http://creationix.com/",
      body: "What a cool blog idea!",
    }));

    // This will update the entry for the welcome post.
    welcome.save();
