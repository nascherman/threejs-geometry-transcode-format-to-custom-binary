var loadSvg = require('load-svg-local');
var parsePaths = require('./extract-paths');
var parsePolygons = require('./extract-polygons');
var pathsToMeshData = require('./paths-to-simplicial-complex-data.js');
var polygonsToMeshData = require('./polygons-to-simplicial-complex-data.js');
var SimplicialComplexGeometry = require('./SimplicialComplexGeometry');

var __geometries = {};
var __loading = {};
var __waitingTargets = {};

function createMeshFor(params) {
	var mesh = new THREE.Mesh(__geometries[params.path], params.material || new THREE.MeshBasicMaterial({
		color: params.color || 0x7f7f7f,
		side: THREE.DoubleSide,
		wireframe: true,
		rotateX: true
	}))

	if(params.rotateX) {
		mesh.rotation.x = Math.PI * 0.5;
	}
	// mesh.scale.set(0.05, -0.05, 1);
	// mesh.position.set(-30, 0, 15);
	params.callback(null, mesh);
}

function createMeshes(path) {
	__waitingTargets[path].forEach(function(params){
		createMeshFor(params);
	});
	__waitingTargets[path].length = 0;
}

function reportErrors(path, err) {
	__waitingTargets[path].forEach(function(params){
		params.callback(err);
	});
	__waitingTargets[path].length = 0;
}

function mergeComplexData() {
	var destination = arguments[0];
	var destFaces = destination.cells;
	var destVerts = destination.positions;
	for (var i = 1; i < arguments.length; i++) {
		var offset = destination.positions.length;
		arguments[i].positions.forEach(function(vert) {
			destVerts.push(vert);
		});
		arguments[i].cells.forEach(function(cell){
			destFaces.push(cell.map(function(index){
				return index + offset;
			}));
		});
	}
}

function loadAndProcessSvg(params) {
	var path = params.path;
	loadSvg(path, function (err, svg) {
		if (err) {
			reportErrors(params.path, err);
		}
		var svgPaths = parsePaths(svg, params.separate);
		var pathsData;
		if(params.separate) {
			var pathsDatas = svgPaths.map(function(svgSubPath) {
				return pathsToMeshData(svgSubPath, {
					delaunay: true,
					simplify: params.simplify === undefined ? 0.5 : params.simplify
				});
			});
			mergeComplexData.apply(this, pathsDatas);
			pathsData = pathsDatas[0];
		} else {
			pathsData = pathsToMeshData(svgPaths, {
				delaunay: true,
				simplify: params.simplify === undefined ? 0.5 : params.simplify
			});
		}
		var svgPolygons = parsePolygons(svg);
		var polygonsData = polygonsToMeshData(svgPolygons);
		mergeComplexData(pathsData, polygonsData);
		if(params.pivot) {
			var pivot = params.pivot;
			pathsData.positions.forEach(function(vert) {
				vert[0] -= pivot[0];
				vert[1] -= pivot[1];
			})
		}
		__geometries[path] = new SimplicialComplexGeometry(pathsData);
		__geometries[path].computeBoundingBox();
		createMeshes(path);
		__loading[path] = false;
	})
	__loading[path] = true;
}

function addMeshTo(params) {
	var path = params.path;
	if(__geometries[path]) {
		createMeshFor(params);
	} else if(__loading[path]) {
		__waitingTargets[path].push(params);
	} else {
		__waitingTargets[path] = [];
		__waitingTargets[path].push(params);
		loadAndProcessSvg(params);
	}
}

function loadSvgAsMesh(path, material, separate) {
	var container = new THREE.Object3D();
	container.material = material;
	addMeshTo(path, container, separate);
	return container;
}

module.exports = loadSvgAsMesh;