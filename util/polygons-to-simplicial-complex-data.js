module.exports = svgPolygonsToSimplicialComplexData;
function svgPolygonsToSimplicialComplexData (svgPolygonsData) {
  var vertices = [];
  var cells = [];
  svgPolygonsData.forEach(function(polygon, iP) {
    polygon.forEach(function(vertex, iV) {
      var vert = vertex.split(',').map(Number);
      vert.push(0);
      vertices.push(vert);
    })
    var i4 = iP * 4;
    cells.push([i4, i4+1, i4+2]);
    cells.push([i4+3, i4, i4+2]);
  })

  return {
    positions: vertices,
    cells: cells
  };
}