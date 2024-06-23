import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
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

    // Grant the Lambda function read access to the DynamoDB table
    const lambdas = [
      getProductsListLambda,
      getProductsByIdLambda,
      createProductLambda,
    ];
    lambdas.forEach((fn) => {
      productsTable.grantReadWriteData(fn);
      stocksTable.grantReadWriteData(fn);
    });

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
