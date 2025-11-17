export { YcalidrawWebSocketServer } from "./durable-objects";
// export default {
//   fetch(request) {
//     const url = new URL(request.url);

//     if (url.pathname.startsWith("/api/")) {
//       return Response.json({
//         name: "Cloudflare",
//       });
//     }
//     return new Response(null, { status: 404 });
//   },
// } satisfies ExportedHandler<Env>;
// Worker

export default {
  async fetch(request: Request, env: any) {
    console.log("hey")
    let url = new URL(request.url);
    let name = url.searchParams.get("name");
    console.log(name)
    if (!name) {
      return new Response(
        "Select a Durable Object to contact by using" +
        " the `name` URL query string parameter, for example, ?name=A",
      );
    }

    // A stub is a client Object used to send messages to the Durable Object.
    let stub = env.DURABLE_OBJECT.getByName(name);

    // Send a request to the Durable Object using RPC methods, then await its response.
    let count = null;
    switch (url.pathname) {
      case "/increment":
        count = await stub.increment();
        break;
      case "/decrement":
        count = await stub.decrement();
        break;
      case "/":
        // Serves the current value.
        count = await stub.getCounterValue();
        break;
      default:
        return new Response("Not found", { status: 404 });
    }

    return new Response(`Durable Object '${name}' count: ${count}`);
  },
};
