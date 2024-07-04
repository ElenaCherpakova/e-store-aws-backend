import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import {
  successResponse,
  errorResponse,
} from './helpers/handlerResponse';
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { IProducts } from '../types/products';
import { IStock } from '../types/stock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const PRODUCTS_TABLE = 'Products';
const STOCKS_TABLE = 'Stocks';
const AWS_REGION = 'ca-central-1';

const dynamodbClient = new DynamoDBClient({
  region: AWS_REGION,
});
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamodbClient);

export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    // Scan the products table to get all products
    const productsResult = await dynamoDbDocumentClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE,
      })
    );

    const products: IProducts[] =
      (productsResult.Items as unknown as IProducts[]) || [];

    if (products.length === 0) {
      return successResponse([]);
    }

    // Fetch stock data for each product using QueryCommand
    const productListPromises = products.map(async (product) => {
      const stocksResult = await dynamoDbDocumentClient.send(
        new QueryCommand({
          TableName: STOCKS_TABLE,
          KeyConditionExpression: 'product_id = :product_id',
          ExpressionAttributeValues: {
            ':product_id': product.id,
          },
        })
      );

      const stocks: IStock | undefined = stocksResult.Items
        ? (stocksResult.Items[0] as unknown as IStock)
        : undefined;

      return {
        ...product,
        count: stocks?.count ?? 0,
      };
    });

    const productList = await Promise.all(productListPromises);
  

    return successResponse(productList);
  } catch (err) {
    console.error('Error fetching products:', err);
    return errorResponse({
      message: 'Internal error happened',
    });
  }
};
