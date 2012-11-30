/*jshint unused:false */
/*global _:true, mapbox:true, MM:true, bean:true */

mapbox.markers.layerClustered.interaction = function (clustered_layer) {
	"use strict";

	// Singleton, yo
	if (clustered_layer && clustered_layer.interaction) { return clustered_layer.interaction; }
	
	var interaction = {},
		on = true,
		
		bindMarker,
		featureMarkerHandler,
		clusterMarkerHandler;
	
	interaction.enable = function () { on = true; console.log(on); };
	interaction.disable = function () { on = false; console.log(on); };
	
	bindMarker = function (marker) {
		
		if (marker && marker.element) {
			if (marker.element.marker_type && (marker.element.marker_type === 'cluster')) {
				bean.add(marker.element, 'click', clusterMarkerHandler, marker.data);
			} else {
				bean.add(marker.element, 'click', featureMarkerHandler, marker.data);
			}
		}
		
	};
	
	clusterMarkerHandler = function () {
		console.log('CLUSTER EVENT: ', arguments);
	};
	featureMarkerHandler = function () {
		console.log('FEATURE EVENT: ', arguments);
	};
	
	if (clustered_layer) {
	
		_.each(clustered_layer.markers(), bindMarker);
		clustered_layer.addCallback('markeradded', function (_, marker) { bindMarker(marker); });
		clustered_layer.interaction = interaction;
	
	}

};