import { randomUUID } from 'crypto';
import { IProducts } from '../types/products';

export const mockProductsData: IProducts[] = [
  {
    id: randomUUID(),
    title: 'TV stand',
    description: 'A modern TV stand',
    price: 59.99,
  },
  {
    id: randomUUID(),
    title: 'Office Chair',
    description: 'Ergonomic office chair',
    price: 350.00,
  },
  {
    id: randomUUID(),
    title: 'Queen Size Bed',
    description: 'Queen size bed with memory foam mattress',
    price: 1500.00,
  },
  {
    id: randomUUID(),
    title: 'Queen Bed Frame',
    description: 'A sturdy queen bed frame',
    price: 499.99,
  },
  {
    id: randomUUID(),
    title: 'Office Desk',
    description: 'A spacious office desk',
    price: 299.99,
  },
  {
    id: randomUUID(),
    title: 'Bookshelf',
    description: 'A versatile bookshelf',
    price: 199.99,
  },
  {
    id: randomUUID(),
    title: 'Night stand',
    description: 'A fabulous night stand',
    price: 99.99,
  },
];
