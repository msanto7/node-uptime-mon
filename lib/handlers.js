/*
*These are the request Handlers 
*
*/

//Dependencies 
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');


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
handlers._users.get = function(data, callback) {
	// check that the phone number is valid
	var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
	if (phone) { 
		// get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
		//verify that the given token is valid for the phone number
		handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
			if(tokenIsValid) {
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
				callback(403, {'Error' : 'Missing required token in header, or token is invalid'});
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'});
	}
};

//Users - PUT
//Require data: phone
//Optional data: firstName, lastName, password..(atleast 1 must specified) 
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

			// get the token from the headers
			var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

			//verify that the given token is valid for the phone number
			handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
				if(tokenIsValid) {
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
					callback(403, {'Error' : 'Missing required token in header, or token is invalid'});
				}
			});


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
//Required field : phone
// @TODO only let authenticated user delete their object 
handlers._users.delete = function(data, callback) {
	// check that the phone number is valid 
	var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
	if (phone) { 

		// get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		//verify that the given token is valid for the phone number
		handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
			if(tokenIsValid) {
						//lookup the user
				_data.read('users', phone, function(err, data) {
					if(!err && data) {
						_data.delete('users', phone, function(err) {
							if (!err) {
								callback(200);
							} else {
								callback(500, {'Error' : 'Could not delete teh specified user'});
							}
						});
					} else {
						callback(400, {"Error" : "Could not find the specified user"});;
					}
				});
			} else {
				callback(403, {'Error' : 'Missing required token in header, or token is invalid'});
			}
		});
	} else {
			callback(400, {'Error' : 'Missing required field'});
	}	
};


//Tokens
handlers.tokens = function(data, callback) {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if(acceptableMethods.indexOf(data.method) > -1) {
		handlers._tokens[data.method](data, callback);
	} else {
		callback(405);
	}
};

//Container for all tokens methods
handlers._tokens = {};

//Tokens - POST
//Required data: phone, password
//Optional data: none
handlers._tokens.post = function(data, callback) {
	var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
	var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
	if(phone && password) {
		//look up user with that phone number
		_data.read('users', phone, function(err, userData) {
			if(!err && userData) {
				//hash sent password, and compare to the stored password in user obj
				var hashedPassword = helpers.hash(password);
				if(hashedPassword == userData.hashedPassword) {
					//if valid, create a new token with a random name...set exp date 1 hour in future
					var tokenId = helpers.createRandomString(20);
					var expires = Date.now() + 1000 * 60 * 60;
					var tokenObject = {
						'phone' : phone,
						'id' : tokenId,
						'expires' : expires
					};

					// Store the token
					_data.create('tokens', tokenId, tokenObject, function(err) {
						if(!err) {
							callback(200, tokenObject);
						} else {
							callback(500, {'Error' : 'Could not create the new token'});
						}
					});

				} else {
					callback(400, {'Error' : 'Password did not match the specified users stored password'});
				}
			} else {
				callback(400, {'Error' : 'Could not find the specified user'});
			}
		});

	} else {
		callback(400, {'Error' : 'Missing required fields'});
	}

};

//Tokens - GET
//Required data: id
//Optional data: none
handlers._tokens.get = function(data, callback) {
	//check that sent id is valid
		// check that the phone number is valid
	var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
	if (id) { 
		//lookup the token
		_data.read('tokens', id, function(err, tokenData) {
			if(!err && tokenData) {
				callback(200, tokenData);
			} else {
				callback(404);
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'});
	}

};

//Tokens - PUT
//Required data: id, extend
//Optional data: 
handlers._tokens.put = function(data, callback) {
	var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
	var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

	if(id && extend) {
		//lookup the token
		_data.read('tokens', id, function(err, tokenData) {
			if(!err && tokenData) {
				//check to make sure the token isnt already expired
				if (tokenData.expires > Date.now()) {
					//set the expiration an hour from now
					 tokenData.expires = Date.now() + 1000 * 60 * 60;

					 //store the new updates
					 _data.update('tokens', id, tokenData, function(err) {
					 	if(!err) {
					 		callback(200);
					 	} else {
					 		callback(500, {'Error' : 'Could not update the tokens expiration'});
					 	}
					 });
				} else {
					callback(400, {'Error' : 'The token has already expired, and cannot be extended'});
				}
			} else {
				callback(400, {'Error' : 'Specified token does not exist'});
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field or fields are invalid'});
	}

};

//Tokens - DELETE (logout)
//Required data: id
//Optional data: none
handlers._tokens.delete = function(data, callback) {
	//check that the id is valid 
	var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
	if (id) { 
		//lookup the token
		_data.read('tokens', id, function(err, data) {
			if(!err && data) {
				_data.delete('tokens', id, function(err) {
					if (!err) {
						callback(200);
					} else {
						callback(500, {'Error' : 'Could not delete the specified token'});
					}
				});
			} else {
				callback(400, {"Error" : "Could not find the specified token"});;
			}
		});
	} else {
		callback(400, {'Error' : 'Missing required field'});
	}
};


// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
	//lookup the token
	_data.read('tokens', id, function(err, tokenData) {
		if(!err && tokenData) {
			//check that the token is for the given user and has not expired 
			if(tokenData.phone == phone && tokenData.expires > Date.now()) {
				callback(true);
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
};


// Checks Service
handlers.checks = function(data, callback) {
	var acceptableMethods = ['post', 'get', 'put', 'delete'];
	if(acceptableMethods.indexOf(data.method) > -1) {
		handlers._checks[data.method](data, callback);
	} else {
		callback(405);
	}
};

//Container for checks method
handlers._checks = {};

// Checks - POST
// Requried data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: nonde

handlers._checks.post = function(data, callback) {
	// validate inputs 
	var protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
	var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
	var method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
	var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
	var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

	if (protocol && url && method && successCodes && timeoutSeconds) {
		// get the token from the headers
		var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

		// lookup the user by reading the token
		_data.read('tokens', token, function(err, tokenData) {
			if(!err && tokenData) {
				var userPhone = tokenData.phone;

				//look up the user data
				_data.read('users', userPhone, function(err, userData) {
					if(!err && userData) {
						var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
						// verify user has less than max checks per user
						if (userChecks.length < config.maxChecks) {
							// create a random id for the check
							var checkId = helpers.createRandomString(20);

							//create the check object, and include the users phone
							var checkObject = {
								'id' : checkId,
								'userPhone' : userPhone,
								'protocol' : protocol,
								'url' : url,
								'method' : method,
								'successCodes' : successCodes,
								'timeoutSeconds' : timeoutSeconds
							};

							//save the object
							_data.create('checks', checkId, checkObject, function(err) {
								if(!err) {
									// add the check id to the users object
									userData.checks = userChecks;
									userData.checks.push(checkId);

									//save the new user data
									_data.update('users', userPhone, userData, function(err) {
										if(!err) {
											// return the data about the new check to the requester 
											callback(200, checkObject);
										} else {
											callback(500, {'Error' : 'Could not update the user with the new check'});
										}
									});

								} else {
									callback(500, {'Error' : 'Could not create the new check'});
								}
							});

						} else {
							callback(400, {'Error' : 'User already has the maximum number of checks ('+config.maxChecks+')'});
						}

					} else {
						callback(403);
					}
				});
			} else {
				callback(403); //not authorized
			}
		});


	} else {
		callback(400, {'Error' : 'Missing required inputs, or inputs are invalid'});
	}

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