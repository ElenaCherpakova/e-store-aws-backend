import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as eventSource from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';

const PRODUCTS_TABLE = 'Products';
const STOCKS_TABLE = 'Stocks';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const productsTableName = PRODUCTS_TABLE;
    const stocksTableName = STOCKS_TABLE;

    const productsTable = dynamodb.Table.fromTableAttributes(
      this,
      'ProductsTable',
      {
        tableName: productsTableName,
      }
    );

    const stocksTable = dynamodb.Table.fromTableAttributes(
      this,
      'StocksTable',
      {
        tableName: stocksTableName,
      }
    );

    // Define the Lambda function for getProductsList
    const getProductsListLambda = new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/lambda')),
      handler: 'getProductsList.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    // Define the Lambda function for getProductsById
    const getProductsByIdLambda = new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/lambda')),
      handler: 'getProductsById.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    const createProductLambda = new lambda.Function(this, 'createProduct', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/lambda')),
      handler: 'createProduct.handler',
      environment: {
        PRODUCTS_TABLE: productsTable.tableName,
        STOCKS_TABLE: stocksTable.tableName,
      },
    });

    // Create an SQS queue called catalogItemsQueue
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
      value: catalogItemsQueue.queueArn,
      exportName: 'CatalogItemsQueueArn',
    })
    // create an SNS topic for create product
    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: 'CreateProductTopic',
    });
    // add email subscription
    createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription('elena.cherpakova@gmail.com', {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            greaterThan: 150,
          }),
        },
      })
    );

    createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription('elena@jobjunxion.com', {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            lessThanOrEqualTo: 150,
          }),
        },
      })
    );

    const catalogBatchProcessLambda = new lambda.Function(
      this,
      'CatalogBatchProcess',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(path.join(__dirname, '../dist/lambda')),
        handler: 'catalogBatchProcess.handler',
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
          SNS_TOPIC_ARN: createProductTopic.topicArn,
          SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
        },
      }
    );

    catalogBatchProcessLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'sns:Publish',
          'sqs:SendMessage',
          'sqs:ReceiveMessage',
          'sqs:DeleteMessage',
          'sqs:GetQueueAttributes',
        ],
        resources: [catalogItemsQueue.queueArn, createProductTopic.topicArn],
      })
    );
    // Grant the Lambda function read access to the DynamoDB table
    const lambdas = [
      getProductsListLambda,
      getProductsByIdLambda,
      createProductLambda,
      catalogBatchProcessLambda,
    ];
    lambdas.forEach((fn) => {
      productsTable.grantReadWriteData(fn);
      stocksTable.grantReadWriteData(fn);
    });

    catalogBatchProcessLambda.addEventSource(
      new eventSource.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );
    catalogBatchProcessLambda.addEnvironment(
      'SNS_TOPIC_ARN',
      createProductTopic.topicArn
    );

    catalogItemsQueue.grantConsumeMessages(catalogBatchProcessLambda);
    createProductTopic.grantPublish(catalogBatchProcessLambda);
    // Define the API Gateway resource
    const api = new apigateway.RestApi(this, 'productsApi', {
      restApiName: 'ProductService',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    const products = api.root.addResource('products');
    const productId = products.addResource('{productId}');

    const productsLambdaApi = new apigateway.LambdaIntegration(
      getProductsListLambda
    );
    const productIdLambdaApi = new apigateway.LambdaIntegration(
      getProductsByIdLambda
    );
    const createProductLambdaApi = new apigateway.LambdaIntegration(
      createProductLambda
    );
    products.addMethod('GET', productsLambdaApi);
    productId.addMethod('GET', productIdLambdaApi);

    const productModel = new apigateway.Model(
      this,
      'createProductModelValidator',
      {
        restApi: api,
        contentType: 'application/json',
        description: 'To validate the request body for adding product into db',
        modelName: 'productModel',
        schema: {
          type: apigateway.JsonSchemaType.OBJECT,
          properties: {
            title: { type: apigateway.JsonSchemaType.STRING, minLength: 1 },
            description: { type: apigateway.JsonSchemaType.STRING },
            price: { type: apigateway.JsonSchemaType.NUMBER, minimum: 0 },
            count: { type: apigateway.JsonSchemaType.NUMBER, minimum: 0 },
          },
          required: ['title', 'description', 'price', 'count'],
        },
      }
    );
    api.addGatewayResponse('badRequestResponse', {
      type: apigateway.ResponseType.BAD_REQUEST_BODY,
      statusCode: '400',
      templates: {
        'application/json': JSON.stringify({
          message: '$context.error.messageString',
          issues: ['$context.error.validationErrorString'],
        }),
      },
    });

    products.addMethod('POST', createProductLambdaApi, {
      requestValidator: new apigateway.RequestValidator(
        this,
        'createProductBodyValidator',
        {
          restApi: api,
          validateRequestBody: true,
          requestValidatorName: 'createProductBodyValidator',
        }
      ),
      requestModels: {
        'application/json': productModel,
      },
    });
  }
}
