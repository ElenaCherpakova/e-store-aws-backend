import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = s3.Bucket.fromBucketName(
      this,
      'ImportBucket',
      'elena-shop-import-bucket'
    );

    // import BasicAuthorizerArn Lambda fn
    const basicAuthorizerArn = cdk.Fn.importValue('BasicAuthorizerArn');

    const basicAuthorizer = lambda.Function.fromFunctionAttributes(
      this,
      'ImportedBasicAuthorizer',
      {
        functionArn: basicAuthorizerArn,
        sameEnvironment: true
      }
    );

    // Define the Lambda function importProductsFile
    const importProductsFileLambda = new lambda.Function(
      this,
      'importProductsFile',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
        handler: 'importProductsFile.handler',
        environment: {
          BUCKET_NAME: importBucket.bucketName,
        },
      }
    );

    importBucket.grantReadWrite(importProductsFileLambda);

    const api = new apigateway.RestApi(this, 'importApi', {
      restApiName: 'ImportApi',
      cloudWatchRole: true,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const authorizer = new apigateway.TokenAuthorizer(
      this,
      'APIGatewayAuthorizer',
      {
        handler: basicAuthorizer,
        identitySource: apigateway.IdentitySource.header('Authorization'),
      }
    );

    const responseHeaders = {
      'Access-Control-Allow-Origin': "'*'",
      'Access-Control-Allow-Headers': "'*'",
    };
    // configure Gateway Response for 401 and 403 errors
    api.addGatewayResponse('UnauthorizedResponse', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders,
      templates: {
        'application/json': JSON.stringify({
          message: 'Unauthorized',
        }),
      },
      statusCode: '401',
    });

    api.addGatewayResponse('AccessDeniedResponse', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders,
      templates: {
        'application/json': JSON.stringify({
          message: 'Access Denied',
        }),
      },
      statusCode: '403',
    });

    const importProductsFileResource = api.root.addResource('import');

    const methodOptions: apigateway.MethodOptions = {
      requestParameters: {
        'method.request.querystring.name': true,
      },
      authorizer,
      authorizationType: apigateway.AuthorizationType.CUSTOM,
    };
    importProductsFileResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(importProductsFileLambda),
      methodOptions
    );
    // import catalogItemsQueueArn from product-service
    const catalogItemsQueueArn = cdk.Fn.importValue('CatalogItemsQueueArn');
    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      'catalogItemsQueue',
      catalogItemsQueueArn
    );

    const importFileParser = new lambda.Function(this, 'importFileParser', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      handler: 'importFileParser.handler',
      environment: {
        BUCKET_NAME: importBucket.bucketName,
        SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
    });
    importBucket.grantReadWrite(importFileParser);

    // grant lambda function permission to send msg to the SQS queue
    catalogItemsQueue.grantSendMessages(importFileParser);

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      {
        prefix: 'uploaded/',
      }
    );
  }
}
