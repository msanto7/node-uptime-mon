/*
*
*	Primary File for the Application
*
*/

// Dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');
var cli = require('./lib/cli');


// Declare the app 
var app = {};

// Init 
app.init = function() {
	// start the server
	server.init();

	// Start the workers
	workers.init();

	// Start the CLI last 
	setTimeout(function() {
		cli.init();
	}, 50);

};

//Execute Init
app.init()


//Export the app
module.exports = app;