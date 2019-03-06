/* 
*
* Worker-related Tasks
*/

//Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
var _logs = require('./logs');


// Instantiate the Worker Object

var workers = {};

// Lookup all the checks, get their data, send to validator
workers.gatherAllChecks = function() {
	// Get all the checks
	_data.list('checks', function(err, checks) {
		if(!err && checks && checks.length > 0) {
			checks.forEach(function(check) {
				// Read in the check data
				_data.read('checks', check, function(err, originalCheckData) {
					if(!err && originalCheckData) {
						// Pass the data to the check validator, and let that func continue or log as needed 
						workers.validateCheckData(originalCheckData);
					} else {
						console.log("Error reading one of the check's data");
					}
				});
			});
		} else {
			console.log("Error: Could not find any checks to process");
		}
	});
};


// Sanity Checking the check-data
workers.validateCheckData = function(originalCheckData) {
	originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
	originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
	originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
	originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
	originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
	originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
	originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
	originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' &&  originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;


	// set the keys that may not be set (if the workers have not seen this check before)
	originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
	originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' &&  originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;


	// If all the checks pass...pass the data along
	if(originalCheckData.id &&
	originalCheckData.userPhone &&
	originalCheckData.protocol &&
	originalCheckData.url &&
	originalCheckData.method &&
	originalCheckData.successCodes &&
	originalCheckData.timeoutSeconds) {
		workers.performCheck(originalCheckData);
	} else {
		console.log("Error: One of the checks is not properly formatted. Skipping this check");
	}

};	


// Perform the check, send the original check data and the outcome of the check process...to the next step 

workers.performCheck = function(originalCheckData) {
	// Prepare the initial check outcome
	var checkOutcome = {
		'error' : false,
		'responseCode' : false
	};

	// Mark that the outcome has not been sent yet 
	var outcomeSent = false;

	// Parse the hostname and the path out of the original check data
	var parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url,true);
	var hostName = parsedUrl.hostname;
	var path = parsedUrl.path; // using path and not "pathname" because we want the query string

	// Construct the request 
	var requestDetails = {
		'protocol' : originalCheckData.protocol+':',
		'hostname' : hostName,
		'method' : originalCheckData.method.toUpperCase(),
		'path' : path,
		'timeout' : originalCheckData.timeoutSeconds * 1000 // used for conversion to seconds
	};

	// Instantiate the request object (using either http or https module)
	var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
	var req = _moduleToUse.request(requestDetails, function(res) {
		// Grab the status of the sent request 
		var status = res.statusCode;

		// Update the check outcome and pass the data along 
		checkOutcome.responseCode = status;
		if(!outcomeSent) {
			workers.processCheckOutcome(originalCheckData, checkOutcome);
			outcomeSent = true;
		}
	});

	// Bind to the error event so it doesn't get thrown 
	req.on('error', function(e) {
		// Update the check outcome and pass datta along
		checkOutcome.error = {
			'error' : true,
			'value' : e
		};
		if(!outcomeSent) {
			workers.processCheckOutcome(originalCheckData, checkOutcome);
			outcomeSent = true;
		}
	});

	// Bind to the timeout
	req.on('timeout', function(e) {
		// Update the check outcome and pass datta along
		checkOutcome.error = {
			'error' : true,
			'value' : 'timeout'
		};
		if(!outcomeSent) {
			workers.processCheckOutcome(originalCheckData, checkOutcome);
			outcomeSent = true;
		}
	});

	// End the request 
	req.end();

};



// Process the check outcome, update the check data as needed, trigger an alert if needed 
// Special logic for accomadating a check that has never been checked before 
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
	// decide if the check is currently up or down
	var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

	// decide if an alert is warranted 
	var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;



	// Log the outcome of the check
	var timeOfCheck = Date.now();
	workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);


	// update the check data
	var newCheckData = originalCheckData;
	newCheckData.state = state;
	newCheckData.lastChecked = timeOfCheck;



	// Save the updates 
	_data.update('checks', newCheckData.id, newCheckData, function(err) {
		if(!err) {
			// send the new check data to the next phase in the process if needed 
			if(alertWarranted) {
				workers.alertUserToStatusChanged(newCheckData);
			} else {
				console.log('Check outcome has not changed, no alert needed');
			}
		} else {
			console.log("Error : trying to save updates to one of the checks");
		}
	});
};

// Alert the user if check status changed 
workers.alertUserToStatusChanged = function(newCheckData) {
	var msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
	helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err) {
		if(!err) {
			console.log("Success: User was alerted to a status change in their check, via sms", msg);
		} else {
			console.log("Error: Could not send sms alert to user who had a state change in their check.");
		}
	});
};


workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
	// Form the log data
	var logData = {
		'check' : originalCheckData,
		'outcome' : checkOutcome,
		'state' : state,
		'alert' : alertWarranted,
		'time' : timeOfCheck
	};

	// Convert data to a string 
	var logString = JSON.stringify(logData);

	//Determine the name of the log file
	var logFileName = originalCheckData.id;

	// Append the log string to the file 
	_logs.append(logFileName, logString, function(err) {
		if(!err) {
			console.log("Logging to file succeeded");
		} else {
			console.log("Logging to file failed.");
		}

	});

};



// Timer to execute the worker process once per minute
workers.loop = function() {
	setInterval(function() {
		workers.gatherAllChecks();
	}, 1000 * 60);
};

// Rotate or compress the log files 
workers.rotateLogs = function() {
	// List all the (non compressed) log files 
	_logs.list(false, function(err, logs) {
		if(!err && logs && logs.length > 0) {
			logs.forEach(function(logName) {
				// Compress the data to a different file
				var logId = logName.replace('.log','');
				var newFileId = logId+'-'+Date.now();
				_logs.compress(logId,newFileId, function(err) {
					if(!err) {
						// Truncate the log
						_logs.truncate(logId, function(err) {
							if(!err) {
								console.log("Success truncating logFile");
							} else {
								console.log("Error truncating logFile");
							}
						});
					} else {
						console.log("Error compressing one of the log files", err);
					}
				});
			});
		} else {
			console.log("Error : could not find any logs to rotate");
		}
	});
};

// Timer to execute the log rotation ever 24 hours
workers.logRotationLoop = function() {
	setInterval(function() {
		workers.rotateLogs();
	}, 1000 * 60 * 60 * 24);
};


// Init script
workers.init = function() {
	// Execute all the checks immediately 
	workers.gatherAllChecks();
	// Call the loop so the checks will execute later on 
	workers.loop();

	// Compress all the logs immediately
	workers.rotateLogs();

	// Call the compression loop so logs will be compressed later on 
	workers.logRotationLoop();

};





// Export the module 
module.exports = workers;