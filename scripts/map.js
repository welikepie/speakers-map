/*jshint nonew:false, unused:false */
/*global _:true, Q:true, Zepto:true, mapbox:true */

new Zepto(function ($) {
	"use strict";

	var speakers_map = (function (options) {
	
		options = options || {};
		var mapbox_url = options.map_url || 'arranrp.pirate',
			marker_url = options.data_url || 'data/speakers.geojsonp',
			
			map_container = options.container || null,
			
			marker_generator = options.marker_generator || function () {
				return mapbox.markers.simplestyle_factory({
					'properties': {
						'marker-symbol': 'pitch',
						'marker-color': '#000000'
					}
				});
			},
			
			tooltip_generator = options.tooltip_generator || function (feature) {
				var html = '',
					props = ('properties' in feature ? feature.properties : {});
					
				if ('name' in props) { html += '<h1 class="name">' + props.name + '</h1>'; }
				if ('description' in props) { html += '<div class="description">' + props.description + '</div>'; }
					
				if (typeof window.html_sanitize === 'function') {
					html = window.html_sanitize(
						html,
						function (x) { return x; },
						function (x) { return x; }
					);
				}
				html = '<div>' + html + '</div>';
				
				return $(html).get(0);
			},
			
			map_object,
			map_layer,
			marker_layer,
			marker_interaction,
			
			map_deferred,
			marker_deferred,
			
			callback = options.callback || null,
			
			filters,
			filter_func,
			filter_invoke,
			
			normalise_arr,
			
			tag_functions,
			employer_functions;
		
		// Map initialisation
		// ------------------
		
		map_object = mapbox.map(map_container);
		map_deferred = Q.defer();
		
		marker_layer = mapbox.markers.layer();
		marker_layer.factory(marker_generator);
		marker_interaction = mapbox.markers.interaction(marker_layer)
			.hideOnMove(false)
			.showOnHover(false)
			.exclusive(true)
			.formatter(tooltip_generator);
		marker_deferred = Q.defer();
		
		// Async loading
		mapbox.load(mapbox_url, function (specification) {
			map_layer = specification.layer;
			map_object.addLayer(map_layer);
			map_object.setZoomRange(specification.minzoom + 3, specification.maxzoom);
			map_deferred.resolve();
		});
		marker_layer.url(marker_url, function () {
			map_deferred.promise.then(function () {
				map_object.addLayer(marker_layer);
				marker_deferred.resolve();
			});
		});
		
		// Filtering
		// ---------
		
		filters = [];
		filter_func = function (feature) {
			if (!filters.length) {
				return true;
			} else {
				return _.reduce(filters, function (state, filter) {
					return (state ? filter(feature) : false);
				}, true);
			}
		};
		filter_invoke = function () { marker_layer.filter(filter_func); };
		normalise_arr = _.memoize(function (arr) {
			var t = _.chain(arr)
				.map(function (item) {
					return item
						.toLowerCase()
						.replace(/^\s+|\s+$/i, '')
						.replace(/\s+/i, ' ');
				})
				.compact()
				.uniq()
				.value();
			t.sort();
			return t;
		}, function (arr) { return arr.join('|'); });
		
		// TAG HANDLING
		// ------------
		
		tag_functions = (function () {
		
			var get,
				filter_set,
				filter_add,
				filter_remove,
				
				filtered_tags = [],
				filter_tag_func = function (feature) {
					if (('specialties' in feature.properties) &&
						_.isArray(feature.properties.specialties) &&
						feature.properties.specialties.length) {
						
						var tags = normalise_arr(filtered_tags);
						return _.intersection(tags, normalise_arr(feature.properties.specialties)).length === tags.length;
					
					} else {
						return false;
					}
				};
			
			get = function () {
			
				return _.chain(marker_layer.features())
					.pluck('properties')
					.pluck('specialties')
					.flatten(true)
					.compact()
					.countBy(_.identity)
					.map(function (value, key) {
						return {
							'tag': key,
							'count': value
						};
					})
					.value();
			
			};
			
			filter_set = function (arr) {
				var inx;
				
				if ((typeof arr === 'object') && _.isArray(arr)) {
					filtered_tags = arr;
				} else {
					filtered_tags = [];
				}
				
				inx = _.indexOf(filters, filter_tag_func);
				if (filtered_tags.length && (inx === -1)) {
					filters.push(filter_tag_func);
				} else if (!filtered_tags.length && (inx !== -1)) {
					filters.splice(inx, 1);
				}
				filter_invoke();
			};
			filter_add = function (item) {
				var inx;
				
				if (_.indexOf(filtered_tags, item) === -1) {
					filtered_tags.push(item);
					inx = _.indexOf(filters, filter_tag_func);
					if (filtered_tags.length && (inx === -1)) {
						filters.push(filter_tag_func);
					}
					filter_invoke();
				}
			};
			filter_remove = function (item) {
				var inx = _.indexOf(filtered_tags, item);
			
				if (inx !== -1) {
					filtered_tags.splice(inx, 1);
					inx = _.indexOf(filters, filter_tag_func);
					if (!filtered_tags.length && (inx !== -1)) {
						filters.splice(inx, 1);
					}
					filter_invoke();
				}
			};
			
			return {
				'get': get,
				'filter': {
					'set': filter_set,
					'add': filter_add,
					'remove': filter_remove
				}
			};
		
		}());
		
		employer_functions = (function () {
		
			var get,
				filter_set,
				filter_add,
				filter_remove,
				
				filtered_employers = [],
				filter_employer_func = function (feature) {
					if (('employers' in feature.properties) &&
						_.isArray(feature.properties.employers) &&
						feature.properties.employers.length) {
						
						var employers = normalise_arr(filtered_employers);
						//console.log('Comparing ', employers, ' to ', normalise_arr(feature.properties.employers), feature.properties.employers);
						return _.intersection(employers, normalise_arr(feature.properties.employers)).length > 0;
					
					} else {
						return false;
					}
				};
			
			get = function () {
			
				return _.chain(marker_layer.features())
					.pluck('properties')
					.pluck('employers')
					.flatten(true)
					.compact()
					.countBy(_.identity)
					.map(function (value, key) {
						return {
							'employer': key,
							'count': value
						};
					})
					.value();
			
			};
			
			filter_set = function (arr) {
				var inx;
				
				if ((typeof arr === 'object') && _.isArray(arr)) {
					filtered_employers = arr;
				} else {
					filtered_employers = [];
				}
				
				inx = _.indexOf(filters, filter_employer_func);
				if (filtered_employers.length && (inx === -1)) {
					filters.push(filter_employer_func);
				} else if (!filtered_employers.length && (inx !== -1)) {
					filters.splice(inx, 1);
				}
				filter_invoke();
			};
			filter_add = function (item) {
				var inx;
				
				if (_.indexOf(filtered_employers, item) === -1) {
					filtered_employers.push(item);
					inx = _.indexOf(filters, filter_employer_func);
					if (filtered_employers.length && (inx === -1)) {
						filters.push(filter_employer_func);
					}
					filter_invoke();
				}
			};
			filter_remove = function (item) {
				var inx = _.indexOf(filtered_employers, item);
			
				if (inx !== -1) {
					filtered_employers.splice(inx, 1);
					inx = _.indexOf(filters, filter_employer_func);
					if (!filtered_employers.length && (inx !== -1)) {
						filters.splice(inx, 1);
					}
					filter_invoke();
				}
			};
			
			return {
				'get': get,
				'filter': {
					'set': filter_set,
					'add': filter_add,
					'remove': filter_remove
				}
			};
		
		}());
		
		return {
			'tags': tag_functions,
			'employers': employer_functions,
			'promises': {
				'map': map_deferred.promise,
				'markers': marker_deferred.promise
			}
		};
	
	}({
		'container': document.getElementById('map'),
		'tooltip_generator': function (feature) {
			var html = '',
				props = ('properties' in feature ? feature.properties : {});
				
			if ('name' in props) { html += '<h1 class="name">' + props.name + ('title' in props ? ' <small>' + props.title + '</small>' : '') + '</h1>'; }
			if ('employers' in props) { html += '<p class="employers">' + props.employers.join(', ') + '</p>'; }
			if ('specialties' in props) { html += '<p class="specialties">' + props.specialties.join(', ') + '</p>'; }
			if ('description' in props) { html += '<div class="description">' + props.description + '</div>'; }
				
			if (typeof window.html_sanitize === 'function') {
				html = window.html_sanitize(
					html,
					function (x) { return x; },
					function (x) { return x; }
				);
			}
			html = '<div>' + html + '</div>';
			
			return $(html).get(0);
		}
	}));
	
	window.speakers_map = speakers_map;
	
	// Tiny Templating Framework
	_.templateSettings = {'interpolate': /\{\{(.+?)\}\}/g};
	var template = function (el) {
		var temp;
		if (typeof el === 'object') {
			temp = document.createElement('div');
			$(el).remove().appendTo(temp);
			el = temp.innerHTML;
		}
		temp = _.template(el);
		return function (args) {
			return $(temp(args)).get(0);
		};
	};
	
	// TAG FILTERING HANDLER
	speakers_map.promises.markers.then(function () {
	
		var minimum_count = 4,
		
			item = template($('[data-template="tag-selection"]').get(0)),
			container = $('[data-container="tag-selection"]');
		
		$(_.chain(speakers_map.tags.get())
			.filter(function (x) { return x.count >= minimum_count; })
			.tap(function (x) { x.sort(function (a, b) { return b.count - a.count; }); })
			.map(item)
			.value())
			.appendTo(container)
				.find('input')
				.on('click', function (ev) {
					speakers_map.tags.filter[this.checked ? 'add' : 'remove'](this.value);
				});
	
	});
	
	// EMPLOYER FILTERING HANDLER
	speakers_map.promises.markers.then(function () {
	
		var minimum_count = 4,
		
			item = template($('[data-template="employer-selection"]').get(0)),
			container = $('[data-container="employer-selection"]');
		
		$(_.chain(speakers_map.employers.get())
			.filter(function (x) { return x.count >= minimum_count; })
			.tap(function (x) { x.sort(function (a, b) { return b.count - a.count; }); })
			.map(item)
			.value())
			.appendTo(container)
				.find('input')
				.on('click', function (ev) {
					speakers_map.employers.filter[this.checked ? 'add' : 'remove'](this.value);
				});
	
	});

});