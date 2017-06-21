'use strict';

const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');

const hookUrl = process.env.slackHookURL;
const slackChannel = process.env.slackChannel;
const dynamoDBTable = process.env.dynamoDBTable;

function postMessage(message, callback) {
    const body = JSON.stringify(message);
    const options = url.parse(hookUrl);
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

function processEvent(stack, callback) {
    const slackMessage = {
            "channel": slackChannel,
            "text": ":exclamation: Cloudformation stack to be removed :exclamation:",
            "attachments": [
            {
                "text": stack + " stack will be removed at 5:00pm",
                "fallback": "Cloudformation to delete",
                "callback_id": "hold",
                "color": "#e50000",
                "attachment_type": "default",
                "actions": [
                    {
                        "name": "do not delete",
                        "text": "do not delete",
                        "type": "button",
                        "value": stack
                    }
                ]
            }
        ]
    }

    postMessage(slackMessage, (response) => {
        if (response.statusCode < 400) {
			updateDynamoDB(stack);
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
	 var dynamoDB = new AWS.DynamoDB({});
	 var params = {
	 Item: {
		"stackname": {
			S: stack
		 },
		"retention": {
			BOOL: false
		 },
	 },
	 ReturnConsumedCapacity: "NONE",
	 TableName: dynamoDBTable
	};
	dynamoDB.putItem(params, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
	});
}

function getStacks() {
		var cloudformation = new AWS.CloudFormation({});
		var params = {
	  StackStatusFilter: [
	    "CREATE_COMPLETE",
			"UPDATE_COMPLETE"
	  ]
	};
	cloudformation.listStacks(params, function(err, data) {
	  if (err) console.log(err, err.stack); // an error occurred
	  else
			for(var i = 0; i < data.StackSummaries.length; i++){
				if(data.StackSummaries[i].StackName.indexOf(process.env.stackName) > -1 ){
					processEvent(data.StackSummaries[i].StackName);
				}
			}
	});
}

exports.handler = (event, context, callback) => {
		getStacks();
};
