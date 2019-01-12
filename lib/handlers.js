/*
*These are the request Handlers 
*
*/

//Dependencies 
var _data = require('./data');
var helpers = require('./helpers');


// Handlers 
var handlers = {};


//Users
handlers.users = function(data, callback) {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if(acceptableMethods.indexOf(data.method) > -1) {
		handlers._users[data.method](data, callback);
	} else {
		callback(405);
	}
};

//Container for users submethods
handlers._users = {};

//Users - POST
//Required dataL: firstName, lastName, phone, password, tosAgreement
//Optional data: none
handlers._users.post = function(data, callback) {
	//Check  that all required fields are filled out 
	var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
	var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
	var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
	var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

	if(firstName && lastName && phone && password && tosAgreement) {
		//make sure that the user doesnt already exist 
		_data.read('users', phone, function(err, data) {
			if(err) {

				//hash the password for storage
				var hashedPassword = helpers.hash(password);
				
				//Create the user object
				if (hashedPassword) {

					var userObject = {
						'firstName' : firstName,
						'lastName' : lastName,
						'phone' : phone,
						'hashedPassword' : hashedPassword,
						'tosAgreement' : tosAgreement

					};

					//store the user
					_data.create('users', phone, userObject, function(err) {
						if (!err) {
							callback(200);
						} else {
							console.log(err);
							callback(500, {'Error' : 'Could not create the user'});
						}
					});
				} else {
					callback(500, {'Error' : 'Could not hash the users password'});
				}

				
			} else {	
				//User already exist
				callback(400, {'Error' : 'A user with that phone number already exists'});
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required fields'});
	}	
};

//Users - GET
//Required data: phone
//Optional data: none
// @TODO only let an authenticated user access their object, dont let them access others 
handlers._users.get = function(data, callback) {
	// check that the phone number is valid
	var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
	if (phone) { 
		//lookup the user
		_data.read('users', phone, function(err, data) {
			if(!err && data) {
				// remove hashed password from user object before returning to the requester
				delete data.hashedPassword;
				callback(200, data);
			} else {
				callback(404);
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'});
	}
};

//Users - PUT
//Require data: phone
//Optional data: firstName, lastName, password..(atleast 1 must specified) 
// @TODO only let an authenitaced user update their own object
handlers._users.put = function(data, callback) {
	//check for required fields
	var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

	//check for optional fields
	var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
	var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
	var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

	// Error if phone is invalid
	if (phone) {
		if (firstName || lastName || password) {
			//lookup user
			_data.read('users', phone, function(err, userData) {
				if (!err && userData) {
					//update fields
					if (firstName) {
						userData.firstName = firstName;
					}
					if (lastName) {
						userData.lastName = lastName;
					}
					if (password) {
						userData.hashedPassword = helpers.hash(password);
					}

					//persist updates
					_data.update('users', phone, userData, function(err) {
						if (!err) {
							callback(200);
						} else {
							console.log(err);
							callback(500, {'Error' : 'Could not update the user'});
						}
					});


				} else {
					callback(400, {'Error' : 'The specified user does not exist'});
				}
			});

		} else {
			callback(400, {'Error' : 'Missing fields to update'});
		}
	} else {
		callback(400, {'Error' : 'Missing required field'});
	}

	
};

//Users - DELETE
handlers._users.delete = function(data, callback) {
	
};



// PING
handlers.ping = function(data, callback) {
	callback(200);
};

//not found handler
handlers.notFound = function(data, callback) {
	callback(404);
};


// Export the module
module.exports = handlers;