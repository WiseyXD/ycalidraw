import { Hono, type Env } from "hono";
export { YcalidrawWebSocketServer } from "./durable-objects";

const app = new Hono<{ Bindings: Env }>();

//app.get("/new/:roomId", async (c) => {
//  //get a roomId or room name to connect to the right durable object
//  const roomId = c.req.param("roomId");
//  if (!roomId) {
//    return c.json(
//      {
//        message: "Please enter a room id or create a new room.",
//      },
//      400,
//    );
//  }
//  // A stub is a client Object used to send messages to the Durable Object.
//  //@ts-ignore
//  let stub = c.env.DURABLE_OBJECT.getByName(roomId);
//  let count = null;
//  count = await stub.increment();
//  let name = count.toString();

//  return c.json({ name: name });
//});

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

app.get("/api/get-elements/:drawingId", async (c) => {
  const drawingId = c.req.param("drawingId");
  const durableObjectId = c.env.DURABLE_OBJECT.idFromName(drawingId);
  const stub = c.env.DURABLE_OBJECT.get(durableObjectId);
  const elements = await stub.getAllElements();
  console.log("sending all elements", elements);
  return c.json(elements);
});


export default {
  fetch: app.fetch,
};
