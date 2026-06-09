export type ReconcileElement = {
  id: string;
  version: number;
};

export function reconcileElements<T extends ReconcileElement>(
  local: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const el of local) byId.set(el.id, el);
  for (const el of incoming) {
    const existing = byId.get(el.id);
    if (!existing || el.version > existing.version) {
      byId.set(el.id, el);
    }
  }
  return Array.from(byId.values());
}
