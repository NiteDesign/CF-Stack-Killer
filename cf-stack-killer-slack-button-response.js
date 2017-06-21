'use strict';

const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');

const slackChannelID = process.env.slackChannelID
const dynamoDBTable = process.env.dynamoDBTable

function postMessage(message, response_url, callback) {
    const body = JSON.stringify(message);
    const options = url.parse(response_url);
    options.method = 'POST';
    options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    };

    const postReq = https.request(options, (res) => {
        const chunks = [];
        res.setEncoding('utf8');
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
            if (callback) {
                callback({
                    body: chunks.join(''),
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                });
            }
        });
        return res;
    });

    postReq.write(body);
    postReq.end();
}

function processEvent(event, callback) {
    const slackMessage = {
	"team":{
		"id":process.env.slackTeamID,
		"domain":process.env.slackDomain
	},
	"channel":{
		"id":slackChannelID,
		"name":"privategroup"
	},
    "attachments": [
            {
                "pretext": ":exclamation: " + event.actions[0].value + " stack will not be removed :exclamation:",
                "fallback": "Keep stack",
                "callback_id": "wait",
                "color": "#0ec940",
                "attachment_type": "default",
		 "fields": [
                {
                    "value": ":white_check_mark: <@" + event.user.id + "> approved stack retention.",
                    "short": true
                }
            ]
		}
        ]
}

    postMessage(slackMessage, event.response_url, (response) => {
        if (response.statusCode < 400) {
            updateDynamoDB(event.actions[0].value);

        } else if (response.statusCode < 500) {
            console.error(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
            callback(null);  // Don't retry because the error is due to a problem with the request
        } else {
            // Let Lambda retry
            callback(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`);
        }
    });
}

function updateDynamoDB(stack) {
 console.log(stack);
	 var dynamoDB = new AWS.DynamoDB({});
	 var params = {
	 Item: {
		"stackname": {
			S: stack
		 },
		"retention": {
			BOOL: true
		 },
	 },
	 ReturnConsumedCapacity: "NONE",
	 TableName: dynamoDBTable
	};
	dynamoDB.putItem(params, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
	});
}


exports.handler = (event, context, callback) => {
    processEvent(event, callback);
};
