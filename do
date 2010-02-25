#!/usr/bin/env node
process.mixin(require('sys'));

var commands = {
  install: function () {
    puts("install");
  },
  test: function () {
    puts("Running tests:");
    exec("ls test/**/test-*.js | xargs -L 1 /usr/local/bin/node", function (error, stdout, stderr){
      if (error) {
        throw(error);
      } else {
        puts("All tests pass");
      }
    })
  }
};

if (process.ARGV[2] && typeof commands[process.ARGV[2]] === 'function') {
  commands[process.ARGV[2]].apply(this, process.ARGV.slice(3));
} else {
  puts("\ndo usage:" + 
    "\n\t`./do install` - installs persistence into your local node library" + 
    "\n\t`./do test` - run the included test suite\n");
}