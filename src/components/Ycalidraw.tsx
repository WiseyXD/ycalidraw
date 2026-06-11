import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useNavigate, useParams } from "react-router";
import useWebsocket from "../hooks/useWebsocket";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import UsernameForm from "./UsernameForm";
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
import { Home, Copy, Pencil, Plus, Trash2, FileText } from "lucide-react";

const ACCENT = '#C4FF47';
const BG = '#0C0C0C';
const CREAM = '#F2EDE4';
const BORDER = 'rgba(242,237,228,0.08)';

type PeerInfo = { username: string; color: string };

function toExcalidrawColor(hex: string) {
  return { background: hex, stroke: hex };
}

function DrawingItem({
  d,
  isActive,
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
        style={{
          width: '100%', padding: '3px 8px',
          background: 'rgba(196,255,71,0.08)',
          border: '1px solid rgba(196,255,71,0.4)',
          borderRadius: 6,
          color: CREAM,
          fontFamily: "'Syne', sans-serif",
          fontSize: '0.85rem',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8, minWidth: 0 }}>
      <FileText
        size={13}
        style={{ flexShrink: 0, color: isActive ? ACCENT : 'rgba(242,237,228,0.35)' }}
      />
      <span style={{
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontSize: '0.85rem',
        color: isActive ? CREAM : 'rgba(242,237,228,0.65)',
        fontFamily: "'Syne', sans-serif",
      }}>
        {d.name || "Untitled"}
      </span>
      <button
        title="Rename"
        onClick={(e) => { e.stopPropagation(); setDraft(d.name); setRenaming(true); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setDraft(d.name); setRenaming(true); } }}
        style={{
          padding: 4, borderRadius: 6,
          background: 'none', border: 'none',
          cursor: 'pointer', color: 'rgba(242,237,228,0.35)',
          display: 'flex', flexShrink: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = CREAM)}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(242,237,228,0.35)')}
      >
        <Pencil size={11} />
      </button>
      <button
        title="Delete"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(); } }}
        style={{
          padding: 4, borderRadius: 6,
          background: 'none', border: 'none',
          cursor: 'pointer', color: 'rgba(242,237,228,0.35)',
          display: 'flex', flexShrink: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#ff6b6b')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(242,237,228,0.35)')}
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

export const Ycalidraw = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<DrawingMeta[]>([]);
  const [roomName, setRoomName] = useState<string>("");
  const [renamingBoard, setRenamingBoard] = useState(false);
  const [boardDraft, setBoardDraft] = useState("");
  const boardInputRef = useRef<HTMLInputElement>(null);
  const excalidrawAPI = useRef<ExcalidrawImperativeAPI | null>(null);
  const peersRef = useRef<Map<string, PeerInfo>>(new Map());
  const roomCreatedAtRef = useRef<number>(0);

  const clientId = useMemo(() => getClientId(), []);
  const { drawingId } = useParams();
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
      sendEvent({ type: "hello", data: { clientId, username: userId } });
    }
  }, [isReady, userId, clientId]);

  useEffect(() => {
    if (renamingBoard && boardInputRef.current) {
      boardInputRef.current.focus();
      boardInputRef.current.select();
    }
  }, [renamingBoard]);

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
      const peers: Array<{ clientId: string; username: string; color: string }> = event.data.peers ?? [];
      const next = new Map<string, PeerInfo>();
      for (const p of peers) next.set(p.clientId, { username: p.username, color: p.color });
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
        pointer: { x: event.data.x, y: event.data.y, tool: "laser" },
      });
      api.updateScene({ collaborators: collab });
      return;
    }

    if (event.type === "initialState") {
      const { elements, name, createdAt, updatedAt } = event.data;
      upsertDrawing({ id: drawingId, name, createdAt, updatedAt });
      setDrawings(getAllDrawings());
      setRoomName(name);
      roomCreatedAtRef.current = createdAt;
      const merged = reconcileElements(api.getSceneElements() as any[], elements);
      api.updateScene({ elements: merged });
      return;
    }

    if (event.type === "deleted") {
      saveAllDrawings(getAllDrawings().filter((d) => d.id !== drawingId));
      setDrawings(getAllDrawings());
      toast.error("Room deleted by collaborator", { position: "top-center" });
      navigate("/");
      return;
    }

    if (event.type === "rename") {
      const newName: string = event.data.name;
      const updatedAt: number = event.data.updatedAt;
      setRoomName(newName);
      upsertDrawing({ id: drawingId, name: newName, createdAt: roomCreatedAtRef.current, updatedAt });
      setDrawings(getAllDrawings());
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
    toast.success("New board created", { position: "top-center" });
  };

  const handleOpenDrawing = (id: string) => navigate(`/${id}`);

  const handleDeleteDrawing = async (id: string) => {
    if (!confirm("Delete this board?")) return;
    try {
      await deleteDrawing(id);
      setDrawings(getAllDrawings());
      toast.success("Board deleted", { position: "top-center" });
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
    toast.success("Invite link copied", { position: "top-center" });
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

  const handleStartBoardRename = () => {
    setBoardDraft(roomName);
    setRenamingBoard(true);
  };

  const handleCommitBoardRename = () => {
    setRenamingBoard(false);
    const trimmed = boardDraft.trim();
    if (trimmed && trimmed !== roomName) {
      handleRenameDrawing(drawingId, trimmed);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Syne:wght@400;500;600;700;800&display=swap');

        @keyframes yc-status-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }

        .yc-topbar-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px;
          background: none;
          border: 1px solid ${BORDER};
          border-radius: 100px;
          color: rgba(242,237,228,0.5);
          font-family: 'Syne', sans-serif;
          font-size: 0.78rem; font-weight: 600;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
          white-space: nowrap;
        }
        .yc-topbar-btn:hover {
          color: ${CREAM};
          border-color: rgba(242,237,228,0.22);
        }
        .yc-topbar-btn.accent {
          border-color: rgba(196,255,71,0.3);
          color: ${ACCENT};
        }
        .yc-topbar-btn.accent:hover {
          background: ${ACCENT};
          border-color: ${ACCENT};
          color: ${BG};
        }
        .yc-topbar-btn.icon-only {
          padding: 5px 8px;
        }

        .yc-board-name-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none;
          color: ${CREAM};
          font-family: 'Syne', sans-serif;
          font-size: 0.85rem; font-weight: 600;
          cursor: pointer; padding: 4px 8px;
          border-radius: 8px;
          transition: background 0.15s;
          max-width: 280px;
          overflow: hidden;
        }
        .yc-board-name-btn span {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .yc-board-name-btn:hover { background: rgba(242,237,228,0.06); }
        .yc-board-name-btn .edit-icon { color: rgba(242,237,228,0.25); flex-shrink: 0; transition: color 0.15s; }
        .yc-board-name-btn:hover .edit-icon { color: rgba(242,237,228,0.5); }

        .yc-board-input {
          background: rgba(242,237,228,0.06);
          border: 1px solid rgba(196,255,71,0.45);
          border-radius: 8px;
          color: ${CREAM};
          font-family: 'Syne', sans-serif;
          font-size: 0.85rem; font-weight: 600;
          padding: 4px 10px;
          outline: none;
          max-width: 280px;
          min-width: 120px;
        }

        .yc-user-chip {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 3px 10px 3px 3px;
          background: rgba(242,237,228,0.05);
          border: 1px solid ${BORDER};
          border-radius: 100px;
          font-family: 'Syne', sans-serif;
          font-size: 0.78rem; font-weight: 600;
          color: rgba(242,237,228,0.55);
          user-select: none;
        }
        .yc-user-avatar {
          width: 22px; height: 22px;
          background: ${ACCENT};
          color: ${BG};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 800;
          flex-shrink: 0;
        }

        .yc-vdivider {
          width: 1px; height: 18px;
          background: rgba(242,237,228,0.1);
          flex-shrink: 0;
        }
      `}</style>

      <div style={{
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: BG,
        fontFamily: "'Syne', sans-serif",
      }}>
        {!userId && (
          <UsernameForm
            open={!userId}
            onSubmit={(name) => {
              localStorage.setItem("userId", name);
              setUserId(name);
            }}
          />
        )}

        {/* ── TOP BAR ── */}
        <div style={{
          height: 48, flexShrink: 0,
          background: BG,
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          zIndex: 20,
        }}>
          {/* Home */}
          <button
            className="yc-topbar-btn icon-only"
            onClick={() => navigate('/')}
            title="Back to home"
          >
            <Home size={15} />
          </button>

          <div className="yc-vdivider" />

          {/* Board name — inline editable */}
          {renamingBoard ? (
            <input
              ref={boardInputRef}
              value={boardDraft}
              onChange={(e) => setBoardDraft(e.target.value)}
              onBlur={handleCommitBoardRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitBoardRename();
                if (e.key === 'Escape') setRenamingBoard(false);
              }}
              className="yc-board-input"
            />
          ) : (
            <button className="yc-board-name-btn" onClick={handleStartBoardRename} title="Click to rename">
              <span>{roomName || 'Untitled Board'}</span>
              <Pencil size={11} className="edit-icon" />
            </button>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Status */}
          <StatusPill status={status} />

          <div className="yc-vdivider" />

          {/* Share */}
          <button className="yc-topbar-btn accent" onClick={handleInviteToDrawing}>
            <Copy size={13} />
            Share
          </button>

          {/* User chip */}
          {userId && (
            <div className="yc-user-chip">
              <div className="yc-user-avatar">
                {userId[0].toUpperCase()}
              </div>
              {userId}
            </div>
          )}
        </div>

        {/* ── CANVAS ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Excalidraw
            theme="dark"
            excalidrawAPI={(api) => (excalidrawAPI.current = api)}
            onPointerUpdate={(payload) => {
              sendEvent({
                type: "pointer",
                data: { clientId, x: payload.pointer.x, y: payload.pointer.y },
              });
            }}
            onPointerUp={() => {
              const elements = excalidrawAPI.current?.getSceneElements();
              sendEvent({ type: "elementChange", data: elements });
              handleSave();
            }}
          >
            <MainMenu>
              <MainMenu.Group title="Boards">
                <MainMenu.Item onSelect={handleNewDrawing}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={14} />
                    New board
                  </div>
                </MainMenu.Item>
                <MainMenu.Item onSelect={handleInviteToDrawing}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Copy size={14} />
                    Copy invite link
                  </div>
                </MainMenu.Item>
                {drawings.map((d) => (
                  <MainMenu.Item
                    key={d.id}
                    onSelect={() => handleOpenDrawing(d.id)}
                    title={`Last edited: ${new Date(d.updatedAt).toLocaleString()}`}
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
      </div>
    </>
  );
};
