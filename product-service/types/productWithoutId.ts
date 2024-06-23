import { IProducts } from "./products";

export type ProductWithoutId = Omit<IProducts, 'id'> & { count: number };
