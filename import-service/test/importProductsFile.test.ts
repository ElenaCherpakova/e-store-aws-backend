import { handler } from '../lambda/importProductsFile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('importProductsFile Lambda Function', () => {
  beforeAll(() => {
    process.env.BUCKET_NAME = 'test-bucket';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 error and if name query params is missing', async () => {
    const event = { queryStringParameters: {} } as APIGatewayProxyEvent;
    const result = (await handler(
      event,
      {} as any,
      {} as any
    )) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('The file name is required');
  });

  it('should return 200 / signed URL return if the valid file provided and retrieve successfully', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('url');

    const event = {
      queryStringParameters: { name: 'test.csv' },
    } as unknown as APIGatewayProxyEvent;
    const result = (await handler(
      event,
      {} as any,
      {} as any
    )) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ url: 'url' }));
  });
});
