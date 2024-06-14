import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import { mockProductsData } from './mockData';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda function for getProductsList
    const getProductsListLambda = new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/lambda')),
      handler: 'getProductsList.handler',
      environment: {
        PRODUCTS: JSON.stringify(mockProductsData),
      },
    });

    // Define the Lambda function for getProductsById
    const getProductsByIdLambda = new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/lambda')),
      handler: 'getProductsById.handler',
      environment: {
        PRODUCTS: JSON.stringify(mockProductsData),
      },
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
    products.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsListLambda)
    );

    const productId = products.addResource('{productId}');
    productId.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsByIdLambda)
    );
  }
}
