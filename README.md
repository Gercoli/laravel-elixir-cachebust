# laravel-elixir-cachebust
A simple [laravel-elixir](https://github.com/laravel/elixir) extension that works much like elixir's built in ```.version()``` method, except instead of renaming asset file names (and creating duplicates in /public/build/ and polluting your git repo), this module will append the cache-busting string onto the end of a file in the form of query string (i.e. /assets/css/styles?4c6649eb) inside of the the HTML document via use of a custom function.

## Installation ##
Coming soon...

## Usage ##
Your gulpfile.js needs two modifications in order to work properly.
- You need to `require('laravel-elixir-cachebust');` at the top of the file.
- Instead of using `.version()` you can use `.cachebust()` in a similar way

### Example of gulpfile.js ###
```Javascript
var elixir = require('laravel-elixir');
require('laravel-elixir-cachebust');

elixir(function(mix) {
    mix.sass("styles.scss");
    mix.scripts("app.js");

    mix.cachebust(["styles.css", "app.js"]);
});
```

#### Options ###
The second parameter of .cachebust() allows you to set these options:
- **method**: The method used to generate a cache-buster string. Valid options are:
  - "hash" - using a MD4 or MD5 hash cipher. (this is the default option)
  - "uuid" - a randomly generated string.
  - "mtime" - The time that the file was last modified, according to the filesystem.
- **length**: The *maximum* length that a cache-busting string should be. (default is 8)
- **baseDir**: The path (relative to laravel's root dir) where the generated json file should be. (default is "public")
- **file**: The filename of the json file. (default is "cachbuster.json")

### Example of gulpfile.js - With options ###
```Javascript
var elixir = require('laravel-elixir');
require('laravel-elixir-cachebust');

elixir(function(mix) {
    mix.sass("styles.scss");
    mix.scripts("app.js");

    mix.cachebust(
        ["styles.css", "app.js"],
        {
            method: "uuid",
            length: 10,
            baseDir: "public"   // cachebust will look in this dir for the assets above.
        }
    );
});
```
