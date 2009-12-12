process.mixin(require("./common"));

// Connect to a valid database
var db = persistence.connect('sqlite', testdb);
db.addListener('error', debug);

var store = db.get_store("foo", {
  name: String,
  age: Number
});

var finished1 = false;
var finished2 = false;
var finished3 = false;
var finished4 = false;

var data = {name: "Tim", age: 27};

// Save some data
store.save(data).addCallback(function (id) {
  assert.equal(id, 1);
  finished1 = true;
  
  // Load it back and check
  store.get(data._id).addCallback(function (data2) {
    assert.deepEqual(data2, data);
    finished2 = true;

    // Change some data and save update.
    data.age = 28;
    store.save(data).addCallback(function (id) {
      assert.equal(id, undefined);
      assert.equal(data.age, 28);
      finished3 = true;

      // Load it back to make sure it really changed.
      store.get(data._id).addCallback(function (data2) {
        assert.deepEqual(data2, data);
        finished4 = true;
      });
      
      

    })

  });
});




db.close();

process.addListener('exit', function () {
  assert.ok(finished1, "SAVE INSERT failed");
  assert.ok(finished2, "GET failed");
  assert.ok(finished3, "SAVE UPDATE failed");
  assert.ok(finished4, "SAVE UPDATE verify failed");
});
