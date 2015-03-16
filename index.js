// Requirements:
var elixir = require('laravel-elixir');
var utilities = require('laravel-elixir/ingredients/commands/Utilities');
var gulp = require('gulp');
var crypto = require('crypto');
var path = require('path');
var through = require('through2');
var gutil = require('gulp-util');
var del = require('del');
var objectAssign = require('object-assign');

// Variable to remember file mtime and hash:
var file_mtime = {};

/**
 * Generate unique string (uuid) of the specified length, or 8 by default.
 * @param   length  int
 * @returns {string}
 */
function uuid(length)
{
    length = (length === parseInt(length)) ? length : 8;
    return Array(length + 1).join("x").replace(/x/g, function(c) {
        var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);
    });
}

/**
 * Generate a hash based on the string passed to the function.
 * @param   str     {string}
 * @param   length  {int}
 * @returns {string}
 */
function generateHash(str, length)
{
    length = (length === parseInt(length)) ? length : 8;
    var preferredCiphers = ['md4','md5'];

    for(var i = 0; i < preferredCiphers.length; i++) {
        if(crypto.getHashes().indexOf(preferredCiphers[i]) !== -1) {
            var hash = crypto.createHash(preferredCiphers[i])
                .update(str)
                .digest('hex')
                .slice(0,length);
        }
    }
    return hash || uuid(length);
}

/**
 * Cycles through each file and if the file has been modified,
 * a new cache busting string is generated and output to a json file.
 * @param options
 * @returns {*}
 */
var cacheBust = function(options) {
    options = objectAssign(
        {   // default settings
            method:'hash',
            length: 8,
            baseDir: "public",
            file: "cachbuster.json"
        },
        options || {});

    var output = {};        // The JSON object that will be saved to disk.
    var firstFile = null;   // Used to create the JSON file.

    return through.obj(function(file,encoding,callback) {
        // If we are not passed a valid object, abort.
        if(!file || file.isNull()) {
            callback(null,file);
            return;
        }

        // We can't deal with a stream, abort.
        if(file.isStream()) {
            callback(
                new gutil.PluginError('laravel-elixir-cachebust', 'Streaming not supported')
            );
            return;
        }

        // If this does not exist,
        // then this is the first time that we have been passed this file.
        file_mtime[file.path] = file_mtime[file.path] || 1;

        var thisFile = {
            current_mtime:  file.stat.mtime.getTime(),      // This files last modified date
            saved_mtime:    file_mtime[file.path]["mtime"], // The last known modification date (according to our records)
            saved_hash:     file_mtime[file.path]["hash"]   // The last known hash (according to our records)
        };

        // If the modified times don't match,
        // or there is no existing hash, make one.
        if( thisFile.current_mtime != thisFile.saved_mtime || !(thisFile.saved_hash) )
        {
            // The user can choose what method they want to use to cache-bust.
            // Hashing, UUID, or file modified time.
            if(options.method == 'hash') {
                var strHash = generateHash(file.contents,options.length);
            }
            else if (options.method == 'uuid')
            {
                var strHash = uuid(options.length);
            }
            else
            {
                var strHash = "" + thisFile.current_mtime;
            }

            file_mtime[file.path] = {
                mtime: thisFile.current_mtime,
                hash: strHash
            };


        }

        output["/" + file.relative] = file_mtime[file.path]['hash'];

        firstFile = firstFile || file;

        callback();
    }, function(callback) {
        if(firstFile) {
            this.push(
                new gutil.File({
                    cwd: firstFile.cwd,
                    base: firstFile.base,
                    path: path.join(firstFile.base, options.file),
                    contents: new Buffer(JSON.stringify(output, null, "\t"))
                })
            );
        }

        callback();
    });
};

/**
 * Hook into elixir's API and register the "cachebust" method.
 */
elixir.extend('cachebust',function(src, options){

    // overwrite default values in the options.
    options = objectAssign(
        {   // default settings
            method:'hash',
            length: 8,
            baseDir: "public/",
            file: "cachbuster.json"
        },
        options || {});


    src = utilities.prefixDirToFiles(options.baseDir, src);

    gulp.task("cache-busting", function() {
        return gulp.src( src, {base: './public'} )
            .pipe(cacheBust(options))
            .pipe(gulp.dest(options.baseDir));
    });

    this.registerWatcher("cache-busting",src);

    return this.queueTask("cache-busting");
});