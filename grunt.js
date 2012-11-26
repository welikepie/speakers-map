/*jshint strict:false*/
/*global module:false*/
module.exports = function (grunt) {

	/**
	 * A basic grunt.js configuration file, set up for standard no-frills
	 * web projects. Styling is coded as LESS files and processed by RECESS,
	 * & Twitter's CSS hinter and LESS compiler. JavaScript is processed by
	 * JSHint and optionally UglifyJS for compression. Both styles and scripts
	 * are compiled to single files. No other files are touched, though.
	 */
	 
	// Additional tasks to load
	grunt.loadNpmTasks('grunt-recess');
	
	var extend = function (obj) {
		var copy = JSON.parse(JSON.stringify(obj)), i, x;
		if (arguments.length > 1) {
			for (i = 1; i < arguments.length; i += 1) {
				for (x in arguments[i]) {
					if (arguments[i].hasOwnProperty(x)) {
						copy[x] = arguments[i][x];
					}
				}
			}
		}
		return copy;
	};
	
	grunt.initConfig({
	
		'recess': {
		
			// Linting task runs RECESS without compilation, just for checking
			// the contents of all .less files, to report any errors or warnings.
			'lint': {
				'src': 'styles/**/*.less',
				'options': {
					'compile': false,
					'compress': false,
					'noIDs': false,
					'noUniversalSelectors': false
				}
			},
		
			// Compilation tasks should only use the main .less files as source;
			// RECESS doesn't process the @import statements, so compiling the file
			// already included with @import will cause duplicates to show up.
			
			// Tasks used for development should disable compression to increase readability.
			'dev': {
				'src': 'styles/*.less',
				'dest': 'styles/styles.css',
				'options': {
					'compile': true,
					'compress': false
				}
			},
			
			// Release tasks can match the dev tasks, with compression enabled.
			'release': {
				'src': '<config:recess.dev.src>',
				'dest': '<config:recess.dev.dest>',
				'options': {
					'compile': true,
					'compress': true
				}
			}
		
		},
		
		'lint': {
		
			// JS linter ensures the high quality of JavaScript.
			// Only the files directly in the "scripts" directory are linted,
			// as vendor libraries might have the code styling that's not seen
			// well by the linter.
			
			// Development lints grunt.js as well, to ensure no mistakes in the build script.
			'dev': ['grunt.js', 'scripts/!(vendor|main).js'],
			'release': 'scripts/!(vendor|main).js'
		
		},
		'jshint': (function () {
		
			// Baseline settings for JS linter
			var options = {
					'immed': true,		// Complains about immediate function invocations not wrapped in parentheses
					'latedef': true,	// Prohibits using a variable before it was defined
					'forin': true,		// Requires usage of .hasOwnProperty() with 'for ... in ...' loops
					'noarg': true,		// Prohibits usage of arguments.caller and arguments.callee (both are deprecated)
					'eqeqeq': true,		// Enforces the usage of triple sign comparison (=== and !==)
					'bitwise': true,	// Forbids usage of bitwise operators (rare and, most likely, & is just mistyped &&)
					'strict': true,		// Enforces usage of ES5's strict mode in all function scopes
					'undef': true,		// Raises error on usage of undefined variables
					'plusplus': true,	// Complains about ++ and -- operators, as they can cause confusion with their placement
					'unused': true,		// Complains about variables and globals that have been defined, but not used
					'curly': true,		// Requires curly braces for all loops and conditionals
					
					'browser': true		// Assumes browser enviroment and browser-specific globals
				},
				
				// Development environment assumes dev globals, such as console or alert, whereas release forbids them
				dev = extend(options, {'devel': true}),
				release = extend(options, {'devel': false});
			
			return {
				'options': options,
				'dev': {'options': dev},
				'release': {'options': release}
			};
		
		}()),
		
		'concat': {
		
			// Concatenation takes all available JavaScript and puts it in a as little number
			// of files as possible. Basic setup covers concatenation of all the scripts in
			// subdirectories into one file (as it is assumed the main scripts are dependent
			// on these to work), and all the scripts from main scripts directory into another.
			
			// Auxiliary scripts
			'aux': {
				'src': ['scripts/*/**/*.js'],
				'dest': 'scripts/vendor.js',
				'separator': ";"
			},
			
			// Main scripts - separator set to two linebreaks for better readability
			'main': {
				'src': 'scripts/!(vendor|main).js',
				'dest': 'scripts/main.js',
				'separator': ";\n\n"
			}
		
		},
		
		'min': {
		
			// Minification with UglifyJS will ensure the JavaScript stays as small as possible
			// after concatenation. Reducing file size will reduce the amount of data needed to be
			// transferred and thus, the response time. Should only be used in release tasks, as it
			// makes the JavaScript completely unreadable.
			
			// Auxiliary scripts
			'aux': {
				'src': '<config:concat.aux.dest>',
				'dest': '<config:min.aux.src>'
			},
			
			// Main scripts
			'main': {
				'src': '<config:concat.main.dest>',
				'dest': '<config:min.main.src>'
			}
		
		},
		
		'watch': {
		
			// File watcher allows certain tasks to be triggered on file modification, addition or deletion,
			// depending on the watch pattern. Quite useful to automatically compile LESS to CSS or to process
			// the JavaScript. Used along with the dev tasks, to update the state of the files after initial build.
			
			// This bit monitors all LESS files - when any change, lint and compilation is run
			'less': {
				'files': '<config:recess.lint.src>',
				'tasks': ['recess:lint', 'recess:dev'],
				'options': {
					'forceWatchMethod': 'old'
				}
			},
			
			// This bit monitors the same set of files as concat's main task and re-concatenates whenever change occurs
			'js-main': {
				'files': '<config:concat.main.src>',
				'tasks': ['lint:dev', 'concat:main']
			},
			
			// This bit monitors the same set of files as concat's aux task and re-concatenates whenever change occurs
			'js-aux': {
				'files': '<config:concat.aux.src>',
				'tasks': ['concat:aux']
			}
		
		}
	
	});
	
	// Two tasks below are the build targets, one for development, one for release.
	// Development build does no minification and starts file watcher once the build is complete.
	// Release build minifies both CSS and JS, with no file watching done.
	grunt.registerTask('dev', 'recess:lint recess:dev lint:dev concat watch');
	grunt.registerTask('release', 'recess:lint recess:release lint:release concat min');
	
	grunt.registerTask('default', 'dev');

};