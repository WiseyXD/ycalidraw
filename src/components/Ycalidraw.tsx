import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useNavigate, useParams } from "react-router";
import useWebsocket from "../hooks/useWebsocket";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import UsernameForm from "./UsernameForm";
import RoomTitle from "./RoomTitle";
import StatusPill from "./StatusPill";

import {
  getAllDrawings,
  type DrawingMeta,
  saveAllDrawings,
  deleteDrawing,
  updateDrawingTimestamp,
  upsertDrawing,
} from "../lib/drawingManager";
import { reconcileElements } from "../lib/reconcile";
import { getClientId } from "../lib/clientId";
import { toast } from "sonner";

type PeerInfo = { username: string; color: string };

function toExcalidrawColor(hex: string) {
  return { background: hex, stroke: hex };
}

function DrawingItem({
  d,
  isActive,
  onOpen,
  onDelete,
  onRename,
}: {
  d: DrawingMeta;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(d.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  const commit = () => {
    const trimmed = draft.trim();
    setRenaming(false);
    if (trimmed && trimmed !== d.name) onRename(trimmed);
    else setDraft(d.name);
  };

  if (renaming) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(d.name); setRenaming(false); }
        }}
        className="w-full px-2 py-0.5 text-sm border border-slate-400 rounded outline-none bg-white"
      />
    );
  }

  return (
    <div className="flex items-center w-full gap-2 min-w-0">
      <span className="shrink-0">📄</span>
      <span className="truncate flex-1">{d.name || "Untitled"}</span>
      <span
        role="button"
        tabIndex={0}
        title="Rename"
        onClick={(e) => { e.stopPropagation(); setDraft(d.name); setRenaming(true); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setDraft(d.name); setRenaming(true); } }}
        className="p-1 hover:bg-slate-200 rounded transition-colors text-xs cursor-pointer shrink-0 select-none"
      >
        ✏️
      </span>
      <span
        role="button"
        tabIndex={0}
        title="Delete"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(); } }}
        className="p-1 hover:bg-red-200 rounded transition-colors text-xs cursor-pointer shrink-0 select-none"
      >
        🗑️
      </span>
    </div>
  );
}

