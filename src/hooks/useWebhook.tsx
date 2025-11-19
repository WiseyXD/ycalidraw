import { useEffect, useRef } from "react";

export default function useWebsocket(
  drawingId: string,
  handleMessage: (event: any) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    socketRef.current = new WebSocket(
      "ws://localhost:5173/api/ws/" + drawingId,
    );
    const socket = socketRef.current;
    console.log("useWebsocket", socket);

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
  }, []);

  const sendEvent = (event: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };
  return sendEvent;
}
