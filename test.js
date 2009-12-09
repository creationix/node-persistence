process.mixin(require('sys'));
var Persistance = require('./persistance');

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
