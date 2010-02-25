# Persistence

Persistence is a project to allow a high level API for persisting data between process runs.  The goal is to support backends that are easy to use, powerful, flexible, or all of the above if possible.

## Drivers

Persistence has low level "drivers" that interact with the individual persistence technologies.

The four backend drivers that we plan on supporting initially are:

 - **PostgreSQL** - An enterprise level relational database.  The driver is implemented in pure JavaScript and communicates over TCP using the PostgreSQL wire protocol.
 - **Sqlite3** - A simple, fast, server-less relational database.  This driver is a wrapper around the command-line `sqlite3` program.  It requires `sqlite3` to be in the path.  The communication is extremely fast, but types aren't very precise.  There are only strings and nulls returned.
 - **Memory** - A simple in-memory javascript array object.  You can optionally have it persist to a JSON file on the filesystem.  This will periodically write to the disk after changes and on shutdown.  This is very fast and simple for small scale stuff.  No dependencies at all.
 
Each backend follows the same interface.  This means that new backends can be developed by independent parties and used.

See <http://github.com/creationix/node-persistence/blob/master/test_driver.js> for sample code.

### Driver API

All drivers must adhere to this api so that layers build on top it will work as expected.

#### Methods for `exports` object. (This is object returned by `require`.)

 - `new_connection(*connection_parameters)` - Returns a new `Connection` object. The connection parameters are driver specific.

   `<connection>` - Callback fired when a connection is successfully made.  Queries can safely be made before this point, but they won't se sent to the database engine yet for obvious reasons.

   `<error>(reason)` - Callback fired when something goes wrong in either the connection or any of the sub-methods.
   
#### Methods for `Connection` objects

*NOTE* - `query` and `execute` are only required for drivers to a SQL based relational database.

 - `query(sql [, *params [, row_callback]], callback)` - Method that queries the database using raw sql.  If placeholders are used in the sql, they are filled in with the data from params.  If you wish to stream the results, pass in a callback function as the last argument.  Note that this may not give correct data types for some backends (sqlite for now)

   `callback(data)` - Callback fired when the query has returned.  Contains an array of JSON objects if a row_callback wasn't passed in to the query method.

 - `execute(sql, [*params], callback)` - Execute arbitrary sql against the database.

   `callback()` - Callback fired if successful.

 - `close()` - Close the connection to the database once the queue is empty.
 
 - `get_store(name[, columns])` - Returns a new `Store` object that's named `name` in the database.  Optionally specify the columns and types for this store.  Required for relational tables that don't exist yet.  This method will create the table/store if it doesn't exist yet.

#### Methods for `Store` objects

 - `get(id, callback)` - Get a record by id.

   `callback(row)` - Returns the data row.

 - `find(condition[, row_callback], callback)` - Finds records in table filtered by `condition`.  Condition can either be a function that returns true or false for each row or a `condition` expression (See `condition` expressions below) for logic in the database engine.  If row callback is passed in the results will stream.

   `callback(data)` - Callback fired when the stream is done. if there was no row_callback we now pass the entire result set.

 - `each(row_callback, callback)` - Go through each row calling row callback.

   `callback()` - Callback fired when the stream is done.

 - `all(callback)` - Load all data for a single table.

   `callback(data)` - Callback fired when the data is ready.

 - `save(data, callback)` - Saves a row to the database.  If the id is undefined, then it's an insert, otherwise it's an update.

   `callback([insert_id])` - Callback fired when done.  If an insert was performed, the insert_id is returned.  Also the passed in data object from the save command has it's `_id` set automatically.

 - `remove(id/data, callback)` - Removes a record by id from the database.  Removes the `_id` if a data object is passed in.

   `callback()` - Callback fired if successful.

 - `nuke(callback)` - Remove all entries in a table.

   `callback()` - Callback fired if successful.

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

## License

node-persistence is [licensed][] under the [MIT license][].

[MIT license]: http://creativecommons.org/licenses/MIT/
