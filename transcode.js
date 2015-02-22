require('./fakeBrowserShim');

var debugLevel = 0;

var toBuffer = require('typedarray-to-buffer'),
	bufferArrayTypes = require('enum-buffer-array-types'),
	THREE = require('./lib/three');


// this is a hacked version of threejs. 
// I've made a modification to export any geometry's geometryGroup (normally scoped private)
// so that I can read the final typed arrays
// and use them as the basis for the exported binary data

var threeGeometryJSONLoader = new THREE.JSONLoader();
var renderer = new THREE.WebGLRenderer();
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera();

exportGeometryGroup = function(_geometryGroup) {
	geometryGroup = _geometryGroup;
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

function transcodeJsonToBinary(jsonString, callback) {

	var jsonData = JSON.parse(jsonString);
	var geometry = threeGeometryJSONLoader.parse(jsonData).geometry;

	var material = new THREE.MeshBasicMaterial({
		vertexColors: THREE.VertexColors
	});
	scene.add(new THREE.Mesh(geometry, material));
	renderer.render(scene, camera);

	var buffers = {};
	Object.keys(geometryGroup).forEach(function(key) {
		var prop = geometryGroup[key];
		if(prop) {
			if(prop.length !== undefined) {
				// console.log(key, prop.length, prop instanceof Array);
				var type = bufferArrayTypes.discoverType(prop);
				if(bufferLegend[key] !== undefined) buffers[bufferLegend[key]] = prop;
				// console.log(key, prop.length, enumName(type));
			} else {
				// console.log(key, prop);
			}
		}
	});

	Object.keys(buffers).forEach(function(key) {
		var prop = buffers[key];
		if(swizzleYZLegend.indexOf(key) !== -1) swizzleYZ(prop);
		var type = bufferArrayTypes.discoverType(prop)
		if(debugLevel >= 2) console.log(key, enumName(type), prop.length);
		buffers[key] = {
			buffer: toBuffer(prop),
			type: type
		}
	})


	var error;

	var monochrome = false;

	var data = JSON.parse(jsonString);

	// console.log(data.metadata);

	// var buffers = {
	// 	faces : createUintBuffer(data.faces),
	// 	colors : createColorBuffer(data.colors, monochrome),
	// 	// uvs : createFloatBuffers(data.uvs),
	// 	uvs : createFloatBuffer(data.uvs[0]),
	// 	normals : createFloatBuffer(data.normals),
	// 	vertices : createFloatBuffer(data.vertices)
	// }

	var buffersArray = Object.keys(buffers).map(function(key) {
		return giftWrapBuffer(key, buffers[key]);
	})

	var outputBuffer = Buffer.concat(buffersArray);
	if(debugLevel >= 2) console.log('totalBytes:', outputBuffer.length);

	callback(error, outputBuffer);
}

module.exports = transcodeJsonToBinary;