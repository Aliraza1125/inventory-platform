import { API_BASE_URL } from '@/consts/config';
import fetchGet from '@/utilities/fetchGet';
import fetchPost from '@/utilities/fetchPost';
import type { InventoryTransaction, POSProviderName, SaleProcessingResult } from '@/types';

const BASE = `${API_BASE_URL}/sales`;

export const getSales = async (): Promise<InventoryTransaction[]> => fetchGet<InventoryTransaction[]>(BASE);

export const simulateSale = async (payload: {
  productId: string;
  posProvider: POSProviderName;
  quantity: number;
}): Promise<SaleProcessingResult> => fetchPost<SaleProcessingResult>(`${BASE}/simulate`, {}, payload);
