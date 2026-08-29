import { API_BASE_URL } from '@/consts/config';
import fetchGet from '@/utilities/fetchGet';
import type { InventoryTransaction } from '@/types';

const BASE = `${API_BASE_URL}/sales`;

export const getSales = async (): Promise<InventoryTransaction[]> => fetchGet<InventoryTransaction[]>(BASE);
