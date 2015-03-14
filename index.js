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

var hashFile = function(options) {
    options = objectAssign({method:'hash',length: 8},options || {});

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
            }
        }

        file.hash = file_mtime[file.path]['hash'];
        callback(null,file);
    });
}