import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

import { HttpStatus } from '../types/statusCodes';
import {
  errorResponse,
  response,
} from './helpers/handlerResponse';
import { ProductWithoutId } from '../types/productWithoutId';
import {
  DynamoDBClient,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

import { randomUUID } from 'crypto';

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
    if (event.httpMethod !== 'POST') {
      return response(HttpStatus.METHOD_NOT_ALLOWED, {
        message: 'Method not allowed',
      });
    }
    const productData: ProductWithoutId = JSON.parse(event.body!);
    const { title, description, price, count } = productData;

    if (!title || !description || price === undefined || count === undefined) {
      console.error('Missing required fields:', {
        title,
        description,
        price,
        count,
      });

      return response(HttpStatus.BAD_REQUEST, {
        message: 'Title OR description OR Price OR count is required',
      });
    }

    if (count < 0) {
      console.error('Count cannot be negative:', count);
      return response(HttpStatus.BAD_REQUEST, {
        message: 'Count cannot be negative',
      });
    }

    const productId = randomUUID();
    const transactParams = {
      TransactItems: [
        {
          Put: {
            TableName: PRODUCTS_TABLE,
            Item: marshall({
              id: productId,
              title,
              description,
              price,
            }),
          },
        },
        {
          Put: {
            TableName: STOCKS_TABLE,
            Item: marshall({
              product_id: productId,
              count,
            }),
          },
        },
      ],
    };

    await dynamoDbDocumentClient.send(
      new TransactWriteItemsCommand(transactParams)
    );

    return response(HttpStatus.OK, {
      message: `Product with following ID ${productId} has been successfully created`,
    });
  } catch (err) {
    console.log(err);
    return errorResponse({ message: 'Internal error' });
  }
};
