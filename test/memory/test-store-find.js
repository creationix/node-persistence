process.mixin(require("../common"));
var finished1 = false;
var finished_array = {};
var queries = [
  [{age: 50}, 1],
  [{"age =": 50}, 1],
  [{"age <": 50}, 50],
  [{"age <=": 50}, 51],
  [{"age >=": 50}, 50],
  [{"age >": 50}, 49],
  [{"age !=": 50}, 99],
  [{"age <>": 50}, 99],
  [{age: 50, name: "User 50"}, 1],
  [{age: 50, name: "User 51"}, 0],
  [[{age: 50}, {name: "User 51"}], 2],
  [[{age: 50}, {name: "User 50"}], 1],
  [{"age <": 50, "age >=": 40}, 10],
  [{"name <": "User 50", "name >": "User 40"}, 10],
  [{"name ~": "User.*"}, 100],
  [{"name ~": ".*50"}, 1],
  [[{age: 50}, {"name >": "User 50", "age <": 60}], 14],
  [undefined, 100],
  [[], 100]
];

before("memory", function (db) {

  db.addListener('error', debug);

  var store = db.get_store("foo", {
    name: String,
    age: Number
  });
  
  var done = 0;
  for (var i = 0; i < 100; i++) {
    store.save({name: "User " + i, age: i}, function () {
      done++;
      if (done === 100) {
        check_size();
      }
    });
  }

  function check_size() {
    store.all(function (data) {
      assert.equal(data.length, 100);
      finished1 = true;
      run_queries();
    });
  }

  function run_queries() {
    queries.forEach(function (pair, i) {
      store.find(pair[0], function (data) {
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
  }

});

process.addListener('exit', function () {
  assert.ok(finished1, "ALL failed");
  queries.forEach(function (pair, i) {
    assert.ok(finished_array[i], JSON.stringify(pair[0]) + " failed to fire");
  });
});
