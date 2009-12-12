process.mixin(require("./common"));

// Connect to a valid database
var db = persistence.connect('sqlite', testdb);
db.addListener('error', debug);

var finished1 = false;
var finished_array = {};

var store = db.get_store("foo", {
  name: String,
  age: Number
});
 
for (var i = 0; i < 100; i++) {
  store.save({name: "USER " + i, age: i});
  store.save({name: "User " + i, age: i});
}

store.all().addCallback(function (data) {
  assert.equal(data.length, 200);
  finished1 = true;
});

var queries = [
  [{age: 50}, 2],
  [{"age =": 50}, 2],
  [{"age <": 50}, 100],
  [{"age <=": 50}, 102],
  [{"age >=": 50}, 100],
  [{"age >": 50}, 98],
  [{"age !=": 50}, 198],
  [{"age <>": 50}, 198],
  [{age: 50, name: "USER 50"}, 1],
  [{age: 50, name: "USER 51"}, 0],
  [[{age: 50}, {name: "USER 51"}], 3],
  [[{age: 50}, {name: "USER 50"}], 2],
  [{"age <": 50, "age >=": 40}, 20],
  [{"name <": "USER 50", "name >": "USER 40"}, 10],
  [{"name %": "User%"}, 200],
  [{"name %": "%50"}, 2],
  [[{age: 50}, {"name >": "USER 50", "age <": 60}], 74],
  [undefined, 200],
  [[], 200]
];

queries.forEach(function (pair, i) {
  store.find(pair[0]).addCallback(function (data) {
    if (i === 0) {
      assert.equal(data[0].age, 50);
    }
    assert.equal(
      data.length, pair[1],
      JSON.stringify(pair[0]) +
        ": expected " + pair[1] + " rows, but found " + data.length
    );
    finished_array[i] = true;
  });
});


db.close();

process.addListener('exit', function () {
  assert.ok(finished1, "ALL failed");
  queries.forEach(function (pair, i) {
    assert.ok(finished_array[i], JSON.stringify(pair[0]) + " failed to fire");
  });
});
