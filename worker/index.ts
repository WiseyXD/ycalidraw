import { Hono } from "hono";
import type { Env } from "./durable-objects";
export { YcalidrawWebSocketServer } from "./durable-objects";

const app = new Hono<{ Bindings: Env }>();


app.get("/api/ws/:drawingId", async (c) => {
  const drawingId = c.req.param("drawingId");
  const upgradeHeader = c.req.header("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.text("Expected websocket", 400);
  }
  let id = c.env.DURABLE_OBJECT.idFromName(drawingId);
  let stub = c.env.DURABLE_OBJECT.get(id);
  return stub.fetch(c.req.raw);
});

app.delete("/api/delete/:drawingId", async (c) => {
  const drawingId = c.req.param("drawingId");
  const id = c.env.DURABLE_OBJECT.idFromName(drawingId);
  const stub = c.env.DURABLE_OBJECT.get(id);
  const res = await stub.fetch("https://dummy/delete", { method: "DELETE" });
  return c.json(await res.json());
});

app.get('/aikido.txt', (c) => {
  return c.text('validation.aikido.0652de41b0a625591452d21eb8a1f011')
})


export default {
  fetch: app.fetch,
};
