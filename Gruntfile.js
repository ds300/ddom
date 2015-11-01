function bundle(inFile, outFile, done) {
    var browserify = require('browserify');
    var fs = require('fs');
    var b = browserify();
    b.add(inFile);
    b.bundle().pipe(fs.createWriteStream(outFile)).on('close', done);
}

module.exports = function (grunt) {
  grunt.initConfig({
    watch: {
      files: ['src/**/*.js', 'test/test.js', 'todo/todo.js', 'todo/todo.html', 'perf/perf.js'],
      tasks: ['test'],
    },
  });
  grunt.registerTask('test', function () {
    bundle('./test/test.js', './test/bundle.js', this.async());
  });
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.registerTask('default', ['test', 'watch']);
};
