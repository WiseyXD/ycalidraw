import { useEffect, useRef, useState } from "react";
import { backoffDelay } from "../lib/backoff";

export type ConnectionStatus = "connected" | "reconnecting" | "offline";

export default function useWebsocket(
  drawingId: string | undefined,
  handleMessage: (event: any) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(handleMessage);
  handlerRef.current = handleMessage;

  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("reconnecting");

  useEffect(() => {
    if (!drawingId) return;

    let cancelled = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      if (cancelled) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatus("offline");
        return;
      }

      setStatus(attempt === 0 ? "reconnecting" : "reconnecting");

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(
        `${wsProtocol}//${window.location.host}/api/ws/${drawingId}`,
      );
      socketRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        attempt = 0;
        setIsReady(true);
        setStatus("connected");
      };

      ws.onmessage = (event) => {
        handlerRef.current(JSON.parse(event.data));
      };

      ws.onclose = () => {
        setIsReady(false);
        if (cancelled) return;
        const delay = backoffDelay(attempt);
        attempt += 1;
        setStatus("reconnecting");
        clearTimer();
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    const handleOnline = () => {
      attempt = 0;
      clearTimer();
      reconnectTimer = setTimeout(connect, 0);
    };
    const handleOffline = () => {
      setStatus("offline");
      clearTimer();
      socketRef.current?.close();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    connect();

    return () => {
      cancelled = true;
      clearTimer();
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
      socketRef.current?.close();
    };
  }, [drawingId]);

  const sendEvent = (event: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(event));
    }
  };

  return { sendEvent, isReady, status };
}
