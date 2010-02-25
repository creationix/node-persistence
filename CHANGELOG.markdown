# Persistence Changelog

 - **0.0.4** - *2010-02-25* - Remove promises to enable code to run on node V0.1.30. Also removed everything except the drivers and test suite.  The memory driver is now persistable for simple systems that want to scale later.

 - **0.0.3** - *2009-12-31* - Bug fixes, Memory Driver and start of Data Abstraction.

   A new memory driver was added with full test suite.  This will be used by the high-level data abstraction for temporary items that aren't really tables.  Also some bugs in the postgres and sqlite drivers were fixed.

 - **0.0.2** - *2009-12-16* - Postgres driver added

  The test suite has been beefed up and made more robust.  The postgres code from my postgres-js project has been ported over and included as a persistence driver.  The common sql generation code between sqlite and postgres was extracted into a common sql library.

 - **0.0.1** - *2009-12-12* - Initial release

   This version has a working sqlite driver that wraps around the command-line `sqlite3` program.  It implements all of the spec with the exception of rich data types on query results.  There are comprehensive unit tests for the sqlite driver.

