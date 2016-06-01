'use strict';

var through = require('through2');
var converter = require('./lib/converter');

module.exports = function() {
  return through.obj(function(file, enc, next) {
    var str = file.contents.toString();
    file.contents = new Buffer(converter(str));
    next(null, file);
  });
};
