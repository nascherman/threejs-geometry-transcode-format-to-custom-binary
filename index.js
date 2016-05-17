var directorySearch = require('directory-search');
MockBrowser = require('mock-browser').mocks.MockBrowser;
window = MockBrowser.createWindow();
THREE = require('three');
var ProcessGeometry = require('./process');


if(!process.argv[2]) {
  console.log('must provide a path');
  return;
}
else if(!process.argv[3]) {
  console.log('must provide a file format');
  return; 
}

directorySearch(process.argv[2], '.' + process.argv[3], function(err, results) {
  if(err) {
    console.log('error ' + err);
    return;
  }
  else {
    ProcessGeometry(results,true, function() {
      console.log('done');
    });
   
  }
})


