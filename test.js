process.mixin(require('sys'));
var Persistance = require('./persistance');


// Can use a mongodb server as the backend
Persistance.backend = new Persistance.Backend('mongodb://localhost/employees');
// Can use a postgres server as the backend
Persistance.backend = new Persistance.Backend('postgresql://user:pass@localhost:5432/employees');

// Can use a sqlite database file
Persistance.backend = new Persistance.Backend('sqlite://employees.db');
// Can store data in folder with flat json files
Persistance.backend = new Persistance.Backend('jsondb://employees_data');



var People = Persistancedb.define_table(function (table) {
  table.property("")
})
db.define_table("people", function (p))