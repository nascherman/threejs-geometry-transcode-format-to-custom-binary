var parseXml = require('xml-parse-from-string')

function extractSvgPath (svgDoc, seperatePaths) {
	// concat all the <path> elements to form an SVG path string
	if (typeof svgDoc === 'string') {
		svgDoc = parseXml(svgDoc)
	}
	if (!svgDoc || typeof svgDoc.getElementsByTagName !== 'function') {
		throw new Error('could not get an XML document from the specified SVG contents')
	}

	var paths = Array.prototype.slice.call(svgDoc.getElementsByTagName('path'))
	var pathsData;
	if(seperatePaths) {
		pathsData = paths.map(function (path) {
			var d = path.getAttribute('d') || ''
			return d.replace(/\s+/g, ' ').trim()
		});
	} else {
		pathsData = paths.reduce(function (prev, path) {
			var d = path.getAttribute('d') || ''
			return prev + ' ' + d.replace(/\s+/g, ' ').trim()
		}, '').trim()
	}
	return pathsData;

}

module.exports = extractSvgPath;