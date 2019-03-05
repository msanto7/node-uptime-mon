/* 
* Server Related Tasks 
*
*/

var http = require('http');
var https = require('https');
var url = require('url');    //node library
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');

// Instantiate the server module object 
var server = {};


//HTTP Server 
server.httpServer = http.createServer(function (req, res) {
	server.unifiedServer(req, res);	
});


//HTTPS Server 
server.httpsServerOptions = { 
	'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
	'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
	unifiedServer(req, res);	
});


// Server logic (http and https)
server.unifiedServer = function(req, res) {

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
		var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

		//construct object to send to handler
		var data = {
			'trimmedPath' : trimmedPath,
			'queryStringObject' : queryStringObject,
			'method' : method,
			'headers' : headers,
			'payload' : helpers.parseJsonToObject(buffer)
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


//Define a request router
server.router = {
	'ping' : handlers.ping,
	'users' : handlers.users,
	'tokens' : handlers.tokens,
	'checks' : handlers.checks
};

// Initialize function
server.init = function() {
	// start the http server
	server.httpServer.listen(config.httpPort, function() {
		console.log("Server is listening on port: " + config.httpPort);
	});

	//start the https server
	server.httpsServer.listen(config.httpsPort, function() {
		console.log("Server is listening on port: " + config.httpsPort);
	});

}


//Export the module 
module.exports = server;