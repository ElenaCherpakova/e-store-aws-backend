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
    const importProductsFileResource = api.root.addResource('import');
    const methodOptions: apigateway.MethodOptions = {
      requestParameters: {
        'method.request.querystring.name': true,
      },
    };
    importProductsFileResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(importProductsFileLambda),
      methodOptions
    );

    // Define the SQS queue

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
