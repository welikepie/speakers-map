/*jshint unused:false */
/*global _:true, mapbox:true, MM:true, bean:true */

mapbox.markers.layerClustered.interaction = function (clustered_layer) {
	"use strict";

	// Singleton, yo
	if (clustered_layer && clustered_layer.interaction) { return clustered_layer.interaction; }
	
	var interaction = {},
		tooltips = [],
		
		on = true,
		exclusive = true,
		hideOnMove = true,
		
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
	interaction.exclusive = function (x) {
		if (!arguments.length) { return exclusive; }
		exclusive = !!x;
	};
	interaction.hideOnMove = function (x) {
		if (!arguments.length) { return hideOnMove; }
		hideOnMove = !!x;
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
	
	interaction.featureHandler = function (func) {
		if (!arguments.length) { return featureHandler; }
		if (typeof func === 'function') { featureHandler = func; }
	};
	interaction.featureHandler(function defaultFeatureHandler (ev, marker, layer) {
		
		var el, tooltip, content = featureFormatter(marker.data);
		if (content) {
		
			if (exclusive && tooltips.length) { interaction.hideTooltips(); }
		
			el = tooltipGenerator('feature', content, marker);
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
			
				if (exclusive && tooltips.length) { interaction.hideTooltips(); }
			
				el = tooltipGenerator('cluster', content, marker);
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
	
	interaction.hideTooltips = function () {
		while (tooltips.length) {
			try { clustered_layer.remove(tooltips.pop()); }
			catch (e) {}
		}
	};
	interaction.screenPosition = function (marker) {
	
		if (!clustered_layer.map) { return null; }
		
		var size = clustered_layer.map.locationPoint(clustered_layer.map.getExtent().southEast()),
			point = clustered_layer.map.locationPoint(marker.location);
		
		return {
			'top': point.y,
			'bottom': size.y - point.y,
			'left': point.x,
			'right': size.x - point.x
		};
		
	};
	
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
		el.className = 'tooltip-content';
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
		el.className = 'tooltip-cluster';
		el.style.pointerEvents = 'auto';
		
		return el;
	
	});
	
	interaction.tooltipGenerator = function (func) {
		if (!arguments.length) { return tooltipGenerator; }
		if (typeof func === 'function') { tooltipGenerator = func; }
	};
	interaction.tooltipGenerator(function defaultTooltipGenerator (type, content, marker) {
	
		var tooltip,
			wrapper;
		
		tooltip = document.createElement('div');
		tooltip.className = 'marker-tooltip';
		tooltip.style.width = '100%';
		
		wrapper = tooltip.appendChild(document.createElement('div'));
		wrapper.style.position = 'absolute';
		wrapper.style.pointerEvents = 'none';
		
		content = wrapper.appendChild(content);
		content.className = content.className + ' marker-popup';
		content.style.pointerEvents = 'auto';
		
		wrapper.style.bottom = marker.element.offsetHeight / 2 + 20 + 'px';
		
		bean.add(content, 'mousedown touchstart', function stopPropagation (e) {
			e.cancelBubble = true;
			if (e.stopPropagation) { e.stopPropagation(); }
			return false;
		});
		
		return tooltip;
	
	});
	
	if (clustered_layer) {
	
		_.each(clustered_layer.markers(), bindMarker);
		clustered_layer.addCallback('markeradded', function (_, marker) {
			if (marker.interactive !== false) {
				bindMarker(marker);
			}
		});
		clustered_layer.interaction = interaction;
		
		(function () {
		
			var bind_pan = function () {
				clustered_layer.removeCallback('drawn', bind_pan);
				clustered_layer.map.addCallback('panned', function removeTooltipsOnPan () {
					if (hideOnMove) { interaction.hideTooltips(); }
				});
			};
			clustered_layer.addCallback('drawn', bind_pan);
		
		}());
	
	}
	
	return interaction;

};