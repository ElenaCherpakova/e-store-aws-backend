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

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const products: IProducts[] = JSON.parse(process.env.PRODUCTS || '[]');
    const productId = event.pathParameters?.productId;

    if (!productId) {
      return response(HttpStatus.BAD_REQUEST, {
        message: 'Product ID is required',
      });
    }

    const product = products.find((p) => p.id === productId);

    if (product) {
      return successResponse(product);  // Return the single product object
    }

    return response(HttpStatus.NOT_FOUND, {
      message: 'Product not found',
    });
  } catch (err) {
    console.log(err);
    return errorResponse({ message: 'Internal error' });
  }
};