export const Ycalidraw = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [roomName, setRoomName] = useState<string>("");
  const excalidrawAPI = useRef<ExcalidrawImperativeAPI | null>(null);
  const peersRef = useRef<Map<string, PeerInfo>>(new Map());
  const roomCreatedAtRef = useRef<number>(0);

  const clientId = useMemo(() => getClientId(), []);

  let { drawingId } = useParams();
  const navigate = useNavigate();

  const { sendEvent, isReady, status } = useWebsocket(drawingId, handleMessage);

  useEffect(() => {
    setDrawings(getAllDrawings());
  }, []);

  useEffect(() => {
    setUserId(localStorage.getItem("userId"));
  }, []);

  useEffect(() => {
    if (isReady && userId) {
      sendEvent({
        type: "hello",
        data: { clientId, username: userId },
      });
    }
  }, [isReady, userId, clientId]);

  if (!drawingId) return null;

  function applyCollaborators(api: ExcalidrawImperativeAPI) {
    const existingCollab = api.getAppState().collaborators as Map<any, any>;
    const collab = new Map<any, any>();
    peersRef.current.forEach((peer, id) => {
      const existing = existingCollab.get(id);
      collab.set(id, {
        username: peer.username,
        color: toExcalidrawColor(peer.color),
        pointer: existing?.pointer,
      });
    });
    api.updateScene({ collaborators: collab });
  }

  function handleMessage(event: any) {
    const api = excalidrawAPI.current;
    if (!api) return;

    if (event.type === "presenceInit") {
      const peers: Array<{ clientId: string; username: string; color: string }> =
        event.data.peers ?? [];
      const next = new Map<string, PeerInfo>();
      for (const p of peers) {
        next.set(p.clientId, { username: p.username, color: p.color });
      }
      peersRef.current = next;
      applyCollaborators(api);
      return;
    }

    if (event.type === "presenceJoin") {
      const { clientId: cid, username, color } = event.data;
      peersRef.current.set(cid, { username, color });
      applyCollaborators(api);
      return;
    }

    if (event.type === "presenceLeave") {
      peersRef.current.delete(event.data.clientId);
      applyCollaborators(api);
      return;
    }

    if (event.type === "pointer") {
      const cid = event.data.clientId;
      const peer = peersRef.current.get(cid);
      if (!peer) return;
      const collab = new Map(api.getAppState().collaborators);
      collab.set(cid, {
        username: peer.username,
        color: toExcalidrawColor(peer.color),
        pointer: {
          x: event.data.x,
          y: event.data.y,
          tool: "laser",
        },
      });
      api.updateScene({ collaborators: collab });
      return;
    }

    if (event.type === "initialState") {
      const { elements, name, createdAt, updatedAt } = event.data;
      if (drawingId) {
        upsertDrawing({ id: drawingId, name, createdAt, updatedAt });
        setDrawings(getAllDrawings());
      }
      setRoomName(name);
      roomCreatedAtRef.current = createdAt;
      const merged = reconcileElements(api.getSceneElements() as any[], elements);
      api.updateScene({ elements: merged });
      return;
    }

    if (event.type === "deleted") {
      if (drawingId) {
        saveAllDrawings(
          getAllDrawings().filter((d) => d.id !== drawingId),
        );
        setDrawings(getAllDrawings());
      }
      toast.error("Room deleted by collaborator", { position: "top-center" });
      navigate("/");
      return;
    }

    if (event.type === "rename") {
      const newName: string = event.data.name;
      const updatedAt: number = event.data.updatedAt;
      setRoomName(newName);
      if (drawingId) {
        upsertDrawing({
          id: drawingId,
          name: newName,
          createdAt: roomCreatedAtRef.current,
          updatedAt,
        });
        setDrawings(getAllDrawings());
      }
      return;
    }

    if (event.type === "elementChange") {
      const merged = reconcileElements(api.getSceneElements() as any[], event.data);
      api.updateScene({ elements: merged });
    }
  }

  const handleNewDrawing = () => {
    const id = crypto.randomUUID();
    navigate(`/${id}`);
    toast.success("Created new drawing 🎨", { position: "top-center" });
  };

  const handleOpenDrawing = (id: string) => {
    navigate(`/${id}`);
  };

  const handleDeleteDrawing = async (id: string) => {
    if (!confirm("Delete this drawing?")) return;
    try {
      await deleteDrawing(id);
      setDrawings(getAllDrawings());
      toast.success("Drawing deleted", { position: "top-center" });
      if (id === drawingId) navigate("/");
    } catch {
      toast.error("Delete failed", { position: "top-center" });
    }
  };

  const handleSave = () => {
    updateDrawingTimestamp(drawingId);
    setDrawings(getAllDrawings());
  };

  const handleInviteToDrawing = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/${drawingId}`);
    toast.success("Copied invite link to clipboard", { position: "top-center" });
  };

  const handleRenameDrawing = (id: string, newName: string) => {
    const existing = getAllDrawings().find((d) => d.id === id);
    if (!existing) return;
    upsertDrawing({ ...existing, name: newName, updatedAt: Date.now() });
    setDrawings(getAllDrawings());
    if (id === drawingId) {
      setRoomName(newName);
      sendEvent({ type: "rename", data: { name: newName } });
    }
  };

  return (
    <div className="canvas h-screen w-full relative">
      {!userId && (
        <UsernameForm
          open={!userId}
          onSubmit={(name) => {
            localStorage.setItem("userId", name);
            setUserId(name);
          }}
        />
      )}

      <RoomTitle name={roomName} />
      <StatusPill status={status} />

      <Excalidraw
        excalidrawAPI={(api) => (excalidrawAPI.current = api)}
        onPointerUpdate={(payload) => {
          sendEvent({
            type: "pointer",
            data: {
              clientId,
              x: payload.pointer.x,
              y: payload.pointer.y,
            },
          });
        }}
        onPointerUp={() => {
          const elements = excalidrawAPI.current?.getSceneElements();
          sendEvent({
            type: "elementChange",
            data: elements,
          });
          handleSave();
        }}
      >
        <MainMenu>
          <MainMenu.Group title="Drawings">
            <MainMenu.Item onSelect={handleNewDrawing}>
              ➕ New Drawing
            </MainMenu.Item>
            <MainMenu.Item onSelect={handleInviteToDrawing}>
              👋 Invite link
            </MainMenu.Item>
            {drawings.map((d) => (
              <MainMenu.Item
                key={d.id}
                onSelect={() => handleOpenDrawing(d.id)}
                title={`Last updated: ${new Date(d.updatedAt).toLocaleString()}`}
                style={{ backgroundColor: d.id === drawingId ? "#e8e8e8" : "" }}
              >
                <DrawingItem
                  d={d}
                  isActive={d.id === drawingId}
                  onOpen={() => handleOpenDrawing(d.id)}
                  onDelete={() => handleDeleteDrawing(d.id)}
                  onRename={(name) => handleRenameDrawing(d.id, name)}
                />
              </MainMenu.Item>
            ))}
          </MainMenu.Group>

          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.DefaultItems.ToggleTheme />
        </MainMenu>
      </Excalidraw>
    </div>
  );
};
