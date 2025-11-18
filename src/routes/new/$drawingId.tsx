import { createFileRoute } from "@tanstack/react-router";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

import useWebsocket from "../../hooks/useWebhook";

export const Route = createFileRoute("/new/$drawingId")({
  component: RouteComponent,
});

function RouteComponent() {
  // const sendEvent = useWebsocket();
  const { drawingId } = Route.useParams();
  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-2">{drawingId}</div>

      <div className="flex-1 min-h-0">
        <Excalidraw />
      </div>
    </div>
  );
}
