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

export async function deleteDrawing(id: string) {
  const list = getAllDrawings().filter((d) => d.id !== id);
  // make the api call to delete the durable object
  const resp = await fetch("https:/ycalidraw.aryan-s-nag.workers.dev/api/delete/" + id, {
    // const resp = await fetch("http://localhost:5173/api/delete/" + id, {
    method: "DELETE"
  })
  console.log(resp)
  console.log(resp.json())
  saveAllDrawings(list);

}
