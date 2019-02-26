/*
*
*	Primary File for the Application
*
*/

// Dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');

// Declare the app 
var app = {};

// Init 
app.init = function() {
	// start the server
	server.init();

	//start the workers
	workers.init();

};

//Execute Init
app.init()


//Export the app
module.exports = app;