'use strict';

var gulp = require('gulp');
var eslint = require('gulp-eslint');
var condense = require('gulp-condense');
var convert = require('./');

gulp.task('lint', function() {
  return gulp.src(['*.js', 'lib/*.js', 'test/*.js'])
    .pipe(eslint())
    .pipe(eslint.format());
});

gulp.task('fixtures', function() {
  return gulp.src('test/source/fixtures/**')
    .pipe(gulp.dest('test/actual/fixtures'));
});

gulp.task('support', function() {
  return gulp.src('test/source/support/**')
    .pipe(gulp.dest('test/actual/support'));
});

gulp.task('convert', ['fixtures', 'support'], function() {
  return gulp.src('test/source/*.js')
    .pipe(convert())
    .pipe(condense())
    .pipe(gulp.dest('test/actual'));
});

gulp.task('default', ['lint']);
