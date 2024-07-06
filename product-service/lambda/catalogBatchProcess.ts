import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { SQSEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProductWithoutId } from '../types/productWithoutId';
import { randomUUID } from 'crypto';
import { response } from './helpers/handlerResponse';
import { HttpStatus } from '../types/statusCodes';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const dynamodbClient = new DynamoDBClient({ region: 'ca-central-1' });
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamodbClient);
const snsClient = new SNSClient({ region: 'ca-central-1' });

export const handler = async (
  event: SQSEvent
): Promise<APIGatewayProxyResult> => {
  console.log('SQS event received:', JSON.stringify(event, null, 2));

  const products: ProductWithoutId[] = event.Records.flatMap((record) => {
    const body = JSON.parse(record.body);
    return Array.isArray(body) ? body : [body];
  });

  for (const product of products) {
    const { title, description, price, count } = product;
    const productId = randomUUID();
    try {
      const transactItems = [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE!,
            Item: {
              id: productId,
              title,
              description,
              price,
            },
          },
        },
        {
          Put: {
            TableName: process.env.STOCKS_TABLE!,
            Item: {
              product_id: productId,
              count,
            },
          },
        },
      ];

      const transactionCommand = new TransactWriteCommand({
        TransactItems: transactItems,
      });

      await dynamoDbDocumentClient.send(transactionCommand);
      console.log('TransactWriteCommand successful');

      const snsMessage = `Title: ${title}, Description: ${description}, Price: ${price}, Count: ${count}`;
      console.log('Publishing to SNS:', snsMessage);
      const publishMsg = new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN!,
        Subject: 'New products added',
        Message: snsMessage,
        MessageAttributes: {
          price: {
            DataType: 'Number',
            StringValue: price.toString(),
          },
        },
      });
      await snsClient.send(publishMsg);
      console.log('PublishCommand successful');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error processing product:', product, errorMessage);
    }
  }

  return response(HttpStatus.OK, {
    message: 'Products and stocks processed',
  });
};