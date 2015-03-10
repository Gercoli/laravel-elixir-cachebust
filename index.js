var gulp = require('gulp');
var elixir = require('laravel-elixir');
var crypto = require('crypto');
var shell = require("gulp-shell");  // temp!

elixir.extend('cachebust',function(src, buildDir){
    gulp.task("cache-busting",function() {
        gulp.src("").pipe(shell("echo " + src));
    });

    return this.queueTask("cache-busting");
});