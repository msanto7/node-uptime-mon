/*
* Helpers for miscellanious tasks
*
*/

//Dependencies
var crypto = require('crypto');
var config = require('./config');


//Container for all the helpers
var  helpers = {};



// Create a SHA256 hash
helpers.hash = function(str) {
	if(typeof(str) == 'string' && str.length > 0) {
		var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
		return hash;
	} else {
		return false;
	}
};

// Parse JSON string to object without throwing err
helpers.parseJsonToObject = function(str) {
	try {
		var obj = JSON.parse(str);
		return obj;
	} catch(e) {
		return {};
	}
};


// Create a string of random characters of a given length
helpers.createRandomString = function(strLength) {
	strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
	if(strLength) {
		//define all possible characters
		var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

		//start the final string
		var str = '';
		for(i = 1; i <= strLength; i++) {
			//get random char
			var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length)) ;
			//append char to our final string
			str+=randomCharacter;
		}

		return str;

	} else {
		return false;
	}

};









// Export the module
module.exports = helpers;