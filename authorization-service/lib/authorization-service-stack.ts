import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubAccountLogin = process.env.GITHUB_ACCOUNT_LOGIN;
    console.log("githubAccountLogin:", githubAccountLogin);

    if (!githubAccountLogin) {
      throw new Error('GITHUB_ACCOUNT_LOGIN environment variable is not defined');
    }

    const environment = {
      [githubAccountLogin]: 'TEST_PASSWORD',
    };

    const basicAuthorizer = new lambda.Function(this, 'BasicAuthorizer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      handler: 'basicAuthorizer.handler',
      environment,
    });

    basicAuthorizer.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
      value: basicAuthorizer.functionArn,
      exportName: 'BasicAuthorizerArn',
    });
  }
}
