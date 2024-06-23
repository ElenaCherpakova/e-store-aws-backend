import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

import { IStock } from '../../types/stock';
import { chunkArray } from './util-array';
import { tableExist } from './list-tables';
import { mockProductsData as products } from '../mockData';

const PRODUCTS_TABLE = 'Products';
const STOCKS_TABLE = 'Stocks';
const AWS_REGION = 'ca-central-1';

export const dynamodbClient = new DynamoDBClient({
  region: AWS_REGION,
});
export const dynamoDbDocumentClient =
  DynamoDBDocumentClient.from(dynamodbClient);

const stocks: IStock[] = products.map((product) => ({
  product_id: product.id,
  count: Math.floor(Math.random() * 15),
}));

const batchWriteItems = async (tableName: string, items: any[]) => {
  const batches = chunkArray(items, 25);
  for (const batch of batches) {
    const putRequest = {
      RequestItems: {
        [tableName]: batch.map((item) => ({
          PutRequest: {
            Item: item,
          },
        })),
      },
    };
    const command = new BatchWriteCommand(putRequest);
    try {
      await dynamoDbDocumentClient.send(command);
      console.log(`Batch written to ${tableName}`);
    } catch (error) {
      console.error(error);
      console.error(`Error writing batch to ${tableName}:`, error);
    }
  }
};

const seedTables = async () => {
  const productsTableExists = await tableExist(PRODUCTS_TABLE!);
  const stocksTableExists = await tableExist(STOCKS_TABLE!);

  if (!productsTableExists || !stocksTableExists) {
    console.log('Tables not found. Exiting...');
    return;
  }

  await batchWriteItems(PRODUCTS_TABLE!, products);
  await batchWriteItems(STOCKS_TABLE!, stocks);
};
seedTables();
