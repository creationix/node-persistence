var sys = require('sys');
var file = require('file');

(function () {



var Resource = function (filepath) {
  var self = this;
  this._filepath = filepath;
  file.read(filepath).addCallback(function (text) {
    process.mixin(self, JSON.parse(text));
    this._loaded = true;
  })
};
  
function load_resource(filepath, callback) {
  file.read(filepath).addCallback(function (text) {
    callback()
  })
}

function DB(folder) {
  var self = this;
  file.read('master.json').addCallback(function (text) {
    sys.puts(text);
    self.data = JSON.parse(text);
  });
}

var db = new DB('db.json');
sys.p(db);

}());
