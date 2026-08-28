import requestHeaders from './requestHeaders';
import type { ApiErrorBody } from '@/types';

const fetchGet = async <T>(url: string, headers: Record<string, string> = {}): Promise<T> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: requestHeaders(headers),
  });
  const json = (await response.json().catch(() => null)) as { data?: T } & Partial<ApiErrorBody>;
  if (!response.ok) {
    throw json?.error ?? { code: 'UNKNOWN_ERROR', message: `Request failed with status ${response.status}` };
  }
  return json.data as T;
};

export default fetchGet;
