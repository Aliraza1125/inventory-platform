import { API_BASE_URL } from '@/consts/config';
import fetchGet from '@/utilities/fetchGet';
import fetchPost from '@/utilities/fetchPost';
import type { Product, ProductDetail } from '@/types';

const BASE = `${API_BASE_URL}/inventory`;

export const getProducts = async (): Promise<Product[]> => fetchGet<Product[]>(BASE);

export const getProduct = async (id: string): Promise<ProductDetail> => fetchGet<ProductDetail>(`${BASE}/${id}`);

export const createProduct = async (product: {
  name: string;
  sku: string;
  description?: string;
  quantity: number;
  price: number;
}): Promise<Product> => fetchPost<Product>(BASE, {}, product);

export const restockProduct = async (id: string, quantity: number): Promise<Product> =>
  fetchPost<Product>(`${BASE}/${id}/restock`, {}, { quantity });
