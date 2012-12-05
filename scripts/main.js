/*jshint nonew:false */
/*global _:true, Q:true, Zepto:true, mapbox:true */

new Zepto(function ($) {
	"use strict";

	var arr_hash = function (arr) { return arr.join('|||'); },
		normalise = _.memoize(function (string) {
			return string
				.toLowerCase()
				.replace(/^\s+|\s+$/i, '')
				.replace(/\s+/i, ' ');
		}),
		normalise_arr = _.memoize(function (arr) {
			var t = _.chain(arr)
				.map(normalise)
				.compact()
				.uniq()
				.value();
			t.sort();
			return t;
		}, arr_hash),
	
	speakers_map = (function (options) {
	
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
			
			map_object,
			map_layer,
			marker_layer,
			marker_interaction,
			
			map_deferred,
			marker_deferred,
			
			filters,
			root_func,
			filter_invoke,
			
			tag_functions,
			employer_functions;
		
		// Map initialisation
		// ------------------
		
		map_object = mapbox.map(map_container);
		map_deferred = Q.defer();
		
		marker_layer = mapbox.markers.layerClustered();
		marker_layer.marker_factory(marker_generator);
		marker_interaction = mapbox.markers.layerClustered.interaction(marker_layer);
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
		root_func = function (feature) {
			if (!filters.length) {
				return true;
			} else {
				return _.reduce(filters, function (state, filter) {
					return (state ? filter(feature) : false);
				}, true);
			}
		};
		filter_invoke = function () { marker_layer.filter(root_func); };
		
		(function () {
		
			var partial_match_filter = function (source_field, result_field, comp_func, always_on) {
			
				always_on = !!always_on || false;
			
				var get,
					filter_set,
					filter_add,
					filter_remove,
					
					filtered_values = [],
					filter_func = function (feature) {
					
						var source;
						
						if (source_field in feature.properties) {
							source = feature.properties[source_field];
							if (_.isArray(source)) {
								if (!source.length) {
									source = ['undefined'];
								}
							} else {
								source = [source];
							}
						} else {
							source = ['undefined'];
						}
						
						return comp_func(
							normalise_arr(filtered_values),
							normalise_arr(source)
						);

					};
				
				get = function () {
				
					return _.chain(marker_layer.features())
						.pluck('properties')
						.pluck(source_field)
						.flatten(true)
						.compact()
						.countBy(_.identity)
						.map(function (value, key) {
							var temp = {};
							temp[result_field] = key;
							temp.count = value;
							return temp;
						})
						.value();
				
				};
				
				filter_set = function (arr) {
					var inx;
					if (_.isArray(arr)) {
						if (arr_hash(filtered_values) !== arr_hash(arr)) {
						
							filtered_values = arr;
							if (!always_on) {
								inx = _.indexOf(filters, filter_func);
								if (filtered_values.length && (inx === -1)) {
									filters.push(filter_func);
								} else if (!filtered_values.length && (inx !== -1)) {
									filters.splice(inx, 1);
								}
							}
							filter_invoke();
						
						}
					} else {
						throw new Error('Value passed needs to be an array.');
					}
					
				};
				
				filter_add = function (val) {
					if (val) {
						if (!_.isArray(val)) { val = [val]; }
						var temp = _.union(filtered_values, val);
						filter_set(temp);
					}
				};
				
				filter_remove = function (val) {
					if (val) {
						if (!_.isArray(val)) { val = [val]; }
						filter_set(_.difference(filtered_values, val));
					}
				};
				
				if (always_on) {
					filters.push(filter_func);
					filter_invoke();
				}
				
				return {
					'get': get,
					'filter': {
						'set': filter_set,
						'add': filter_add,
						'remove': filter_remove
					}
				};
			
			};
			
			tag_functions = partial_match_filter('specialties', 'tag', function (base, source) { return base.length && (_.intersection(base, source).length === base.length); });
			employer_functions = partial_match_filter('employers', 'employer', function (base, source) { return _.intersection(base, source).length > 0; }, true);
		
		}());
		
		return {
			'map': map_object,
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
				.on('change', function () {
					speakers_map.tags.filter[this.checked ? 'add' : 'remove'](this.value);
				});
	
	});
	
	// EMPLOYER FILTERING HANDLER
	speakers_map.promises.markers.then(function () {
	
		var minimum_count = 4,
			employer_list = speakers_map.employers.get(),
			minor_employers = _.filter(employer_list, function (x) { return x.count < minimum_count; }),
			
			item = template($('[data-template="employer-selection"]').get(0)),
			container = $('[data-container="employer-selection"]'),
			
			all_employers = $('#employer-selection label input').on('change', function () {
				if (this.checked) {
					employer_items.each(function () { this.checked = true; });
					speakers_map.employers.filter.set(_.pluck(employer_list, 'employer').concat(['undefined']));
				} else {
					employer_items.each(function () { this.checked = false; });
					speakers_map.employers.filter.set([]);
				}
			}).get(0),
			
			employer_items = _.chain(speakers_map.employers.get())
				.filter(function (x) { return x.count >= minimum_count; })
				.tap(function (x) { x.sort(function (a, b) { return b.count - a.count; }); })
				.map(item)
				.tap(function (x) {
				
					var list_item = item({'employer': 'Other companies'});
					list_item.getElementsByTagName('input')[0].value = arr_hash(_.pluck(minor_employers, 'employer'));
					x.push(list_item);
					
					list_item = item({'employer': 'No company'});
					list_item.getElementsByTagName('input')[0].value = 'undefined';
					x.push(list_item);
					
				})
				.value();
			
		employer_items = $(employer_items)
			.appendTo(container)
			.find('input')
				.on('change', function () {
					console.dir(employer_items);
					speakers_map.employers.filter[this.checked ? 'add' : 'remove'](this.value.split('|||'));
					all_employers.checked = !(employer_items.filter(function () { return !this.checked; }).length);
				});
		
		speakers_map.employers.filter.set(_.pluck(employer_list, 'employer'));
	
	});

});