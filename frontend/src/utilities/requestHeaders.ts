export default function requestHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...headers,
  };
}
