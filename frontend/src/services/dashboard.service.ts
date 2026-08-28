import { API_BASE_URL } from '@/consts/config';
import fetchGet from '@/utilities/fetchGet';
import type { DashboardSummary } from '@/types';

const BASE = `${API_BASE_URL}/dashboard`;

export const getDashboardSummary = async (): Promise<DashboardSummary> =>
  fetchGet<DashboardSummary>(`${BASE}/summary`);
