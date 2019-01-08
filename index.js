/*
*
*	Primary File for the Application
*
*/

var http = require('http');
var url = require('url');    //node library

//The server should respond to all requests with a string 
var server = http.createServer(function (req, res) {

	// get the url and parse it
	var parsedUrl = url.parse(req.url, true);

	// get the path from that url
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g, '');

	//Get the query string as object
	var queryStringObject = parsedUrl.query;

	// Get HTTP Method
	var method = req.method.toLowerCase();

	// send the response 
	res.end('Hello World\n');

	// log the requested path
	console.log('Request recieved on path: ' + trimmedPath + ' with method: ' + method + ' and with these query string parameters ', queryStringObject);
		

});

//Start Server listening on port 3000
server.listen(3000, function() {
	console.log("Server is listening on port 3000!");
})