import { handler } from '../lambda/getProductsById';
import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { IProducts } from '../types/products';
import { HttpStatus } from '../types/statusCodes';
describe('getProductsById Handler', () => {
  const products: IProducts[] = [
    {
      id: '1',
      title: 'Modern Sofa',
      description: 'A stylish and comfortable modern sofa',
      price: 799.99,
    },
  ];

  beforeEach(() => {
    process.env.PRODUCTS = JSON.stringify(products);
  });

  afterEach(() => {
    delete process.env.PRODUCTS;
  });

  it('should return statusCode 200 if a product under certain id is found', async () => {
    const event: APIGatewayProxyEvent = {
      pathParameters: {
        productId: '1',
      },
    } as any;

    const result = (await handler(
      event,
      {} as any,
      {} as any
    )) as APIGatewayProxyResult;
    if (!result) return;
    expect(result.statusCode).toBe(HttpStatus.OK);
    expect(JSON.parse(result.body)).toEqual(products[0]);
  });

  it('should return statusCode 404 if a product under certain id is not found', async () => {
    const event: APIGatewayProxyEvent = {
      pathParameters: {
        productId: '2',
      },
    } as any;

    const result = (await handler(
      event,
      {} as any,
      {} as any
    )) as APIGatewayProxyResult;
    if (!result) return;
    expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
  });
});
