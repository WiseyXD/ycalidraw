// utils/drawingsManager.ts

export type DrawingMeta = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "ycal_drawings";

export function getAllDrawings(): DrawingMeta[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveAllDrawings(list: DrawingMeta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function createDrawing(name: string = "Untitled"): DrawingMeta {
  const id = crypto.randomUUID();
  const now = Date.now();

  const newDrawing: DrawingMeta = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
  };

  const existing = getAllDrawings();
  existing.push(newDrawing);
  saveAllDrawings(existing);

  return newDrawing;
}

export function updateDrawingTimestamp(id: string) {
  const list = getAllDrawings();
  const updated = list.map((d) =>
    d.id === id ? { ...d, updatedAt: Date.now() } : d
  );
  saveAllDrawings(updated);
}

export function upsertDrawing(meta: DrawingMeta) {
  const list = getAllDrawings();
  const idx = list.findIndex((d) => d.id === meta.id);
  if (idx === -1) {
    list.push(meta);
  } else {
    list[idx] = { ...list[idx], ...meta };
  }
  saveAllDrawings(list);
}

export async function deleteDrawing(id: string) {
  saveAllDrawings(getAllDrawings().filter((d) => d.id !== id));
  await fetch(`/api/delete/${id}`, { method: "DELETE" });
}
