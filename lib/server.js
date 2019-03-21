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
var util = require('util');
var debug = util.debuglog('server');

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

		// if the request is within the public directory -- use public handler instead 
		chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;
		

		//construct object to send to handler
		var data = {
			'trimmedPath' : trimmedPath,
			'queryStringObject' : queryStringObject,
			'method' : method,
			'headers' : headers,
			'payload' : helpers.parseJsonToObject(buffer)
		};	

		//Route the request specified in the router
		chosenHandler(data, function(statusCode, payload, contentType) {

			// determine the type of response (json default)
			contentType = typeof(contentType) == 'string' ? contentType : 'json';

			//default status code 200
			statusCode = typeof(statusCode) == 'number' ? statusCode : 200;


			//Return response (content specific)
			var payloadString = '';
			if(contentType == 'json') {
				res.setHeader('Content-Type', 'application/json');
				payload = typeof(payload) == 'object' ? payload : {};
				payloadString = JSON.stringify(payload);
			}
			if(contentType == 'html') {
				res.setHeader('Content-Type', 'text/html');
				payloadString = typeof(payload) == 'string' ? payload : '';
			}
			if(contentType == 'favicon') {
				res.setHeader('Content-Type', 'image/x-icon');
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}
			if(contentType == 'css') {
				res.setHeader('Content-Type', 'text/css');
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}
			if(contentType == 'png') {
				res.setHeader('Content-Type', 'image/png');
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}
			if(contentType == 'jpg') {
				res.setHeader('Content-Type', 'image/jpeg');
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}
			if(contentType == 'plain') {
				res.setHeader('Content-Type', 'text/plain');
				payloadString = typeof(payload) !== 'undefined' ? payload : '';
			}




			//return response (common)
			res.writeHead(statusCode);
			res.end(payloadString);

			// if the response = 200 print green, else print red 
			if(statusCode == 200) {
				// log green
				debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);

			} else {
				// log red 
				debug('\x1b[31m%s\x1b[0m',method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
			}

		});
	});
};


//Define a request router
server.router = {
	'': handlers.index,
	'account/create' : handlers.accountCreate,
	'account/edit' : handlers.accountEdit,
	'account/deleted' : handlers.accountDeleted,
	'session/create' : handlers.sessionCreate,
	'session/deleted' : handlers.sessionDeleted,
	'checks/all' : handlers.checksList,
	'checks/create' : handlers.checksCreate,
	'checks/edit' : handlers.checksEdit,
	'ping' : handlers.ping,
	'api/users' : handlers.users,
	'api/tokens' : handlers.tokens,
	'api/checks' : handlers.checks,
	'favicon.ico' : handlers.favicon,
	'public' : handlers.public
};

// Initialize function
server.init = function() {
	// start the http server
	server.httpServer.listen(config.httpPort, function() {
		console.log('\x1b[36m%s\x1b[0m', "Server is listening on port: " + config.httpPort);
	});

	//start the https server
	server.httpsServer.listen(config.httpsPort, function() {
		console.log('\x1b[35m%s\x1b[0m', "Server is listening on port: " + config.httpsPort);
	});

}


//Export the module 
module.exports = server;