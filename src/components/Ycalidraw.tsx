import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useParams } from "react-router";
import useWebsocket from "../hooks/useWebhook";
import { useEffect, useRef, useState } from "react";
import type {
  ExcalidrawImperativeAPI,
  SocketId,
} from "@excalidraw/excalidraw/types";

export const Ycalidraw = (props: {}) => {
  const [userId, setUserId] = useState<null | string>(null);
  const excalidrawAPI = useRef<null | ExcalidrawImperativeAPI>(null);
  let { drawingId } = useParams();

  if (!drawingId) {
    return <>Please have a drawing ID</>;
  }

  useEffect(() => {
    let userId = localStorage.getItem("userId");
    if (!userId) {
      localStorage.setItem(
        "userId",
        Math.random().toString(36).substring(2, 15),
      );
      userId = localStorage.getItem("userId");
    }
    setUserId(userId);
  }, []);

  const handleMessage = (event: any) => {
    const data = event.data;
    if (event.type === "pointer") {
      handlePointerUpdate(data);
    } else {
      // handleElementChange
    }
  };

  const handlePointerUpdate = (data: any) => {
    // update the scene with the collaborator logic
    const api = excalidrawAPI.current;
    if (api) {
      const allCollaborators = api?.getAppState().collaborators;
      const collaborator = new Map(allCollaborators);
      collaborator.set(data.userId as SocketId, {
        username: data.userId,
        pointer: {
          y: data.y,
          x: data.x,
          tool: "laser",
        },
      });
      api?.updateScene({
        collaborators: collaborator,
      });
    } else {
      console.log("Update scene not working");
    }
  };

  const sendEvent = useWebsocket(drawingId, handleMessage);

  return (
    <Excalidraw
      onPointerUpdate={(payload) => {
        if (drawingId) {
          sendEvent({
            type: "pointer",
            data: {
              userId,
              x: payload.pointer.x,
              y: payload.pointer.y,
            },
          });
        }
      }}
      excalidrawAPI={(api) => {
        if (api) {
          excalidrawAPI.current = api;
        } else {
          console.log("Api not being set");
        }
      }}
    />
  );
};
