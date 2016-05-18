var transcode = require('./transcode');
var  fs = require('vinyl-fs');
var path = require('path');
var zlib = require('zlib');
var map = require('map-stream');
document = MockBrowser.createDocument();


function processOneGeometry(srcPath, shouldDeflate, callback) {
  console.log('processing', srcPath, shouldDeflate ? 'with deflation' : '');
  var pipe = fs.src(srcPath)
  	.pipe(map(transcodePipe));
    if(shouldDeflate) pipe = pipe.pipe(map(deflate));
  	pipe.pipe(fs.dest(path.dirname(srcPath)))
  	.on('end', callback);
}

function transcodePipe (file, cb) {
  
  var div = document.createElement('div');

  div.innerHTML = file.contents;
  var svg = div.querySelector('svg');
  if (!svg) return cb(new Error('svg not present in resource'));

  
  transcode(svg, file.base, function (err, buffer) {
    file.contents = buffer
    file.path = file.path.replace('.svg', '.b3d')
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

module.exports = process;