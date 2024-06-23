import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const AWS_REGION = 'ca-central-1';

export const dynamodbClient = new DynamoDBClient({
  region: AWS_REGION,
});
export const dynamoDbDocumentClient =
  DynamoDBDocumentClient.from(dynamodbClient);

export const tableExist = async (tableName: string): Promise<boolean> => {
  try {
    const command = new ListTablesCommand({});
    const tables = await dynamodbClient.send(command);
    return tables.TableNames?.includes(tableName) || false;
  } catch (error) {
    console.error(error);
    return false;
  }
};
