require('./fakeBrowserShim');

var defaults = require('lodash').defaults;
var parsePaths = require('./util/extract-paths');
var parsePolygons = require('./util/extract-polygons');
var pathsToMeshData = require('./util/paths-to-simplicial-complex-data.js');
var polygonsToMeshData = require('./util/polygons-to-simplicial-complex-data.js');
var SimplicialComplexGeometry = require('./util/SimplicialComplexGeometry');
var fs = require('fs');

var debugLevel = 0;

var toBuffer = require('typedarray-to-buffer'),
	bufferArrayTypes = require('enum-buffer-array-types'),
	THREE = require('./lib/three');

var __geometries = {};
var geometryGroup = [];
// this is a hacked version of threejs. 
// I've made a modification to export any geometry's geometryGroup (normally scoped private)
// so that I can read the final typed arrays
// and use them as the basis for the exported binary data

var threeGeometryJSONLoader = new THREE.JSONLoader();
var renderer = new THREE.WebGLRenderer();
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(90, 1, .1, 5000);
camera.position.set(0, -10, -2000);
camera.lookAt(new THREE.Vector3());

exportGeometryGroup = function(_geometryGroup) {
	Object.keys(_geometryGroup).forEach(function(key) {
		geometryGroup[key] = _geometryGroup[key];
	});
};


function createFloatBuffers(arrays) {
	var buffers = [];
	arrays.forEach(function(array){
		buffers.push(createFloatBuffer(array));
	})
	return buffers;
}

function createFloatBuffer(array) {

	var buffer = toBuffer(new Float32Array(array));

	return {
		buffer : buffer,
		type: bufferArrayTypes.Float32Array
	};
}



var max8 = 0xff;
var max16 = 0xffff;
var max32 = 0xffffffff;

var UintXArrayTypes = [
	undefined,
	Uint8Array,
	Uint16Array,
	undefined,
	Uint32Array
];

function createUintBuffer(array) {

	var largest = 0;
	for (var i = array.length - 1; i >= 0; i--) {
		largest = Math.max(largest, array[i]);
	};
	var bytesPerElement = 0;
	if(largest < max8) bytesPerElement = 1;
	else if(largest < max16) bytesPerElement = 2;
	else if(largest < max32) bytesPerElement = 4;
	else bytesPerElement = -1;

	var UintXArray = UintXArrayTypes[bytesPerElement];

	var buffer = toBuffer(new UintXArray(array));

	var type;
	switch(bytesPerElement) {
		case 1: 
			type = bufferArrayTypes.Uint8Array;
			break;
		case 2: 
			type = bufferArrayTypes.Uint16Array;
			break;
		case 4: 
			type = bufferArrayTypes.Uint32Array;
			break;
		default: 
			throw new Error('unknown type');
	}
	return {
		buffer : buffer,
		type: type
	};
}

function monochromizeUint(color) {
	var blue = color & 0xFF;
	var red = color>>16 & 0xFF;
	var green = color>>8 & 0xFF;
	var value = ~~((red + blue + green) / 3);
	return value;
}

function createColorBuffer(array, monochrome) {

	var largest = Math.max.apply(Math, array);
	var bytesPerElement = 0;

	if(monochrome) {
		bytesPerElement = 1;
		array = array.map(monochromizeUint);
	} else {
		bytesPerElement = 4;
	}

	var UintXArray = UintXArrayTypes[bytesPerElement];

	var buffer = toBuffer(new Uint8Array(array));

	var type;
	switch(bytesPerElement) {
		case 1: 
			type = bufferArrayTypes.Uint8Array;
			break;
		case 4: 
			type = bufferArrayTypes.Uint32Array;
			break;
		default: 
			throw new Error('unknown type');
	}

	return {
		buffer : buffer,
		type: type
	};
}

function enumName(val) {
	var typeName = 'unknown';
	Object.keys(bufferArrayTypes).forEach(function(key){
		if(bufferArrayTypes[key] === val) typeName = key;
	});
	return typeName;
}

