# Persistence

Persistence is a project to allow a high level API for persisting data between process runs.  The goal is to support backends that are easy to use, powerful, flexible, or all of the above if possible.

## Drivers

Persistence has low level "drivers" that interact with the individual persistence technologies.

The four backend drivers that we plan on supporting initially are:

 - **PostgreSQL** - An enterprise level relational database.  The driver is implemented in pure JavaScript and communicates over TCP using the PostgreSQL wire protocol.
 - **Sqlite3** - A simple, fast, server-less relational database.  This driver is a wrapper around the command-line `sqlite3` program.  It requires `sqlite3` to be in the path.  The communication is extremely fast, but types aren't very precise.  There are only strings and nulls returned.
 - **MongoDB** - A scalable, high-performance, open source, schema-free, document-oriented database.  This driver also implements the wire protocol in JavaScript and communicated with the server over TCP.
 - **JSON-DB** - A homegrown system schema-free, document-oriented database that uses simple flat files containing JSON objects.  This has no requirements at all except node and a filesystem.  Performance is to be determined once it's implemented fully.
 
So far the PostgreSQL and Sqlite3 drivers are almost done.  The other two are still in the research/implementation stage.

Each backend follows the same interface.  This means that new backends can be developed by independent parties and used.

### Driver API

 - `Connection(*connection_parameters)` - Constructor for database handles. The connection parameters are driver specific.
   - `<connect>` - Event fired when a connection is successfully made.  Queries can safely be made before this point, but they won't se sent to the database engine yet for obvious reasons.
   - `<error>(reason)` - Event fired when there is a problem setting up the connection.  `reason` is a string describing what went wrong.
   - `query_stream(sql, [*params])` - Method that queries the database.  If placeholders are used in the sql, they are filled in with the data from params.
     - `<row>(json)` - Event fired once for every row/record in the result set.  Allows for streaming of large datasets.
     - `<complete>` - Event fired when there are no more rows expected.
       `<error>(reason)` - Event fired when the query is malformed or otherwise invalid.
   - `query(sql, [*params])` - Same as query stream, but with different events emitted.
     - `<complete>(data)` - Event fired when the query has returned.  Contains an array of JSON objects.
       `<error>(reason)` - Event fired when the query is malformed or otherwise invalid.
   - TODO: Define rest of api...   

Sample Usage:

    var sqlite = require('./drivers/sqlite');
    var db = sqlite.Connection('test.db');
    db.addListener('connect', function () {
      sys.debug("Connection established");
    });
    db.addListener('error', function (reason) {
      sys.debug("Connection error: " + reason);
    });
    db.query("SELECT * FROM users").addCallback('complete', function (data) {
      sys.p(data);
    });
    // TODO: Give more examples.

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
