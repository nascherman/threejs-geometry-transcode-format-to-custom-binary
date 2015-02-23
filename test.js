var process = require('./'),
  path = require('path'),
  fs = require('fs');

function onComplete() {
  console.log('DONE');
}

var assetPath = path.resolve('./assets/');
fs.readdir(assetPath, function(err, files) {
  if(err) throw err;
  var fileList = [];
  files.forEach(function(file) {
    if(file.indexOf('.json') !== -1) {
      fileList.push(path.resolve(assetPath + '/' + file));
    }
  })
  console.log(fileList);
  // process(paths, false, onComplete);
  process(fileList, true, onComplete);
});

