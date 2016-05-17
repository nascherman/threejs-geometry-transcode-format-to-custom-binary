var parseXml = require('xml-parse-from-string')

function extractSvgPolygons (svgDoc) {
  // concat all the <polygon> elements to form an SVG polygon string
  if (typeof svgDoc === 'string') {
    svgDoc = parseXml(svgDoc)
  }
  if (!svgDoc || typeof svgDoc.getElementsByTagName !== 'function') {
    throw new Error('could not get an XML document from the specified SVG contents')
  }

  var polygons = Array.prototype.slice.call(svgDoc.getElementsByTagName('polygon'))

  var polygonsData = polygons.map(function (polygon) {
    var d = polygon.getAttribute('points') || '';
    return (d.replace(/\s+/g, ' ').trim()).split(' ');
  });

  return polygonsData;
}

module.exports = extractSvgPolygons
