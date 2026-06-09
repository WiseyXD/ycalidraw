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

  const handleRename = (newName: string) => {
    const now = Date.now();
    setRoomName(newName);
    if (drawingId) {
      upsertDrawing({
        id: drawingId,
        name: newName,
        createdAt: roomCreatedAtRef.current || now,
        updatedAt: now,
      });
      setDrawings(getAllDrawings());
    }
    sendEvent({ type: "rename", data: { name: newName } });
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

      <RoomTitle name={roomName} onRename={handleRename} />
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
                style={{ backgroundColor: d.id === drawingId ? "#f0f0f0" : "" }}
              >
                <div className="flex items-center gap-2 w-full">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDrawing(d.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        handleDeleteDrawing(d.id);
                      }
                    }}
                    className="p-1 hover:bg-red-200 rounded transition-colors text-xs cursor-pointer select-none"
                    title="Delete drawing"
                  >
                    ❌
                  </span>

                  <span className="truncate flex-1">{d.name}</span>
                </div>
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
