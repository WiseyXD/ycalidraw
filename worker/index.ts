import { Hono, type Env } from "hono";
export { YcalidrawWebSocketServer } from "./durable-objects";

const app = new Hono<{ Bindings: Env }>()

app.get("/new/:roomId", async (c) => {
  //get a roomId or room name to connect to the right durable object
  const roomId = c.req.param('roomId');
  if (!roomId) {
    return c.json({
      message: "Please enter a room id or create a new room."
    }, 400)
  }
  // A stub is a client Object used to send messages to the Durable Object.
  let stub = c.env.DURABLE_OBJECT.getByName(roomId)
  let count = null;
  count = await stub.increment();

  return c.json({
    message: count
  }, 200)

})

export default {
  fetch: app.fetch,
}
