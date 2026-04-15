import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useNavigate, useParams } from "react-router";
import useWebsocket from "../hooks/useWebhook";
import { useEffect, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import UsernameForm from "./UsernameForm";

import {
  getAllDrawings,
  createDrawing,
  deleteDrawing,
  updateDrawingTimestamp,
} from "../lib/drawingManager";
import { toast } from "sonner";

export const Ycalidraw = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<any[]>([]);
  const excalidrawAPI = useRef<ExcalidrawImperativeAPI | null>(null);

  let { drawingId } = useParams();
  const navigate = useNavigate();

  const sendEvent = useWebsocket(drawingId, handleMessage);

  // Auto–redirect if no drawingId is present
  useEffect(() => {
    if (!drawingId) {
      const stored = getAllDrawings();

      if (stored.length === 0) {
        // No drawings exist → force user to create one
        const name = prompt("Create your first drawing:", "Untitled");
        const meta = createDrawing(name || "Untitled");
        navigate(`/${meta.id}`);
        return;
      }

      // Drawings exist → open the first one
      navigate(`/${stored[0].id}`);
    }
  }, [drawingId]);


  useEffect(() => {
    setDrawings(getAllDrawings());
  }, []);

  useEffect(() => {
    setUserId(localStorage.getItem("userId"));
  }, []);

  if (!drawingId) return null;


  function handleMessage(event: any) {
    const api = excalidrawAPI.current;
    if (!api) return;

    if (event.type === "pointer") {
      const collab = new Map(api.getAppState().collaborators);
      collab.set(event.data.userId, {
        username: event.data.userId,
        pointer: {
          x: event.data.x,
          y: event.data.y,
          tool: "laser",
        },
      });
      api.updateScene({ collaborators: collab });
      return;
    }

    api.updateScene({ elements: event.data });
  }

  const handleNewDrawing = () => {
    const name = prompt("Name your drawing:", "Untitled");
    const meta = createDrawing(name || "Untitled");
    setDrawings(getAllDrawings());
    navigate(`/${meta.id}`);
    toast.success("Created new drawing named : " + name + " 🎨", { position: "top-center" });

  };

  const handleOpenDrawing = (id: string) => {
    navigate(`/${id}`);
  };

  const handleDeleteDrawing = (id: string) => {
    if (!confirm("Delete this drawing?")) return;
    deleteDrawing(id);
    setDrawings(getAllDrawings());
  };

  const handleSave = () => {
    updateDrawingTimestamp(drawingId);
    setDrawings(getAllDrawings());
  };

  const handleInviteToDrawing = async () => {
    await navigator.clipboard.writeText("http://localhost:5173/api/ws" + drawingId);
    toast.success("Copied invite link to clipboard", { position: "top-center" });
  };



  return (
    <>
      {!userId && (
        <UsernameForm
          open={!userId}
          onSubmit={(name) => {
            localStorage.setItem("userId", name);
            setUserId(name);
          }}
        />
      )}

      <Excalidraw
        excalidrawAPI={(api) => (excalidrawAPI.current = api)}
        onPointerUpdate={(payload) => {
          sendEvent({
            type: "pointer",
            data: {
              userId,
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
                <div className={"flex items-center gap-1"}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDrawing(d.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded transition-colors text-xs"
                    title="Delete drawing"
                  >
                    ❌
                  </button>

                  <span className="truncate flex-1">
                    {d.name}
                  </span>

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
    </>
  );
};

