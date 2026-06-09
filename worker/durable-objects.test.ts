import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DURABLE_OBJECT: DurableObjectNamespace;
  }
}

async function openRoomSocket(roomName: string): Promise<{
  ws: WebSocket;
  send: (payload: unknown) => void;
  nextMessage: () => Promise<any>;
}> {
  const id = env.DURABLE_OBJECT.idFromName(roomName);
  const stub = env.DURABLE_OBJECT.get(id);
  const resp = await stub.fetch("https://dummy/", {
    headers: { Upgrade: "websocket" },
  });
  const ws = resp.webSocket!;
  const inbox: any[] = [];
  const waiters: Array<(v: any) => void> = [];
  ws.addEventListener("message", (e: MessageEvent) => {
    const parsed = JSON.parse(e.data as string);
    const waiter = waiters.shift();
    if (waiter) waiter(parsed);
    else inbox.push(parsed);
  });
  ws.accept();

  const nextMessage = () =>
    new Promise<any>((resolve) => {
      const queued = inbox.shift();
      if (queued !== undefined) resolve(queued);
      else waiters.push(resolve);
    });
  const send = (payload: unknown) => ws.send(JSON.stringify(payload));
  return { ws, send, nextMessage };
}

describe("YcalidrawWebSocketServer", () => {
  describe("room metadata", () => {
    it("returns name + timestamps + elements in initialState for a fresh room", async () => {
      const { ws, nextMessage } = await openRoomSocket("fresh-room-1");
      const initial = await nextMessage();

      expect(initial.type).toBe("initialState");
      expect(initial.data.elements).toEqual([]);
      expect(typeof initial.data.name).toBe("string");
      expect(initial.data.name.length).toBeGreaterThan(0);
      expect(typeof initial.data.createdAt).toBe("number");
      expect(typeof initial.data.updatedAt).toBe("number");

      ws.close(1000, "test done");
    });

    it("preserves room metadata across reconnections to the same room id", async () => {
      const { ws: ws1, nextMessage: next1 } = await openRoomSocket("persist-room-1");
      const initial1 = await next1();
      ws1.close(1000, "test done");

      const { ws: ws2, nextMessage: next2 } = await openRoomSocket("persist-room-1");
      const initial2 = await next2();
      ws2.close(1000, "test done");

      expect(initial2.data.name).toBe(initial1.data.name);
      expect(initial2.data.createdAt).toBe(initial1.data.createdAt);
    });
  });

  describe("presence", () => {
    async function nextOfType(
      socket: { nextMessage: () => Promise<any> },
      type: string,
    ) {
      for (;;) {
        const m = await socket.nextMessage();
        if (m.type === type) return m;
      }
    }

    it("assigns distinct palette colors to two simultaneous connections", async () => {
      const a = await openRoomSocket("presence-room-1");
      const b = await openRoomSocket("presence-room-1");

      await a.nextMessage(); // initialState
      await b.nextMessage();

      a.send({ type: "hello", data: { clientId: "client-a", username: "Alice" } });
      b.send({ type: "hello", data: { clientId: "client-b", username: "Bob" } });

      const aInit = await nextOfType(a, "presenceInit");
      const bInit = await nextOfType(b, "presenceInit");

      expect(typeof aInit.data.yourColor).toBe("string");
      expect(typeof bInit.data.yourColor).toBe("string");
      expect(aInit.data.yourColor).not.toBe(bInit.data.yourColor);

      a.ws.close(1000, "test done");
      b.ws.close(1000, "test done");
    });

    it("broadcasts rename to other peers and persists across reconnect", async () => {
      const a = await openRoomSocket("rename-room-1");
      const b = await openRoomSocket("rename-room-1");

      await a.nextMessage(); // initialState
      await b.nextMessage();

      a.send({ type: "rename", data: { name: "My Renamed Room" } });

      const renameMsg = await nextOfType(b, "rename");
      expect(renameMsg.data.name).toBe("My Renamed Room");

      a.ws.close(1000, "test done");
      b.ws.close(1000, "test done");

      const c = await openRoomSocket("rename-room-1");
      const reconnect = await c.nextMessage();
      expect(reconnect.data.name).toBe("My Renamed Room");
      c.ws.close(1000, "test done");
    });

    it("broadcasts deleted to connected peers and resets room state on delete", async () => {
      const a = await openRoomSocket("delete-room-1");
      await a.nextMessage(); // initialState
      a.send({ type: "rename", data: { name: "Doomed Room" } });

      // delete via the same fetch path used in production
      const id = env.DURABLE_OBJECT.idFromName("delete-room-1");
      const stub = env.DURABLE_OBJECT.get(id);
      await stub.fetch("https://dummy/delete", { method: "DELETE" });

      const deleted = await nextOfType(a, "deleted");
      expect(deleted.type).toBe("deleted");

      // reconnect → fresh defaults
      const b = await openRoomSocket("delete-room-1");
      const fresh = await b.nextMessage();
      expect(fresh.data.name).not.toBe("Doomed Room");
      expect(fresh.data.elements).toEqual([]);
      b.ws.close(1000, "test done");
    });

    it("broadcasts presenceLeave to remaining peers when a client disconnects", async () => {
      const a = await openRoomSocket("presence-room-2");
      const b = await openRoomSocket("presence-room-2");

      await a.nextMessage();
      await b.nextMessage();

      a.send({ type: "hello", data: { clientId: "client-a", username: "Alice" } });
      b.send({ type: "hello", data: { clientId: "client-b", username: "Bob" } });
      await nextOfType(a, "presenceInit");
      await nextOfType(b, "presenceInit");

      b.ws.close(1000, "leaving");

      const leave = await nextOfType(a, "presenceLeave");
      expect(leave.data.clientId).toBe("client-b");

      a.ws.close(1000, "test done");
    });
  });
});
