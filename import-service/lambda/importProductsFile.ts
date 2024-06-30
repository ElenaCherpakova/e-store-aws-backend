import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};
export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const fileName = event.queryStringParameters?.name;
  if (!fileName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'The file name is required' }),
      headers,
    };
  }

  const bucketName = process.env.BUCKET_NAME;
  const params = {
    Bucket: bucketName,
    Key: `uploaded/${fileName}`,
    ContentType: 'text/csv',
  };

  try {
    const url = await getSignedUrl(s3, new PutObjectCommand(params), {
      expiresIn: 3600,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ url }),
      headers,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
      headers,
    };
  }
};
