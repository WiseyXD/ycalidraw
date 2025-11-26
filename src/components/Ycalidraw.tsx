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

export const Ycalidraw = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<any[]>([]);
  const excalidrawAPI = useRef<ExcalidrawImperativeAPI | null>(null);

  let { drawingId } = useParams();
  const navigate = useNavigate();

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


  if (!drawingId) return <>Have a drawing ID please</>;

  const sendEvent = useWebsocket(drawingId, handleMessage);

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
    navigate(`/${meta.id}`);
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

            {drawings.map((d) => (
              <MainMenu.Item key={d.id} onSelect={() => handleOpenDrawing(d.id)}>
                {d.name} — {new Date(d.updatedAt).toLocaleString()}
              </MainMenu.Item>
            ))}

            <MainMenu.Separator />

            {drawings.map((d) => (
              <MainMenu.Item
                key={d.id + "-delete"}
                onSelect={() => handleDeleteDrawing(d.id)}
              >
                ❌ Delete {d.name}
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

