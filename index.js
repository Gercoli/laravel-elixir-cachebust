var gulp = require('gulp');
var elixir = require('laravel-elixir');
var utilities = require('laravel-elixir/ingredients/commands/Utilities');
var path = require('path');
var through = require('through2');
var gutil = require('gulp-util');

function uuid(length) {
    length = length || 10;
    return Array(length + 1).join("x").replace(/x/g, function(c) {
        var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);
    });
}

var hash = function() {
    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }

        if (file.isStream()) {
            cb(new gutil.PluginError('laravel-elixir-cachebust', 'Streaming not supported'));
            return;
        }

        file.hash = uuid(8);

        console.log("cwd: " + file.cwd);
        console.log("base: " + file.base);
        console.log("path: " + file.path);
        console.log("write to file: " + path.join(file.cwd,file.base,"cachebust.json"));

        cb(null, file);
    });
};

var writeCacheMap = function(jsonFile) {
    var output = { };
    var firstFile = null;

    return through.obj(function (file, enc, cb) {
        console.log("###### cwd: " + file.cwd);
        console.log("###### base: " + file.base);
        console.log("###### path: " + file.path);
        console.log("###### hash: " + file.hash);
        firstFile = firstFile | file;

        cb();
    }, function (cb) {
        if (firstFile) {
            this.push(new gutil.File({
                cwd: firstFile.cwd,
                base: 'public',
                path: path.join(firstFile.cwd, jsonFile),
                contents: new Buffer(JSON.stringify(output, null, '  '))
            }));
        }

        cb();
    });

};

elixir.extend('cachebust',function(src, assetDir, options){

    var cacheBusterFile = "public/cachbuster.json";
    assetDir = assetDir ? assetDir : 'public';

    src = utilities.prefixDirToFiles(assetDir, src);

    gulp.task("cache-busting",function() {
        console.log("-------- src: " + src);
        console.log("-------- assetDir: " + assetDir);

        gulp.src( src, {base: assetDir} )
            .pipe(hash())
            .pipe(writeCacheMap(cacheBusterFile))

    });

    return this.queueTask("cache-busting");
});