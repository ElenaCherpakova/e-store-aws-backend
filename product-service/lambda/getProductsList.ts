import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { IProducts } from '../types/products';
import { successResponse, errorResponse } from './helpers/handlerResponse';

export const handler: APIGatewayProxyHandler =
  async (): Promise<APIGatewayProxyResult> => {
    try {
      const products: IProducts[] = JSON.parse(process.env.PRODUCTS || '[]');
      return successResponse(products);
    } catch (err) {
      return errorResponse({
        message: 'Internal error happened',
      });
    }
  };
