const BASE_MS = 1000;
const CAP_MS = 10_000;

export function backoffDelay(attempt: number): number {
  return Math.min(CAP_MS, BASE_MS * 2 ** attempt);
}
