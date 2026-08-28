import requestHeaders from './requestHeaders';
import type { ApiErrorBody } from '@/types';

const fetchPost = async <T>(
  url: string,
  headers: Record<string, string> = {},
  body: unknown = {},
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
): Promise<T> => {
  const response = await fetch(url, {
    method,
    headers: requestHeaders(headers),
    body: JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const json = (await response.json().catch(() => null)) as { data?: T } & Partial<ApiErrorBody>;
  if (!response.ok) {
    throw json?.error ?? { code: 'UNKNOWN_ERROR', message: `Request failed with status ${response.status}` };
  }
  return json.data as T;
};

export default fetchPost;
