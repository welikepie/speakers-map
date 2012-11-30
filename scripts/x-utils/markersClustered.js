/*global _:true, mapbox:true, MM:true */

mapbox.markers.layerClustered = function () {
	"use strict";
	
	var base_layer = mapbox.markers.layer.apply(this, arguments),
	
		//clusters,
		cluster_marker_cutoff,
		calculate_clusters,
		cluster_factory = _.bind(mapbox.markers.simplestyle_factory, this, {
			'properties': {
				'marker-symbol': 'star',
				'marker-color': '#990000'
			}
		}),
		
		cluster_range_check = function (cluster, candidate) { return (MM.Point.distance(cluster, candidate) < 30); },
		marker_handler_hidden = function (marker) { marker.element.style.display = 'none'; },
		marker_handler_shown = function (marker) { marker.element.style.display = ''; },
		sum_func = function (a, b) { return a + b; },

		events_bound = false,
		
		overridden_functions = {},
		disabled_func = function (method, message) {
			return function () {
				throw new Error("Method '" + method.toString() + "' is disabled for this layer. " + (message ? message : ""));
			};
		};
	
	base_layer.marker_factory = base_layer.factory;
	base_layer.factory = disabled_func('factory', "To set factories, use 'marker_factory' and 'cluster_factory'.");
	base_layer.cluster_factory = function (x) {
        if (!arguments.length) { return cluster_factory; }
        cluster_factory = x;
        // re-render all clusters
        // CODE HERE
        return base_layer;
    };
	
	overridden_functions.features = base_layer.features;
	base_layer.features = function (x) {
	
		var draw_copy, result;
		if (!arguments.length) { return overridden_functions.features(); }
		
		// Remove draw from the property list to prevent map from drawing immediately after
		if (base_layer.map) {
		
			draw_copy = base_layer.map.draw;
			base_layer.map.draw = function () {};
			result = overridden_functions.features(x);
			base_layer.map.draw = draw_copy;
			
			cluster_marker_cutoff = base_layer.markers().length;
			calculate_clusters();
			
			return result;
		
		} else {
		
			return overridden_functions.features(x);
		
		}
	
	};
	
	overridden_functions.draw = base_layer.draw;
	base_layer.draw = function () {
		// No-op if not attached
		if (!base_layer.map) { return; }
		if (!events_bound) {
			base_layer.map.addCallback('zoomed', _.debounce(calculate_clusters, 300));
			events_bound = true;
		}
		overridden_functions.draw();
	
	};
	
	overridden_functions.destroy = base_layer.destroy;
	base_layer.destroy = function () {
		if (events_bound) {
			base_layer.map.removeCallback('zoomed', calculate_clusters);
			events_bound = false;
		}
		overridden_functions.destroy();
	};
	
	calculate_clusters = function () {
	
		var i, j,
			markers = base_layer.markers().slice(0, cluster_marker_cutoff),
			grid = _.map(markers, function (item) { return base_layer.map.locationPoint(item.location); }),
			results = _.map(_.range(grid.length), function () { return []; }),
			clusters = [];
		
		for (i = 0; i < grid.length; i += 1) {
			for (j = i + 1; j < grid.length; j += 1) {
				if (cluster_range_check(grid[i], grid[j])) {
					results[i].push(j);
					results[j].push(i);
				}
			}
		}
		
		results = _.chain(_.range(results.length))
			.zip(results)
			.filter(function (item) { return !!item[1].length; })
			.tap(function (x) { x.sort(function (a, b) { return b[1].length - a[1].length; }); })
			.value();
		
		_.each(results, function (arr) {
		
			if (markers[arr[0]] && arr[1].length) {
			
				var average_x = [grid[arr[0]].x],
					average_y = [grid[arr[0]].y],
					average_count = 1;
				
				grid[arr[0]] = null;
				marker_handler_hidden(markers[arr[0]]);
				markers[arr[0]] = null;
				
				_.each(arr[1], function (inx) {
					if (markers[inx]) {
						average_x.push(grid[inx].x);
						average_y.push(grid[inx].y);
						average_count += 1;
						grid[inx] = null;
						marker_handler_hidden(markers[inx]);
						markers[inx] = null;
					}
				});
				
				clusters.push({
					'location': base_layer.map.pointLocation(new MM.Point(
						_.reduce(average_x, sum_func, 0) / average_count,
						_.reduce(average_y, sum_func, 0) / average_count
					)),
					'count': average_count
				});
				
			}
				
		});
				
		_.chain(markers)
			.compact()
			.each(marker_handler_shown);
		markers = null;
		grid = null;
		results = null;
		
		base_layer.clusters(clusters);
	
	};
	
	base_layer.clusters = function (arr) {
	
		var markers = base_layer.markers(),
			cluster_markers = markers.slice(cluster_marker_cutoff);
		
		_.each(cluster_markers, base_layer.remove);
		markers.splice(cluster_marker_cutoff, markers.length - cluster_marker_cutoff);
		
		arr = _.each(arr, function (item) {
			var obj = {
				"type": "Geometry", 
				"geometry": {
					"coordinates": [
						item.location.lon, 
						item.location.lat
					], 
					"type": "Point"
				}, 
				"properties": {
					"count": item.count
				}
			};
			base_layer.add({
				'element': cluster_factory(obj),
				'location': item.location,
				'data': obj
			});
		});
		
		base_layer.map.draw();
	
	};
	
	return base_layer;

};