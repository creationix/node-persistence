process.mixin(require("../common"));
var finished1 = false;
var finished2 = false;
var finished3 = false;
var finished4 = false;
var finished5 = false;
var finished6 = false;
var finished7 = false;
var finished8 = false;
var finished9 = false;
var finished10 = false;

before("memory", function (db) {

  // Connect to a valid database
  db.addListener('error', debug);

  var store = db.get_store("foo", {
    name: String,
    age: Number
  });


  var data = {name: "Tim", age: 27};
  var data3;
  // Save some data
  store.save(data, function (id) {
    assert.equal(id, 1);
    finished1 = true;

    // Load it back and check
    store.get(data._id, function (data2) {
      assert.deepEqual(data2, data);
      finished2 = true;

      // Change some data and save update.
      data.age = 28;
      store.save(data, function (id) {
        assert.equal(id, undefined);
        finished3 = true;

        // Load it back to make sure it really changed.
        store.get(data._id, function (data2) {
          assert.deepEqual(data2, data);
          finished4 = true;
        });

        // Create another row in parallel to the last get
        data3 = {name: "Bob", age: 105};
        store.save(data3, function (id) {
          assert.equal(data3._id, id);
          assert.equal(id, 2);
          finished5 = true;

          //
          store.remove(data3, function () {
            assert.equal(data3._id, undefined);
            finished8 = true;

            store.each(function (row) {
              assert.deepEqual(row, data);
              finished6 = true;
            }, function () {
              finished7 = true;
            });

            store.all(function (all) {
              assert.deepEqual(all[0], data);
              finished9 = true;

              store.nuke(function () {
                store.all(function (all) {
                  assert.equal(all.length, 0);
                  finished10 = true;
                });

              });
            });

          });

        });

      })

    });
  });

});


process.addListener('exit', function () {
  assert.ok(finished1, "SAVE INSERT failed");
  assert.ok(finished2, "GET failed");
  assert.ok(finished3, "SAVE UPDATE failed");
  assert.ok(finished4, "SAVE UPDATE verify failed");
  assert.ok(finished5, "EACH failed");
  assert.ok(finished6, "EACH finish failed");
  assert.ok(finished7, "SECOND INSERT failed");
  assert.ok(finished8, "REMOVE failed");
  assert.ok(finished9, "ALL failed");
  assert.ok(finished10, "NUKE failed");
});
