import { handler } from '../lambda/getProductsList';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { IProducts } from '../types/products';

describe('getProductsList Handler', () => {
  const products: IProducts[] = [
    {
      id: '1',
      title: 'Modern Sofa',
      description: 'A stylish and comfortable modern sofa',
      price: 799.99,
    },
    {
      id: '2',
      title: 'Dining Table Set',
      description: 'A contemporary dining table',
      price: 649.99,
    },
  ];

  const event = {} as APIGatewayProxyEvent;

  beforeEach(() => {
    process.env.PRODUCTS = JSON.stringify(products);
  });

  afterEach(() => {
    delete process.env.PRODUCTS;
  });

  it('should return an array of products if they are available', async () => {
    const result = (await handler(
      event,
      {} as any,
      {} as any
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(products);
  });

  it('should return an empty array if no products are available', async () => {
    process.env.PRODUCTS = '[]';

    const result = (await handler(
      event,
      {} as any,
      {} as any
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([]);
  });

  it('should return a 500 error if JSON is invalid', async () => {
    process.env.PRODUCTS = 'invalid json';

    const result = (await handler(
      event,
      {} as any,
      {} as any
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Internal error happened',
    });
  });
});
