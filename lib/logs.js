/*
* Library for storing and rotating logs
*/

// Dependencies 
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

// Container for the module 
var lib = {};



// Base directory of the logs folder
lib.baseDir = path.join(__dirname,'/../.logs/');

// Append a string to a file. Create the file if it does not exist.
lib.append = function(file, str, callback) {
	//  Open the file for appending 
	fs.open(lib.baseDir+file+'.log', 'a', function(err, fileDescriptor) {
		if(!err && fileDescriptor) {
			// Append to the file and close it
			fs.appendFile(fileDescriptor, str+'\n', function(err) {
				if(!err) {
					fs.close(fileDescriptor, function(err) {
						if(!err) {
							callback(false);
						} else {
							callback('Error closing file that was being appended');
						}
					});
				} else {
					callback('Error appending to file');
				}
			});
		} else {
			callback('Could not open file for appending');
		}
	});
};


// List all of the logs, and possibly include the compress logs
lib.list = function(includeCompressedLogs, callback) {
	fs.readdir(lib.baseDir, function(err, data) {
		if(!err && data && data.length > 0) {
			var trimmedFileNames = [];
			data.forEach(function(fileName) {
				// Add the .log files 
				if(fileName.indexOf('/log') > -1) {
					trimmedFileNames.push(fileName.replace('.log',''));
				}

				// Add on the .gz files 
				if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
					trimmedFileNames.push(fileName.replace(',gz,b64').'');
				}
			});

			callback(false,trimmedFileNames);

		} else {
			callback(err, data);
		}
	});
};


// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = function(logId, newFileId, callback) {
	var sourceFile = logId + '.log';
	var destFile = newFileId + '.gz.b64';

	// Read the source file
	fs.readFile(lib.baseDir + sourceFile, 'utf8', function(err, inputString) {
		if(!err && inputString) {
			// Compress the data using gzip
			zlib.gzip(inputString, function(err, buffer) {
				if(!err && buffer) {

				} else {
					callback(err);
				}
			});
		} else {
			callback(err);
		}
	});
}







// Export the module 
module.exports = lib;