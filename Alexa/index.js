var https = require('https');
var reprompts = [
	'Need anything else? I\'ve got stuff to do...',
	'I\'ll be taking care of things if you need me',
	'Crickets...',
	'Eventually you will think of something'
];

exports.handler = function (event, context, callback) {
	try {
		console.log("event.session.application.applicationId TEST=" + event.session.application.applicationId);

		if (event.session.new) {
			onSessionStarted({requestId: event.request.requestId}, event.session);
		}

		if (event.request.type === "LaunchRequest") {

			onLaunch(event.request,
				event.session,
				function callback(sessionAttributes, speechletResponse) {
					context.succeed(buildResponse(sessionAttributes, speechletResponse));
				});
		}

		else if (event.request.type === "IntentRequest") {

			console.log('LAUNCH', event.session.user);
			onIntent(event.request,
				event.session,
				function callback(sessionAttributes, speechletResponse) {
					context.succeed(buildResponse(sessionAttributes, speechletResponse));
				});

		} else if (event.request.type === "SessionEndedRequest") {
			onSessionEnded(event.request, event.session);
			context.succeed();
		}
	} catch (e) {
		context.fail("Exception: " + e);
	}
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
	console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
	getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {

	console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId);

	var intent = intentRequest.intent,
		intentName = intentRequest.intent.name;

	if ("LunchIntent" === intentName) {
		sayLunch(intent, session, callback);
	} else if ("CheckingInIntent") {
		getWelcomeResponse(intent, session, callback);
	}
	else if ("AMAZON.HelpIntent" === intentName) {
		getWelcomeResponse(intent, session, callback);
	} else {
		throw "Invalid intent";
	}
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
	console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
}

function getWelcomeResponse(intent, session, callback) {
	// If we wanted to initialize the session to have some attributes we could add those here.
	var sessionAttributes = {};
	var cardTitle = "Welcome";

	https.get('https://intense-torch-7177.firebaseio.com/.json', function (res)  {

		var data = '';

		res.on('data', function (chunk) {
			data += chunk;
		});

		res.on('end', function () {
			var jsonData = JSON.parse(data),
				user = null;

			for (var obj in jsonData) {
				if (jsonData[obj].name && (intent.slots && intent.slots.Employee.value)) {
					if (jsonData[obj].name.toLowerCase() === intent.slots.Employee.value.toLowerCase()) {
						user = jsonData[obj];
					}
				}
			}

			var rand = Math.floor(Math.random() * (reprompts.length));

			var speechOutput = (user) ? user.name + " wants you to know: " + user.text : 'I couldn\'t find that person.';
			var repromptText = reprompts[rand];
			var shouldEndSession = false;

			sessionAttributes = {
				'speechOutput': repromptText,
				'repromptText': repromptText,
				'questions': 'some questions'
			};

			callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
		});

	}).on('error', function (e)  {
		console.log('Got error', e);
	});

}

function getDay (index) {

	var datetime = new Date();

	//starting on Sunday at 0...  Monday is 1
	var day_index = datetime.getDay();

	var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

	// If tomorrow goes past array end... restart to beginning of week on Sunday
	if ((day_index + index) > days.length-1) {
		day_index = 0;
	}
	// Or if yesterday goes past array start... restart to end of week on Saturday
	else if ((day_index + index) < 0) {
		day_index = days.length-1;
	}
	// Otherwise just add the index
	else {
		return days[day_index+index];
	}
	return days[day_index];
}

function sayLunch(intent, session, callback) {

	var day = (intent.slots.Day && intent.slots.Day.value) ? intent.slots.Day.value.toLowerCase() : 'today';

	if (day === 'today') {
		day = getDay(0);
	} else if (day === 'tomorrow') {
		day = getDay(1);
	} else if (day === 'yesterday') {
		day = getDay(-1);
	}

	https.get('https://intense-torch-7177.firebaseio.com/.json', function (res)  {

		var data = '';

		res.on('data', function (chunk) {
			data += chunk;
		});

		res.on('end', function () {

			var jsonData = JSON.parse(data),
				lunch = null;

			for (var obj in jsonData) {
				if (jsonData[obj].name && (jsonData[obj].name.toLowerCase() === 'katie' || jsonData[obj].name.toLowerCase() === 'dan')) {
					lunch = jsonData[obj].text.toLowerCase();
				}
			}

			lunch = lunch.split(' ').splice(1, lunch.length-1).join(' ').split(/[:,] /g);

			var default_text = 'No lunch specified!';
			var lunch_obj = {
				'sunday' : default_text,
				'monday' : default_text,
				'tuesday' : default_text,
				'wednesday' : default_text,
				'thursday' : default_text,
				'friday' : default_text,
				'saturday' : default_text
			};


			for (var i = 0; i < lunch.length; i++) {
				if (lunch_obj.hasOwnProperty(lunch[i])) {
					lunch_obj[lunch[i]] = lunch[++i];
				}
			}

			var sessionAttributes = {};
			var cardTitle = "Welcome";
			var speechOutput = "Lunch for " + day + " is " + lunch_obj[day];
			var rand = Math.floor(Math.random() * (reprompts.length-1));
			var repromptText = reprompts[rand];
			var shouldEndSession = true;

			callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
		});

	}).on('error', function (e)  {
		console.log('Got error', e);
	});
}

// --------------- Helpers that build all of the responses -----------------------
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
	return {
		outputSpeech: {
			type: "PlainText",
			text: output
		},
		card: {
			type: "Simple",
			title: "SessionSpeechlet - " + title,
			content: "SessionSpeechlet - " + output
		},
		reprompt: {
			outputSpeech: {
				type: "PlainText",
				text: repromptText
			}
		},
		shouldEndSession: shouldEndSession
	};
}

function buildResponse(sessionAttributes, speechletResponse) {
	return {
		version: "1.0",
		sessionAttributes: sessionAttributes,
		response: speechletResponse
	};
}

