import { WebSocket } from "ws";

export function sendError(socket: WebSocket, message: string) {
  socket.send(
    JSON.stringify({
      type: "error",
      message,
    }),
  );
}
