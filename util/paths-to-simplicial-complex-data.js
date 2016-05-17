var parseSVG = require('parse-svg-path');
var getContours = require('svg-path-contours');
var cdt2d = require('cdt2d');
var cleanPSLG = require('clean-pslg');
var assign = require('object-assign');
var simplify = require('simplify-path');

module.exports = svgPathsToSimplicialComplexData;
function svgPathsToSimplicialComplexData (svgPath, opt) {
  if (typeof svgPath !== 'string') {
    throw new TypeError('must provide a string as first parameter')
  }
  
  opt = assign({
    delaunay: true,
    clean: true,
    exterior: false,
    simplify: 0,
    scale: 1
  }, opt)
  
  var i
  // parse string as a list of operations
  var svg = parseSVG(svgPath)
  
  // convert curves into discrete points
  var contours = getContours(svg, opt.scale)
  
  // optionally simplify the path for faster triangulation and/or aesthetics
  if (opt.simplify > 0 && typeof opt.simplify === 'number') {
    for (i = 0; i < contours.length; i++) {
      contours[i] = simplify(contours[i], opt.simplify)
    }
  }
  
  // prepare for triangulation
  var polyline = denestPolyline(contours)
  var positions = polyline.positions

  
  var loops = polyline.edges
  var edges = []
  for (i = 0; i < loops.length; ++i) {
    var loop = loops[i]
    for (var j = 0; j < loop.length; ++j) {
      edges.push([loop[j], loop[(j + 1) % loop.length]])
    }
  }

  // this updates points/edges so that they now form a valid PSLG 
  if (opt.clean !== false) {
    cleanPSLG(positions, edges)
  }

  // triangulate mesh
  var cells = cdt2d(positions, edges, opt)

  // convert to 3D representation and flip on Y axis for convenience w/ OpenGL
  to3D(positions)

  return {
    positions: positions,
    cells: cells
  }
}

function to3D (positions) {
  for (var i = 0; i < positions.length; i++) {
    var xy = positions[i]
    // xy[1] *= -1
    xy[2] = xy[2] || 0
  }
}

function denestPolyline (nested) {
  var positions = []
  var edges = []

  for (var i = 0; i < nested.length; i++) {
    var path = nested[i]
    var loop = []
    for (var j = 0; j < path.length; j++) {
      var pos = path[j]
      var idx = positions.indexOf(pos)
      if (idx === -1) {
        positions.push(pos)
        idx = positions.length - 1
      }
      loop.push(idx)
    }
    edges.push(loop)
  }
  return {
    positions: positions,
    edges: edges
  }
}
