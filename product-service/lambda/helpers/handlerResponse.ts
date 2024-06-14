import { HttpStatus } from '../../types/statusCodes';
import { HTTPHeaderMethods } from './../../types/methods';
import { APIGatewayProxyResult } from 'aws-lambda';

export const successResponse = (
  payload: any,
  methods?: HTTPHeaderMethods[]
): APIGatewayProxyResult => {
  return response(HttpStatus.OK, payload, methods);
};

export const errorResponse = (
  payload: any,
  methods?: HTTPHeaderMethods[]
): APIGatewayProxyResult => {
  return response(HttpStatus.INTERNAL_SERVER_ERROR, payload, methods);
};

export const response = (
  statusCode: HttpStatus,
  payload: any,
  methods: HTTPHeaderMethods[] = ['GET']
): APIGatewayProxyResult => {
  return {
    statusCode,
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': methods.join(','),
    },
  };
};
