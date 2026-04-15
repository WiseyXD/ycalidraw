import { useEffect, useRef } from "react";

export default function useWebsocket(
  drawingId: string | undefined,
  handleMessage: (event: any) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!drawingId) return;

    socketRef.current = new WebSocket(
      "wss:/ycalidraw.aryan-s-nag.workers.dev/api/ws/" + drawingId,
      // "http://localhost:5173/api/ws" + drawingId,

    );
    const socket = socketRef.current;

    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
      };
      socket.onopen = () => {
        console.log("Socket opened.");
      };
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [drawingId]);

  const sendEvent = (event: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };
  return sendEvent;
}
