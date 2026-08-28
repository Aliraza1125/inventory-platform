/** Extracts a human-readable message from a rejected thunk's payload, whatever shape it arrives in. */
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && err.message) {
    return String(err.message);
  }
  return 'Something went wrong. Please try again.';
}