function giftWrapBuffer(name, payload) {
	if(debugLevel >= 2) console.log('giftwrapping buffer', '['+name.length+', "'+name+'", '+enumName(payload.type)+', '+payload.buffer.length+', [Buffer]]');
	var nameBufferSize = new Buffer(4);
	nameBufferSize.writeUInt32LE(name.length, 0);
	var nameBuffer = new Buffer(name.length);
	nameBuffer.write(name);
	var payloadType = new Buffer(4);
	payloadType.writeUInt32LE(payload.type, 0);
	var payloadBufferSize = new Buffer(4);
	payloadBufferSize.writeUInt32LE(payload.buffer.length, 0);
	var wrappedBuffer = Buffer.concat([
		nameBufferSize,
		nameBuffer,
		payloadType,
		payloadBufferSize,
		payload.buffer
	]);

	
	return wrappedBuffer;
}

function swizzleYZ(arr) {
	var temp;
	for(var i = 1, len = arr.length; i < len; i+=3) {
		temp = arr[i];
		arr[i] = arr[i+1];
		arr[i+1] = temp;
	}
}

var swizzleYZLegend = [
	// 'position',
	// 'normal'
];

var bufferLegend = {
	'__faceArray' : 'index',
	'__vertexArray' : 'position',
	'__normalArray' : 'normal',
	'__uvArray' : 'uv',
	'__colorArray' : 'color'
}

function transcodeSvgNodeToBinary(svgNode, path, callback) {

	//var svgPaths = parsePaths(svg, params.separate);
	var svgPaths = parsePaths(svgNode, false);
	var pathsData;
	//if(params.separate) {
	//	var pathsDatas = svgPaths.map(function(svgSubPath) {
	//		return pathsToMeshData(svgSubPath, {
	//			delaunay: true,
	//			simplify: params.simplify === undefined ? 0.5 : params.simplify
	//		});
	//	});
	//	mergeComplexData.apply(this, pathsDatas);
	//	pathsData = pathsDatas[0];
	//} else {
	pathsData = pathsToMeshData(svgPaths, {
		delaunay: true,
		simplify: false
	});
	//}
	var svgPolygons = parsePolygons(svgNode.outerHTML);
	var polygonsData = polygonsToMeshData(svgPolygons);
	mergeComplexData(pathsData, polygonsData);
	//if(params.pivot) {
		//var pivot = [1230, 100];
		//pathsData.positions.forEach(function(vert) {
		//	vert[0] -= pivot[0];
		//	vert[1] -= pivot[1];
		//})
	//}
	//__geometries[path] = new SimplicialComplexGeometry(pathsData);
	var geometry = new SimplicialComplexGeometry(pathsData);



	var material = new THREE.MeshBasicMaterial({
		vertexColors: THREE.VertexColors
	});
	var mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);
	renderer.render(scene, camera);
	scene.remove(mesh);

	var buffers = {};

	Object.keys(geometryGroup).forEach(function(key) {
		var prop = geometryGroup[key];
		if(prop !== undefined) {
			if(prop.length !== undefined) {
				var type = bufferArrayTypes.discoverType(prop);
				if(bufferLegend[key] !== undefined) {
					 buffers[bufferLegend[key]] = prop;
				} 	
			} 
		}
	});


	function previewValues(name, arr, count) {
		var str = '' + arr[0];
		for (var i = 1; i < count; i++) {
			str += ',' + arr[i];
		};
		console.log(name + ': ['+str+']');
	}

	function checkValues(name, arr, count) {
		var anythingThere = arr[0];
		var good = false;
		for (var i = 1; i < count; i++) {
			if(arr[i] !== anythingThere) good = true;
		};
		if(!good) {
			console.log('EMPTY:', name, anythingThere);
		}
	}

	Object.keys(buffers).forEach(function(key) {
		var prop = buffers[key];
		if(swizzleYZLegend.indexOf(key) !== -1) swizzleYZ(prop);
		var type = bufferArrayTypes.discoverType(prop)
		if(debugLevel >= 2) console.log(key, enumName(type), prop.length);
		buffers[key] = {
			buffer: toBuffer(prop),
			type: type
		}
		previewValues(key, prop, 20);
		checkValues(key, prop, 20);
	})

	var error;

	var monochrome = false;

	var buffersArray = Object.keys(buffers).map(function(key) {
		return giftWrapBuffer(key, buffers[key]);
	})

	var outputBuffer = Buffer.concat(buffersArray);
	if(debugLevel >= 2) console.log('totalBytes:', outputBuffer.length);

	callback(error, outputBuffer);
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

module.exports = transcodeSvgNodeToBinary;