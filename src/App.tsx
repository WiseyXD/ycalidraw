import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import "./App.css";
import { useParams } from "react-router";
import useWebsocket from "./hooks/useWebhook";
function App() {
  let { drawingId } = useParams();
  if (!drawingId) {
    return <>Please have a drawing ID</>;
  }
  const sendEvent = useWebsocket(drawingId);

  return (
    <div className="canvas h-[800px] w-full">
      <Excalidraw
        onPointerUpdate={(event) => {
          console.log(event);
          if (drawingId) {
            sendEvent(event);
          }
        }}
      />
    </div>
  );
}

export default App;
