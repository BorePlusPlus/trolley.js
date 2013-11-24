module.exports = function(grunt) {
    'use strict';

    var pkg = grunt.file.readJSON('bower.json'),
        banner = '/* trolley.js v' + pkg.version + ' - https://github.com/BorePlusPlus/trolley.js - Copyright (c) 2013, Dalibor "BorePlusPlus" Novak, License: BSD 3-clause */',
        bannerRegex = /\/\* trolley\.js.*/;

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.initConfig({
        banner: banner + '\n',
        uglify: {
            options: {
                report: 'gzip',
                banner: '<%= banner %>'
            },
            build: {
                files: {
                    'dist/trolley.min.js': 'lib/trolley.js'
                }
            }
        },
        copy: {
            options: {
                processContent: function (content) {
                    return content.replace(bannerRegex, banner);
                }
            },
            build: {
                src: 'lib/trolley.js',
                dest: 'dist/trolley.js'
            }
        }
    });

    grunt.registerTask('default', ['uglify', 'copy']);
};
