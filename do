#!/usr/bin/env node
process.mixin(require('sys'));

var commands = {
  install: function () {
    puts("install");
  },
  test: function () {
    puts("Running tests:");
    exec("ls test/**/test-*.js | xargs -L 1 /usr/local/bin/node").addCallback(function (stdout, stderr) {
      puts("All tests pass");
    }).addErrback(function (exit_code, stdout, stderr) {
      puts(stdout);
      error(stderr);
    });
  }
};

if (process.ARGV[2] && typeof commands[process.ARGV[2]] === 'function') {
  commands[process.ARGV[2]].apply(this, process.ARGV.slice(3));
} else {
  puts("\ndo usage:" + 
    "\n\t`./do install` - installs persistence into your local node library" + 
    "\n\t`./do test` - run the included test suite\n");
}