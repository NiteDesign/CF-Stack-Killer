# Lambda-AWS-CF-Stack-Killer

CF-Stack-Killer, is a set of Lambdas that will help remove stacks at the end of the day with a Slack integration to postpone as necessary.  The process goes like this:
1. A Lambda sends message to Slack channel stating which stacks will be deleted based on a query.
2. The Slack message contains a button, 'do not delete', which a developer can request to retain the specified stack.
3. A final Lambda deletes any stacks that have not been requested to retain and sends a notification to Slack.

For complete set of instructions, please refer to this blog post: 
