# Ycalidraw

A real-time multiplayer whiteboard built on the Excalidraw engine, served entirely from a single Cloudflare Worker.

**Live:** https://ycalidraw.aryan-s-nag.workers.dev

## Try it

1. Open the live link.
2. Click **Start Drawing Now** — a fresh room is created.
3. Click the title at the top of the canvas to rename the room.
4. Open **Menu → Invite link** and share the URL with anyone. They join the same room instantly; cursors, strokes, and renames sync in real time.

## How it works

Everything — the React SPA, the WebSocket endpoint, and the room state — runs from one Cloudflare Worker.

- **Worker (Hono)** routes requests: HTML/JS assets are served from the bundled SPA, while `/api/ws/:drawingId` is upgraded to a WebSocket and forwarded to a Durable Object.
- **Durable Object per room** holds the room's elements, name, and timestamps in storage, and broadcasts to all connected clients using Cloudflare's **hibernatable WebSockets** — the DO can be evicted from memory between messages without dropping the sockets, so idle rooms are essentially free.
- **Presence** is server-assigned: when a client says `hello`, the DO assigns them a stable color from an 8-slot palette and broadcasts a `presenceJoin` to the room. Disconnections fire a `presenceLeave` so stale cursors disappear.
- **Concurrent edits** are merged client-side by Excalidraw element `id` + `version`: the higher version per element wins. The DO stores last-received-wins and lets clients reconcile, so two users finishing strokes at the same instant both survive. The same reconciliation runs on first connect, so any strokes drawn while the WebSocket was reconnecting heal back in automatically.
- **Reconnect** uses exponential backoff (1s → 2s → 4s → 8s → 10s cap). A small status pill in the corner shows live/reconnecting/offline.

## Local development

Requires [Bun](https://bun.sh/).

```sh
bun install
bun run dev      # Vite + Cloudflare plugin (worker runs locally via Miniflare)
bun run test     # Vitest, including DO tests in the Workers runtime pool
bun run build    # Type-check, then build assets for deploy
bun run deploy   # Build and `wrangler deploy`
```

## Stack

- **Frontend:** React 19, Vite, Excalidraw, TailwindCSS, shadcn/ui, framer-motion, react-router
- **Backend:** Cloudflare Workers + Durable Objects (hibernatable WebSockets), Hono
- **Tests:** Vitest with `@cloudflare/vitest-pool-workers` for DO integration tests
