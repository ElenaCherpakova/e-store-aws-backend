import { Effect } from 'aws-cdk-lib/aws-iam';

import {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
  APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda';

import * as dotenv from 'dotenv';
dotenv.config();

export const handler: APIGatewayTokenAuthorizerHandler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const authHeader = event.authorizationToken;
  try {
    if (!authHeader) {
      console.log('No auth header found.');

      return generatePolicy('Unauthorized user', Effect.DENY, event.methodArn);
    }
    const encodedCredentials = authHeader.split(' ')[1];
    const decodedCredentials = Buffer.from(
      encodedCredentials,
      'base64'
    ).toString('utf-8');
    console.log('Decoded Credentials:', decodedCredentials);
    const [username, password] = decodedCredentials.split(':');
    console.log('Username:', username);
    console.log('Password:', password);
    const validPassword = process.env[username];
    console.log('Valid Password:', validPassword);

    if (validPassword && validPassword === password) {
      console.log('Credentials are valid.');
      return generatePolicy(username, Effect.ALLOW, event.methodArn);
    } else {
      console.log('Invalid credentials.');
      throw new Error('Invalid credentials');
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);

    return generatePolicy(
      (error as Error).message || 'Unauthorized user',
      Effect.DENY,
      event.methodArn
    );
  }
};

function generatePolicy(
  principalId: string,
  effect: Effect,
  resource: string,
  message?: string
): APIGatewayAuthorizerResult {
  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  };

  const result: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument,
  };

  if (message) {
    result.context = {
      message,
    };
  }
  return result;
}
