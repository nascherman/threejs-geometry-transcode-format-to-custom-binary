var process = require('./');

function onComplete() {
  console.log('DONE');
}

var paths = [
  './assets/teapot.json'
];
process(paths, false, onComplete);
process(paths, true, onComplete);
