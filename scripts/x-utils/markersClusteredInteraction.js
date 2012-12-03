/*jshint unused:false */
/*global _:true, mapbox:true, MM:true, bean:true */

mapbox.markers.layerClustered.interaction = function (clustered_layer) {
	"use strict";

	// Singleton, yo
	if (clustered_layer && clustered_layer.interaction) { return clustered_layer.interaction; }
	
	var interaction = {},
		on = true,
		
		bindMarker,
		featureHandler,
		clusterHandler,
		
		feature_func = function (ev) {
			ev.preventDefault();
			if (on && (typeof featureHandler === 'function') && clustered_layer.map) {
				featureHandler.apply(this, Array.prototype.slice.apply(arguments));
			}
		},
		cluster_func = function (ev) {
			ev.preventDefault();
			if (on && (typeof clusterHandler === 'function') && clustered_layer.map) {
				clusterHandler.apply(this, Array.prototype.slice.apply(arguments));
			}
		};
	
	interaction.enable = function () { on = true; console.log(on); };
	interaction.disable = function () { on = false; console.log(on); };
	
	interaction.featureHandler = function (func) {
		if (!arguments.length) { return featureHandler; }
		if (typeof func === 'function') { featureHandler = func; }
	};
	interaction.clusterHandler = function (func) {
		if (!arguments.length) { return clusterHandler; }
		if (typeof func === 'function') { clusterHandler = func; }
	};
	
	bindMarker = function (marker) {
		
		if (marker && marker.element) {
			if (marker.element.marker_type && (marker.element.marker_type === 'cluster')) {
				bean.add(marker.element, 'click', cluster_func, marker, clustered_layer);
			} else {
				bean.add(marker.element, 'click', feature_func, marker, clustered_layer);
			}
		}
		
	};
	
	clusterHandler = function (ev, marker, layer) {
		
		// Determine fcluster behaviour - if not at max zoom level, zoom in.
		// Otherwise, display a tooltip containing the tooltips of all included elements.
		if (layer.map.coordLimits && (layer.map.zoom() < layer.map.coordLimits[1].zoom)) {
		
			layer.map.centerzoom(marker.location, layer.map.zoom() + 1, true);
		
		} else {
		
			console.log('DISPLAY TOOLTIPS: ', arguments);
		
		}
		
	};
	featureHandler = function () {
		console.log('FEATURE EVENT: ', arguments);
	};
	
	if (clustered_layer) {
	
		_.each(clustered_layer.markers(), bindMarker);
		clustered_layer.addCallback('markeradded', function (_, marker) { bindMarker(marker); });
		clustered_layer.interaction = interaction;
	
	}

};