'use strict';

const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');

const hookUrl = process.env.slackHookURL;
const slackChannel = process.env.slackChannel
const dynamoDBTable = process.env.dynamoDBTable

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
            "text": ":exclamation: Cloudformation stack deleted by scheduled event :exclamation:",
            "attachments": [
            {
                "text": stack + " stack has been triggered for deletion.",
                "fallback": "Cloudformation to delete",
                "callback_id": "hold",
                "color": "#e50000",
                "attachment_type": "default",
            }
        ]
    };

    postMessage(slackMessage, (response) => {
        if (response.statusCode < 400) {
            console.info('Message posted successfully');
            //callback(null);
        } else if (response.statusCode < 500) {
            console.error(`Error posting message to Slack API: ${response.statusCode} - ${response.statusMessage}`);
            callback(null);  // Don't retry because the error is due to a problem with the request
        } else {
            // Let Lambda retry
            callback(`Server error when processing message: ${response.statusCode} - ${response.statusMessage}`);
        }
    });
}

function queryDynamoDB(){
 var dynamodb = new AWS.DynamoDB({});
  var params = {
  TableName: dynamoDBTable
 };
 dynamodb.scan(params, function(err, data) {
   if (err) console.log(err, err.stack); // an error occurred
   else
     {
         for(var i = 0; i < data.Items.length; i++){
            console.log(data.Items[i].stackname.S + " retention: " + data.Items[i].retention.BOOL);
						deleteStack(data.Items[i].stackname.S, data.Items[i].retention.BOOL);
         }
     }
 });
}

function deleteStack(stackname, retention){
 var cloudformation = new AWS.CloudFormation({});
 if (retention === false ){
			 var params = {
		  	StackName: stackname /* required */
			};
		cloudformation.deleteStack(params, function(err, data) {
		  if (err) console.log(err, err.stack); // an error occurred
		  else
			processEvent(stackname);
			console.log(data);           // successful response
		});
	 console.log("Stack " + stackname + "will be deleted");
 }
 deleteRecord(stackname);
}

function deleteRecord(stack){
 var dynamodb = new AWS.DynamoDB({});
 var params = {
  TableName: dynamoDBTable,
  Key: {
    "stackname": {
      S: stack
    }
 }
 };
 dynamodb.deleteItem(params, function(err, data) {
   if (err) console.log(err, err.stack); // an error occurred
   else console.log("Record " + stack + " deleted"); //successful response;
 });
}

exports.handler = (event, context, callback) => {
    queryDynamoDB();
};
