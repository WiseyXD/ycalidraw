import { useEffect, useRef } from "react";

export default function useWebsocket(drawingId: string) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    socketRef.current = new WebSocket(
      "ws://localhost:5173/api/ws/" + drawingId,
    );
    const socket = socketRef.current;
    console.log("useWebsocket", socket);

    if (socket) {
      socket.onmessage = (event) => {
        console.log("Recieved event ", event);
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
  }, []);

  const sendEvent = (event: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };
  return sendEvent;
}
