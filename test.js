var sys = require('sys');
var Step = require('step');
require('proto');

var DbDriver = require('persistence/plain');

Step(
  function connect() {
    sys.puts("connect");
    DbDriver.connect('mydb.json', this);
  },
  function getStore(err, db) {
    if (err) { throw err; }
    sys.puts("getStore", sys.inspect(db));
    this.db = db;
    db.getStore("people", this);
  },
  function testStore(err, people) {
    if (err) { throw err; }
    people.get();
    people.update();
    people.insert();
    people.remove();
    sys.puts("testStore");
    sys.p(people);
    this.db.close(this);
  },
  function done(err) {
    if (err) { throw err; }
    sys.puts("done");
  }
);
