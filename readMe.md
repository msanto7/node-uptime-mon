# Node RESTful API for uptime monitoring Application 
	-lets the user enter a url and sends alerts if it goes down or comes back up 
	-alert users with SMS 

## Functions / Requirements

		1. The API listens on a port and accepts HTTP requests (POST, GET, PUT, DELETE, HEAD)
		2. The API allows a client to connect, then create new user, edit and delete that user 
		3. The API allows users to sign-in..which gives them a token for authentication
		4. The API allows a User to sign-out which invalidates their token. 
		5. Signed-in user should use their token to create a new check (URL)
		6. Signed-in user should be able to edit and delete their checks (limit of 5 checks max).
		7. In the background perform all the checks (once per minute)..send alerts when the state of 	a check changes. 

		Twilio API for SMS alerts. 
		We will be using JSON writing to a file...not an actual MongoDB.

## Resource
Node.js SkillShare Master Class

found at: https://www.skillshare.com/classes/The-Node.js-Master-Class-No-Frameworks-No-NPM-No-Dependencies/187976462