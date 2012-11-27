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
		
		return {
		
		
		
		};
	
	}({
		'container': document.getElementById('map')
	}));


});