/*jshint unused:false */
/*global _:true, mapbox:true, MM:true, bean:true */

mapbox.markers.layerClustered.interaction = function (clustered_layer) {
	"use strict";

	// Singleton, yo
	if (clustered_layer && clustered_layer.interaction) { return clustered_layer.interaction; }
	
	var interaction = {},
		tooltips = [],
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
		},
		
		featureFormatter,
		clusterFormatter,
		tooltipGenerator;
	
	interaction.enable = function () { on = true; console.log(on); };
	interaction.disable = function () { on = false; console.log(on); };
	
	
	
	
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
	
		var tooltip,
			wrapper,
			content;
		
		// Determine fcluster behaviour - if not at max zoom level, zoom in.
		// Otherwise, display a tooltip containing the tooltips of all included elements.
		if (layer.map.coordLimits && (layer.map.zoom() < layer.map.coordLimits[1].zoom)) {
		
			layer.map.centerzoom(marker.location, layer.map.zoom() + 1, true);
		
		} else {
		
			content = clusterFormatter(marker.data);
			
			if (content) {
		
				wrapper = document.createElement('div');
				wrapper.style.position = 'absolute';
				wrapper.style.pointerEvents = 'auto';
				wrapper.style.background = 'white';
				
				bean.add(wrapper, 'mousedown touchstart', function stopPropagation(e) {
					e.cancelBubble = true;
					if (e.stopPropagation) { e.stopPropagation(); }
					return false;
				});
				
				if (typeof content === 'string') {
					wrapper.innerHTML = content;
				} else {
					wrapper.appendChild(content);
				}
				
				tooltip = {
					'element': wrapper,
					'data': {},
					'interactive': false,
					'location': marker.location
				};
				
				tooltips.push(tooltip);
				layer.add(tooltip);
				layer.draw();
			
			}
		
		}
		
	};
	
	interaction.featureHandler = function (func) {
		if (!arguments.length) { return featureHandler; }
		if (typeof func === 'function') { featureHandler = func; }
	};
	interaction.featureHandler(function defaultFeatureHandler (ev, marker, layer) {
		
		var el, tooltip, content = featureFormatter(marker.data);
		if (content) {
		
			el = tooltipGenerator('feature', content);
			tooltip = {
				'element': el,
				'data': {},
				'interactive': false,
				'location': marker.location
			};
			tooltips.push(tooltip);
			layer.add(tooltip);
			layer.draw();
		
		}
		
	});
	
	interaction.clusterHandler = function (func) {
		if (!arguments.length) { return clusterHandler; }
		if (typeof func === 'function') { clusterHandler = func; }
	};
	interaction.clusterHandler(function defaultClusterHandler (ev, marker, layer) {
		
		var el, tooltip, content;
		
		// Determine fcluster behaviour - if not at max zoom level, zoom in.
		// Otherwise, display a tooltip containing the tooltips of all included elements.
		if (layer.map.coordLimits && (layer.map.zoom() < layer.map.coordLimits[1].zoom)) {
		
			layer.map.centerzoom(marker.location, layer.map.zoom() + 1, true);
		
		} else {
		
			content = clusterFormatter(
				_.pluck(marker.data.properties.items, 'data'),
				featureFormatter
			);
			
			if (content) {
			
				el = tooltipGenerator('cluster', content);
				tooltip = {
					'element': el,
					'data': {},
					'interactive': false,
					'location': marker.location
				};
				tooltips.push(tooltip);
				layer.add(tooltip);
				layer.draw();
			
			}
		
		}
		
	});
	
	interaction.featureFormatter = function (func) {
		if (!arguments.length) { return featureFormatter; }
		if (typeof func === 'function') { featureFormatter = func; }
	};
	interaction.featureFormatter(function defaultFeatureFormatter (feature) {
	
		var html = '', el = document.createElement('div');
		
		if (feature.properties) {
			if (feature.properties.name) { html += '<h1>' + feature.properties.name + '</h1>'; }
			if (feature.properties.description) { html += '<div>' + feature.properties.description + '</div>'; }
		}
		el.innerHTML = html;
		el.style.pointerEvents = 'auto';
		
		return el;
	
	});
	
	interaction.clusterFormatter = function (func) {
		if (!arguments.length) { return clusterFormatter; }
		if (typeof func === 'function') { clusterFormatter = func; }
	};
	interaction.clusterFormatter(function defaultClusterFormatter (features, featureFormatter) {
	
		var el,
			item_list,
			drop_zone,
			
			empty_func = function () {
				while (drop_zone.firstChild) {
					drop_zone.removeChild(drop_zone.firstChild);
				}
			},
			first_item = true;
		
		drop_zone = document.createElement('div');
		drop_zone.className = 'drop-zone';
		
		item_list = document.createElement('ul');
		item_list.className = 'item-list';
		
		_.chain(features)
			.sortBy(function (f) { return f.properties.name.toLowerCase(); })
			.each(function itemGenerator (feature) {
			
				var el = document.createElement('li');
				el.appendChild(document.createTextNode(feature.properties.name));
				bean.add(el, 'click', function (ev) {
					ev.preventDefault();
					empty_func();
					drop_zone.appendChild(featureFormatter(feature));
				});
				item_list.appendChild(el);
				if (first_item) {
					bean.fire(el, 'click');
					first_item = false;
				}
			
			});
		
		el = document.createElement('div');
		el.appendChild(item_list);
		el.appendChild(drop_zone);
		el.style.pointerEvents = 'auto';
		
		return el;
	
	});
	
	tooltipGenerator = function (type, content) {
	
		var el = document.createElement('div');
		el.style.position = 'absolute';
		el.style.pointerEvents = 'none';
		el.style.background = 'white';
		
		bean.add(el, 'mousedown touchstart', function stopPropagation (e) {
			e.cancelBubble = true;
			if (e.stopPropagation) { e.stopPropagation(); }
			return false;
		});
		
		el.appendChild(content);
		
		return el;
	
	};
	
	if (clustered_layer) {
	
		_.each(clustered_layer.markers(), bindMarker);
		clustered_layer.addCallback('markeradded', function (_, marker) { bindMarker(marker); });
		clustered_layer.interaction = interaction;
	
	}

};