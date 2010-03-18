var sys = require('sys');
var Step = require('step');
require('proto');

var DbDriver = require('persistence/plain');

Step(
  function connect() {
    sys.puts("connect");
    DbDriver.connect('mydb.json', this);
  },
  function getStore(db) {
    sys.puts("getStore");
    this.db = db;
    db.getStore("people", this);
  },
  function testStore(people) {
    people.get();
    people.update();
    people.insert();
    people.remove();
    sys.puts("testStore");
    sys.p(people);
    this.db.close(this);
  },
  function done() {
    sys.puts("done");
  }
);
