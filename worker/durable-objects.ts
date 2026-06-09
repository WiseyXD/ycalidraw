import { DurableObject } from "cloudflare:workers";

export interface Env {
  DURABLE_OBJECT: DurableObjectNamespace;
}

const DEFAULT_ROOM_NAME = "Untitled drawing";

const PALETTE = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFD93D",
  "#6BCF7F",
  "#A29BFE",
  "#FD79A8",
  "#FDCB6E",
  "#74B9FF",
];

type SessionMeta = {
  id: string;
  clientId?: string;
  username?: string;
  color?: string;
};

export class YcalidrawWebSocketServer extends DurableObject {
  sessions: Map<WebSocket, SessionMeta>;
  elements: any[] = [];
  name: string = DEFAULT_ROOM_NAME;
  createdAt: number = 0;
  updatedAt: number = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

    ctx.blockConcurrencyWhile(async () => {
      this.elements = (await ctx.storage.get<any[]>("elements")) ?? [];

      const storedName = await ctx.storage.get<string>("name");
      if (storedName === undefined) {
        const now = Date.now();
        this.name = DEFAULT_ROOM_NAME;
        this.createdAt = now;
        this.updatedAt = now;
        await ctx.storage.put({
          name: this.name,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt,
        });
      } else {
        this.name = storedName;
        this.createdAt = (await ctx.storage.get<number>("createdAt"))!;
        this.updatedAt = (await ctx.storage.get<number>("updatedAt"))!;
      }
    });

    this.ctx.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment() as SessionMeta | undefined;
      if (attachment) this.sessions.set(ws, attachment);
    });

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async clearDo() {
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
    this.elements = [];
    this.name = DEFAULT_ROOM_NAME;
    const now = Date.now();
    this.createdAt = now;
    this.updatedAt = now;
    const msg = JSON.stringify({ type: "deleted" });
    this.sessions.forEach((_meta, ws) => {
      try {
        ws.send(msg);
      } catch {}
      try {
        ws.close(1000, "room deleted");
      } catch {}
    });
    this.sessions.clear();
    return { cleared: true };
  }

  private pickColor(): string {
    const used = new Set<string>();
    for (const meta of this.sessions.values()) {
      if (meta.color) used.add(meta.color);
    }
    for (const color of PALETTE) {
      if (!used.has(color)) return color;
    }
    return PALETTE[this.sessions.size % PALETTE.length];
  }

  private broadcastExcept(senderWs: WebSocket, payload: unknown) {
    const message = JSON.stringify(payload);
    this.sessions.forEach((_meta, ws) => {
      if (ws !== senderWs) ws.send(message);
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method === "DELETE") {
      const result = await this.clearDo();
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    const meta: SessionMeta = { id: crypto.randomUUID() };
    server.serializeAttachment(meta);
    this.sessions.set(server, meta);

    server.send(
      JSON.stringify({
        type: "initialState",
        data: {
          elements: this.elements,
          name: this.name,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt,
        },
      }),
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    let event: { type: string; data: any };
    try {
      event = JSON.parse(message);
    } catch {
      return;
    }

    if (event.type === "hello") {
      const meta = this.sessions.get(ws);
      if (!meta) return;
      const clientId: string = event.data.clientId;
      const username: string = event.data.username ?? "Anonymous";
      const color = this.pickColor();
      meta.clientId = clientId;
      meta.username = username;
      meta.color = color;
      ws.serializeAttachment(meta);

      const peers: Array<{ clientId: string; username: string; color: string }> = [];
      this.sessions.forEach((other, otherWs) => {
        if (otherWs === ws) return;
        if (other.clientId && other.color) {
          peers.push({
            clientId: other.clientId,
            username: other.username ?? "Anonymous",
            color: other.color,
          });
        }
      });

      ws.send(
        JSON.stringify({
          type: "presenceInit",
          data: { yourColor: color, peers },
        }),
      );

      this.broadcastExcept(ws, {
        type: "presenceJoin",
        data: { clientId, username, color },
      });
      return;
    }

    if (event.type === "elementChange") {
      this.elements = event.data;
      this.updatedAt = Date.now();
      this.ctx.storage.put({
        elements: this.elements,
        updatedAt: this.updatedAt,
      });
      this.broadcastExcept(ws, event);
      return;
    }

    if (event.type === "rename") {
      const newName = String(event.data?.name ?? "").trim();
      if (!newName) return;
      this.name = newName;
      this.updatedAt = Date.now();
      await this.ctx.storage.put({
        name: this.name,
        updatedAt: this.updatedAt,
      });
      this.broadcastExcept(ws, {
        type: "rename",
        data: { name: this.name, updatedAt: this.updatedAt },
      });
      return;
    }

    if (event.type === "pointer") {
      this.broadcastExcept(ws, event);
      return;
    }
  }

  async webSocketClose(ws: WebSocket, code: number, _reason: string) {
    const meta = this.sessions.get(ws);
    this.sessions.delete(ws);
    if (meta?.clientId) {
      this.broadcastExcept(ws, {
        type: "presenceLeave",
        data: { clientId: meta.clientId },
      });
    }
    ws.close(code, "Durable Object is closing WebSocket");
  }
}
