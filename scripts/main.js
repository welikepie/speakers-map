/*jshint nonew:false */
/*global Zepto:true, mapbox:true */

new Zepto(function ($) {
	"use strict";

	var
	
	// SETTINGS
	// -----------------
	mapbox_url = 'arranrp.pirate',
	markers_url = 'data/speakers.geojsonp',
	
	map_container = document.getElementById('map'),
	
	// STATE VARS
	// -----------------
	
	map,
	markers,
	
	// FUNCTIONS
	// *****************
	
	init = (function () {
	
		var inits = [],
			add_init = function (x) { if (typeof x === 'function') { inits.push(x); } },
			init_func = function () {
				var i, l = inits.length;
				for (i = 0; i < l; i += 1) {
					inits[i]();
				}
			};
		init_func.add = add_init;
		
		return init_func;
	
	}());
	
	init.add(function () {
		
		mapbox.load(mapbox_url, function (spec) {
		
			var inter;
			
			map = mapbox.map(map_container);
			map.addLayer(spec.layer);
			
			map.setZoomRange(spec.minzoom + 3, spec.maxzoom);
			
			markers = mapbox.markers.layer();
			markers.factory(function () {
				return mapbox.markers.simplestyle_factory({
					'properties': {
						'marker-symbol': 'pitch',
						'marker-color': '#000000'
					}
				});
			});
			
			inter = mapbox.markers.interaction(markers)
				.hideOnMove(false)
				.showOnHover(true)
				.exclusive(true)
				.formatter(function (feature) {
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
				});
			
			map.addLayer(markers);
			
			markers.url(markers_url);
			
		});
		
	});
	
	init();

});