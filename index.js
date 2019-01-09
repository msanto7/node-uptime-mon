/*
*
*	Primary File for the Application
*
*/

var http = require('http');
var https = require('https');
var url = require('url');    //node library
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');



//HTTP Server 
var httpServer = http.createServer(function (req, res) {
	unifiedServer(req, res);	
});

//Start HTTP Server
httpServer.listen(config.httpPort, function() {
	console.log("Server is listening on port: " + config.httpPort);
});

//HTTPS Server
var httpsServerOptions = {
	'key' : fs.readFileSync('./https/key.pem'),
	'cert' : fs.readFileSync('./https/cert.pem')
};

var httpsServer = https.createServer(httpsServerOptions, function(req, res) {
	unifiedServer(req, res);	
});

//Start HTTPS Server
httpsServer.listen(config.httpsPort, function() {
	console.log("Server is listening on port: " + config.httpsPort);
});


// Server logic (http and https)
var unifiedServer = function(req, res) {

	// get the url and parse it
	var parsedUrl = url.parse(req.url, true);

	// get the path from that url
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');

	//Get the query string as object
	var queryStringObject = parsedUrl.query;

	// Get HTTP Method
	var method = req.method.toLowerCase();

	// Get headers as an object
	var headers = req.headers;

	//Get the payload  (strind decoder built in node library)
	var decoder = new StringDecoder('utf-8');
	var buffer = '';
	req.on('data', function(data) {
		buffer += decoder.write(data);
	});
	req.on('end', function() { 
		buffer += decoder.end();

		//Choose the handler for this request. 
		var chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

		//construct object to send to handler
		var data = {
			'trimmedPath' : trimmedPath,
			'queryStringObject' : queryStringObject,
			'method' : method,
			'headers' : headers,
			'payload' : buffer
		};	

		//Route the request specified in the router
		chosenHandler(data, function(statusCode, payload) {
			//default status code 200
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

			//use the payload or default to empty object 
			payload = typeof(payload) == 'object' ? payload : {};

			//convert payload from object to string
			var payloadString = JSON.stringify(payload);

			//Return response
			res.setHeader('Content-Type', 'application/json');
			res.writeHead(statusCode);
			res.end(payloadString);

			//Log 
			console.log('Returning response : ', statusCode, payloadString);

		});
	});
};


//Handlers 
var handlers = {};

//Sample handler
handlers.sample = function(data, callback) {
	//callback a http status code, and a payload object
	callback(406, {'name' : 'sample handler'});
};

//not found handler
handlers.notFound = function(data, callback) {
	callback(404);
};

//Define a request router
var router = {
	'sample' : handlers.sample
};