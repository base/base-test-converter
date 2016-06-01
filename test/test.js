'use strict';

require('mocha');
var path = require('path');
var runner = require('base-test-runner')();
var templates = require('templates');
var converter = require('..');

runner.on('templates', function(file) {
  require(file.path)(templates);
});
runner.addFiles('templates', path.resolve(__dirname, 'actual'));

