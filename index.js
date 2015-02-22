var transcode = require('./transcode'),
  fs = require('vinyl-fs'),
	path = require('path'),
  zlib = require('zlib'),
  map = require('map-stream');

function processOneGeometry(path, shouldDeflate, callback) {
  console.log('processing', path, shouldDeflate ? 'with deflation' : '');
  var pipe = fs.src(path)
  	.pipe(map(transcodePipe));
    if(shouldDeflate) pipe = pipe.pipe(map(deflate));
  	pipe.pipe(fs.dest('./assets'))
  	.on('end', callback);
}

function transcodePipe (file, cb) {
  transcode(file.contents, function (err, buffer) {
    file.contents = buffer
    file.path = file.path.replace('.json', '.b3d')
    cb(err, file)
  })
}

function deflate (file, cb) {
  zlib.deflateRaw(file.contents, function (err, buffer) {
    file.contents = buffer
    file.path = file.path + '.dflr'
    cb(err, file)
  })
}

function processNextFile(filesToProcess, shouldDeflate, callback) {
  if(filesToProcess.length > 0) {
    processOneGeometry(filesToProcess.shift(), shouldDeflate, processNextFile.bind(this, filesToProcess, shouldDeflate, callback));
  } else {
    callback();
  }
}

function process(filePaths, shouldDeflate, callback) {
  if(!(filePaths instanceof Array)) filePaths = [filePaths];
  else filePaths = filePaths.slice(0);
  processNextFile(filePaths, shouldDeflate, callback);
}

module.exports = process