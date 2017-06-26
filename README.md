# Lambda-AWS-CF-Stack-Killer
AWS Lambda that notifies via Slack message of Dev CloudFormation stacks to delete EOD to save money.  
Please refer to this post for additional information:  
https://www.nitedesign.com/save-money-delete-your-stacks-using-lambdas-and-interactive-slack-messages  

1. Create a Slack App
2. Copy the Lambda code and Zip each .js file to and individual zip file.
3. Save the 3 zip files to an S3 bucket.
4. Deploy the Cloudformation template, yaml file.
5. Obtain the invoke URL for the API Gateway
6. Update the Slack App enabling interactive messages and provide the invoke URL
