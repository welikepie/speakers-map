/*global _:true, mapbox:true, MM:true */

mapbox.markers.layerWithClusters = (function () {
	"use strict";

	var publicLayer,
		clustersLayer;
	
	clustersLayer = function () {
	
		var base_layer = mapbox.markers.layer.apply(this, arguments);
		
		base_layer.name = 'clusters';
		
		// Make all feature-related functions no-op
		// (as the clusters layer should only have markers related to features of other layer)
		base_layer.add_feature =
		base_layer.sort =
		base_layer.url =
		base_layer.id =
		base_layer.csv =
		base_layer.filter =
		function () {};
		
		base_layer.clusters = function (arr) {
		
			var i, features = [];
			
			// Process the arguments
			if ((typeof arr === 'object') && !Array.isArray(arr)) { arr = [arr]; }
			for (i = 0; i < arr.length; i += 1) {
				if ((typeof arr[i] === 'object') &&
					('location' in arr[i]) && (arr[i].location instanceof MM.Location) &&
					('count' in arr[i]) && (typeof arr[i].count === 'number') && (arr[i].count > 0)) {
				
					features.push({
						"type": "Geometry", 
						"geometry": {
							"coordinates": [
								arr[i].location.lon, 
								arr[i].location.lat
							], 
							"type": "Point"
						}, 
						"properties": {
							"count": arr[i].count
						}
					});
				
				} else {
					throw new Error('Invalid cluster added to the map: ', arr[i], ' at index ', i);
				}
			}
			
			// Apply new set of clusters for display
			base_layer.features(features);
		
		};
		
		return base_layer;
	
	};
	
	publicLayer = function () {
	
		var base_layer = mapbox.markers.layer.apply(this, arguments),
			clusters_layer = clustersLayer(),
			
			overridden_functions = {},
			events_bound = false,
			
			report_function;
		
		clusters_layer.factory(_.bind(mapbox.markers.simplestyle_factory, mapbox.markers, {
			'properties': {
				'marker-symbol': 'star',
				'marker-color': '#990000'
			}
		}));
		
		overridden_functions.draw = base_layer.draw;
		base_layer.draw = function () {
		
			var i, x, temp;
		
			// No-op if not attached
			if (!base_layer.map) { return; }
			
			// If base layer attached, but cluster layer is not, attach cluster immediately after
			if (!clusters_layer.map) {
				temp = base_layer.map.getLayers();
				for (i = 0; i < temp.length; i += 1) {
					if (temp[i].name === base_layer.name) { x = i; break; }
				}
				base_layer.map.insertLayerAt(x+1, clusters_layer);
			}
			
			if (!events_bound) {
				base_layer.map.addCallback('zoomed', report_function);
				events_bound = true;
			}
			
			overridden_functions.draw();
		
		};
		
		overridden_functions.destroy = base_layer.destroy;
		base_layer.destroy = function () {
		
			if (events_bound) {
				base_layer.map.removeCallback('zoomed', report_function);
				events_bound = false;
			}
		
		};
		
		(function () {
			
			var minimum_distance = 40,
				sum_func = function (a, b) { return a + b; };
			
			report_function = _.debounce(function crazy_ass_function () {
			
				var i, j,
					markers = base_layer.markers().slice(),
					grid = _.map(markers, function (item) { return base_layer.map.locationPoint(item.location); }),
					results = _.map(_.range(grid.length), function () { return []; }),
					clusters = [];
				
				for (i = 0; i < grid.length; i += 1) {
					for (j = i + 1; j < grid.length; j += 1) {
						if (MM.Point.distance(grid[i], grid[j]) < minimum_distance) {
							results[i].push(j);
							results[j].push(i);
						}
					}
				}
				
				results = _.zip(_.range(results.length), results);
				results.sort(function (a, b) { return b[1].length - a[1].length; });
				
				_.each(results, function (arr) {
					
					if (markers[arr[0]] && arr[1].length) {
					
						var average_x = [grid[arr[0]].x],
							average_y = [grid[arr[0]].y],
							average_count = 1;
						
						grid[arr[0]] = null;
						markers[arr[0]] = null;
						
						_.each(arr[1], function (inx) {
							if (markers[inx]) {
								average_x.push(grid[inx].x);
								average_y.push(grid[inx].y);
								average_count += 1;
								grid[inx] = null;
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
				
				markers = null;
				grid = null;
				results = null;
				
				clusters_layer.clusters(clusters);
				
			}, 300);
		
		}());
		
		return base_layer;
	
	};
	
	return publicLayer;

}());