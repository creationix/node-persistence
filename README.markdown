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

See <http://github.com/creationix/node-persistence/blob/master/test_driver.js> for sample code.

### Driver API

All drivers must adhere to this api so that layers build on top it will work as expected.

#### Methods for `exports` object. (This is object returned by `require`.)

 - `new_connection(*connection_parameters)` - Returns a new `Connection` object. The connection parameters are driver specific.

   `<connection>` - Event fired when a connection is successfully made.  Queries can safely be made before this point, but they won't se sent to the database engine yet for obvious reasons.

   `<error>(reason)` - Event fired when something goes wrong in either the connection or any of the sub-methods.
   
#### Methods for `Connection` objects

*NOTE* - `query` and `execute` are only required for drivers to a SQL based relational database.

 - `query(sql [, *params [, row_callback]])` - Method that queries the database using raw sql.  If placeholders are used in the sql, they are filled in with the data from params.  If you wish to stream the results, pass in a callback function as the last argument.  Note that this may not give correct data types for some backends (sqlite for now)

   `<success>(data)` - Event fired when the query has returned.  Contains an array of JSON objects if a row_callback wasn't passed in to the query method.

 - `execute(sql, [*params])` - Execute arbitrary sql against the database.

   `<success>` - Event fired if successful.

 - `close()` - Close the connection to the database once the queue is empty.
 
 - `get_store(name[, columns])` - Returns a new `Store` object that's named `name` in the database.  Optionally specify the columns and types for this store.  Required for relational tables that don't exist yet.  This method will create the table/store if it doesn't exist yet.

#### Methods for `Store` objects

 - `get(id)` - Get a record by id.

   `<success>(row)` - Returns the data row.

 - `find(condition[, row_callback])` - Finds records in table filtered by `condition`.  Condition can either be a function that returns true or false for each row or a `condition` expression (See `condition` expressions below) for logic in the database engine.  If row callback is passed in the results will stream.

   `<success>(data)` - Event fired when the stream is done. if there was no row_callback we now pass the entire result set.

 - `each(row_callback)` - Go through each row calling row callback.

   `<success>` - Event fired when the stream is done.

 - `all()` - Load all data for a single table.

   `<success>(data)` - Event fired when the data is ready.

 - `save(data)` - Saves a row to the database.  If the id is undefined, then it's an insert, otherwise it's an update.

   `<success>([insert_id])` - Event fired when done.  If an insert was performed, the insert_id is returned.  Also the passed in data object from the save command has it's `_id` set automatically.

 - `remove(id/data)` - Removes a record by id from the database.  Removes the `_id` if a data object is passed in.

   `<success>` - Event fired if successful.

 - `nuke()` - Remove all entries in a table.

   `<success>` - Event fired if successful.

#### Structure of `condition` expressions.

A simple condition is pairs of key's and values.  This builds a condition where all columns named by the key must equal the corresponding value.

This matches rows where `name` is `"Tim"` and `age` is `27`:

    {name: "Tim", age: 27}

If a key contains space, then the operator after it is used instead of equal.

This matches rows where `age` is greater than `18` and `age` is less than `50`:

    {"age >": 18, "age <": 50}

The supported operators are:

 - `<` - less than
 - `<=` - less than or equal to
 - `>=` - greater than or equal to
 - `>` - greater than
 - `!=` or `<>` - not equal to
 - `%` - like - uses % like in SQL
 - `~` - match - takes a regular expression and matches against. (not supported in all backends)
  
If an array of hash-objects is passed in, then each array item is grouped and ORed together.

This matches `name` is `"Tim"` or `age` < `8`:

    [{name: "Tim"}, {"age <": 8}]

## Object Mapper

**THIS SECTION IS STILL UNDER HEAVY CONSTRUCTION**

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
