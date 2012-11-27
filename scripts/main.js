/*jshint nonew:false, unused:false */
/*global Zepto:true, mapbox:true */

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
			
			initialised = false;
		
		// Map initialisation
		// ------------------
		
		mapbox.load(mapbox_url, function (specification) {
		
			map_object = mapbox.map(map_container);
			map_layer = specification.layer;
			map_object.addLayer(map_layer);
			
			map_object.setZoomRange(specification.minzoom + 3, specification.maxzoom);
			
			marker_layer = mapbox.markers.layer();
			marker_layer.factory(marker_generator);
			
			marker_interaction = mapbox.markers.interaction(marker_layer)
				.hideOnMove(false)
				.showOnHover(true)
				.exclusive(true)
				.formatter(tooltip_generator);
			
			map_object.addLayer(marker_layer);
			marker_layer.url(marker_url);
		
		});
		
		// Filtering
		// ---------
		
		return {
		
			'filter': (function () {
			
				var filters = [],
					filter_func = function (f) {
						var passed, i;
						if (!filters.length) {
							return true;
						} else {
							passed = true;
							for (i = 0; i < filters.length; i += 1) {
								if (!filters[i](f)) {
									passed = false;
								}
							}
							return passed;
						}
					},
					do_filtering = function () { marker_layer.filter(filter_func); },
					
					specialties = [],
					specialty_func = function (f) {
						var passed, i;
						if (('specialties' in f.properties) &&
							Array.isArray(f.properties.specialties) &&
							f.properties.specialties.length) {
							
							passed = true;
							for (i = 0; i < specialties.length; i += 1) {
								if (f.properties.specialties.indexOf(specialties[i]) === -1) {
									passed = false;
								}
							}
							return passed;
						
						} else {
							return false;
						}
					},
					specialty_set = function (arr) {
						var inx;
						
						if (!Array.isArray(arr)) {
							specialties = [];
						} else {
							specialties = arr;
						}
						
						inx = filters.indexOf(specialty_func);
						if (specialties.length && (inx === -1)) {
							filters.push(specialty_func);
						} else if (!specialties.length && (inx !== -1)) {
							filters.splice(inx, 1);
						}
						do_filtering();
					},
					specialty_add = function (item) {
						var inx;
						
						if (specialties.indexOf(item) === -1) {
							specialties.push(item);
							inx = filters.indexOf(specialty_func);
							if (specialties.length && (inx === -1)) {
								filters.push(specialty_func);
							} else if (!specialties.length && (inx !== -1)) {
								filters.splice(inx, 1);
							}
							do_filtering();
						}
					},
					specialty_remove = function (item) {
						var inx = specialties.indexOf(item);
						if (inx !== -1) {
							specialties.splice(inx, 1);
							inx = filters.indexOf(specialty_func);
							if (specialties.length && (inx === -1)) {
								filters.push(specialty_func);
							} else if (!specialties.length && (inx !== -1)) {
								filters.splice(inx, 1);
							}
							do_filtering();
						}
					};
				
				return {
					'specialty': {
						'set': specialty_set,
						'add': specialty_add,
						'remove': specialty_remove
					}
				};
			
			}())
		
		};
	
	}({
		'container': document.getElementById('map'),
		'tooltip_generator': function (feature) {
			var html = '',
				props = ('properties' in feature ? feature.properties : {});
				
			if ('name' in props) { html += '<h1 class="name">' + props.name + ('title' in props ? ' <small>' + props.title + '</small>' : '') + '</h1>'; }
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


});