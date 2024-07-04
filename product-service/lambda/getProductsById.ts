import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

import { IProducts } from '../types/products';
import { HttpStatus } from '../types/statusCodes';
import {
  successResponse,
  errorResponse,
  response,
} from './helpers/handlerResponse';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { IStock } from '../types/stock';

const PRODUCTS_TABLE = 'Products';
const STOCKS_TABLE = 'Stocks';
const AWS_REGION = 'ca-central-1';

const dynamodbClient = new DynamoDBClient({
  region: AWS_REGION,
});
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamodbClient);

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return response(HttpStatus.BAD_REQUEST, {
        message: 'Product ID is required',
      });
    }

    const productQueryParams = {
      TableName: PRODUCTS_TABLE,
      KeyConditionExpression: 'id = :productId',
      ExpressionAttributeValues: {
        ':productId': productId,
      },
    };

    const productQueryResult = await dynamoDbDocumentClient.send(
      new QueryCommand(productQueryParams)
    );

    const product = productQueryResult.Items?.[0] as IProducts | undefined;
    if (!product) {
      return response(HttpStatus.NOT_FOUND, {
        message: 'Product not found',
      });
    }

    const stockQueryParams = {
      TableName: STOCKS_TABLE,
      KeyConditionExpression: 'product_id = :productId',
      ExpressionAttributeValues: {
        ':productId': productId,
      },
    };

    const stockQueryResult = await dynamoDbDocumentClient.send(
      new QueryCommand(stockQueryParams)
    );
    const stock = stockQueryResult.Items?.[0] as IStock | undefined;

    const productWithStock = {
      ...product,
      count: stock?.count ?? 0,
    };
    return successResponse(productWithStock);
  } catch (err) {
    console.error('Error fetching product', err);
    return errorResponse({ message: 'Internal error' });
  }
};
