var loadSvgAsMesh = require('utils/svg/load-as-mesh');
var defaults = require('lodash.defaults');
function MultiSvg(params) {
	params = params || {};
	defaults(params, {
		scale: 1,
		flipY: true,
		simplify: 0.5,
		rotateX: true,
		zSpacing: 0.01,
		onReady: function() {
			console.log('multiSvg ready');
		},
		assetsPath: 'assets2/'
	});
	if(!params.layers) {
		throw new Error('You must provide layers');
	} else if(Object.keys(params.layers).length === 0) {
		throw new Error('You must have atleast one layer.');
	}

	THREE.Object3D.call(this);

	var flipScale = params.flipY ? -1 : 1;
	this.scale.set(params.scale, params.scale, params.scale * flipScale);

	var layers = params.layers;

	var baseName = params.assetsPath + 'game/gui/dashboard-instruments/';
	var onReady = params.onReady;

	var loadingCount = 0;
	var _this = this;
	Object.keys(layers).forEach(function(name, i) {
		var layer = layers[name];

		var material = new THREE.MeshBasicMaterial({
			color: layer.color,
			blending: layer.blending,
			side: THREE.DoubleSide,
			opacity: layer.opacity,
			// wireframe: true,
			transparent: true,
			depthWrite: true,
			depthTest: true
		});
		material.color = layer.color;
		loadingCount++;
		loadSvgAsMesh({
			path: baseName+layer.svgFile+'.svg',
			pivot: layer.pivot,
			rotateX: params.rotateX,
			material: material,
			simplify: params.simplify,
			separate: layer.separate,
			callback: function(err, mesh) {
				if(err) {
					throw err;
				}
				mesh.renderDepth = layer.renderDepth;
				mesh.position.y = i * params.zSpacing;

				if(layer.position) {
					mesh.position.x += layer.position[0];
					mesh.position.z += layer.position[1];
				}

				if(layer.scale) {
					mesh.scale.x = layer.scale[0];
					mesh.scale.z = layer.scale[1];
					mesh.scale.y = layer.scale[2];
				}

				mesh.name = name;
				_this.add(mesh);
				_this[name] = mesh;

				loadingCount--;
				if(loadingCount === 0 && onReady) {
					onReady();
				}
			}
		});

	});
}

MultiSvg.prototype = Object.create(THREE.Object3D.prototype);

module.exports = MultiSvg;
