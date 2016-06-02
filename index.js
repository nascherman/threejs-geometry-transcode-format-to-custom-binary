#!/usr/bin/env node
var directorySearch = require('directory-search');
MockBrowser = require('mock-browser').mocks.MockBrowser;
window = MockBrowser.createWindow();
THREE = require('three');
var ProcessGeometry = require('./process');


if(!process.argv[2]) {
  console.log('must provide a path');
  return;
}
 
directorySearch(process.argv[2], '.svg', function(err, results) {
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


