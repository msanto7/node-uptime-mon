/*
 * Create and export config variables 
 * 
 */

 // Container for all the environments
 var environments = {};

 // Default staging env
 environments.staging = {
 	'httpPort' : 3000,
 	'httpsPort' : 3001,
 	'envName' : 'staging',
 	'hashingSecret' : 'thisIsASecret',
 	'maxChecks' : 5
 };

 //Productin 
 environments.production = {
 	'httpPort' : 5000,
 	'httpsPort' : 5001,
 	'envName' : 'production',
 	'hashingSecret' : 'thisIsAlsoASecret',
 	'maxChecks' : 5
 };

 // Which environment wass passed as cmdLine arguement??
 var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

 // check that the current env is from the above...if not use default
 var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;



// Export Module
module.exports = environmentToExport;
