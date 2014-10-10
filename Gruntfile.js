module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        clean: {
            build: 'build/'
        },

        copy: {
            build: {
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: [
                        'ModalService.js',
                        'classList.js',
                        'modals/*'
                    ],
                    dest: 'build/'
                }]
            }
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'src/ModalService.js',
                dest: 'build/ModalService.min.js'
            }
        },

        autoprefixer: {
            build: {
                options: {
                    browsers: ['last 2 versions', 'ie >= 9', '> 1%']
                },
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: [
                        '**/*.css'
                    ],
                    dest: 'build/'
                }]
            }
        }

    });

    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    // Default task(s).
    grunt.registerTask('default', ['clean', 'copy', 'autoprefixer', 'uglify']);

};
