import { API_BASE_URL } from '@/consts/config';
import fetchGet from '@/utilities/fetchGet';
import fetchPost from '@/utilities/fetchPost';
import type { InventoryAllocation, POSConnectionSummary, POSProviderName, SquareCheckoutResult } from '@/types';

const BASE = `${API_BASE_URL}/pos`;
const ALLOCATIONS_BASE = `${API_BASE_URL}/allocations`;

export const getConnections = async (): Promise<POSConnectionSummary[]> =>
  fetchGet<POSConnectionSummary[]>(`${BASE}/connections`);

export const connectProvider = async (provider: POSProviderName): Promise<POSConnectionSummary> =>
  fetchPost<POSConnectionSummary>(`${BASE}/${provider}/connect`);

export const disconnectProvider = async (provider: POSProviderName): Promise<POSConnectionSummary> =>
  fetchPost<POSConnectionSummary>(`${BASE}/${provider}/disconnect`);

export const getAllocations = async (): Promise<InventoryAllocation[]> =>
  fetchGet<InventoryAllocation[]>(ALLOCATIONS_BASE);

export const allocate = async (payload: {
  productId: string;
  posProvider: POSProviderName;
  quantity: number;
}): Promise<InventoryAllocation> => fetchPost<InventoryAllocation>(ALLOCATIONS_BASE, {}, payload);

// Real Square sandbox checkout — creates a genuine Order + Payment on Square's servers.
export const squareCheckout = async (payload: { productId: string; quantity: number }): Promise<SquareCheckoutResult> =>
  fetchPost<SquareCheckoutResult>(`${BASE}/square/checkout`, {}, payload);
