var backends = {
  postgres: require('./persistence/postgres'),
  sqlite: require('./persistence/sqlite')
};

exports.connect = function (driver/*, *args */) {
  var path,
      args = Array.prototype.slice.call(arguments, 1);
  switch (driver.toLowerCase()) {
  case 'sqlite':
  case 'sqlite3':
    path = 'sqlite';
    break;
  case 'postgres':
  case 'postgresql':
    path = 'postgres';
    break;
  case 'mongo':
  case 'mongodb':
    path = 'mongo';
    break;
  case 'json':
  case 'jsondb':
    path = 'json';
    break;
  default:
    throw "Unknown driver: " + driver;
  }
  return backends[path].new_connection.apply(this, args);
};