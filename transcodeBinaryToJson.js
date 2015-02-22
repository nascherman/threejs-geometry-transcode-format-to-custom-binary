function transcodeBinaryToJson(binaryBuffer, callback) {
	var error;

	var data = JSON.parse(jsonString);

	console.log(data.metadata);

	// var file = new

	callback(error, jsonString);
}

module.exports = transcodeBinaryToJson;