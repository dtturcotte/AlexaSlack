

var AWS = require('aws-sdk');
var qs = require('querystring');
var token, kmsEncyptedToken;
var request = require('request');
var Firebase = require('firebase');

exports.handler = function (event, context, callback) {

  /*
    Handle incoming Slack requests to store user JSON
  */
  processEvent(event, context);

};

/*
	Slack username / nickname hash
 */
function getUser () {

	return {
		'danturcotte' : 'dan',
		'zar' : 'cesar',
		'simonsays' : 'simon',
		'seanorelli' : 'sean',
		'kbot' : 'kirill',
		'kbeimfohr' : 'katie'
	}

};


function processEvent(event, context, callback) {

    var params = qs.parse(event.postBody),
		real_name = (getUser()[params.user_name]) ? getUser()[params.user_name] : params.user_name,
    	command = params.command,
    	channel = params.channel_name,
    	commandText = params.text,
		lunch = false,
		lunch_admin = 'kbeimfohr';

	var parseIt = commandText.split(' ');

	if (parseIt[0] === 'lunch' && (params.user_name === lunch_admin || params.user_name === 'danturcotte')) {
		lunch = true;
	}

	var data = {
		"name": real_name,
		"text": commandText
	};

	var options = {
		uri : 'https://intense-torch-7177.firebaseio.com/.json',
		method : 'POST',
		form : JSON.stringify(data)
	};

	request(options).on('response', function (res) {
		var message = {
			"text" : (lunch) ? 'Thanks ' + real_name + ' for logging lunch.' : 'Thank you for sharing your feelings with me.',
			"response_type" : "ephemeral",
			"attachments" : [
				{
					"text": (lunch) ? 'Come back soon!' : 'To find out how others are doing, say "Alexa, ask igor how so-and-so is doing."'
				}
			]
		};
		context.succeed(message);
	}).on('error', function (err) {
		context.fail('ERR: ', err);
	});
};
