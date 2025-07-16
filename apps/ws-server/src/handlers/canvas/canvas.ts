import WebSocket from "ws";
import { CanvasPayload } from "../../types";
import { enqueueCanvasUpdate } from "@repo/cache/canvas";
import { getUsersInRoom } from "@repo/cache/room";
import { mergeElementPatch, shouldReplace } from "./utils";
import { getCanvasSnapshot } from "@repo/cache/canvas";

export async function handleCanvasDiff(
  data: CanvasPayload,
  userId: string,
  socket: WebSocket,
) {
  const { roomId, diff } = data;

  const memberIds = await getUsersInRoom(roomId);
  if (!memberIds.includes(userId)) {
    socket.send(
      JSON.stringify({ type: "error", message: "Unauthorized room access." }),
    );
    return;
  }

  const currentCanvas = await getCanvasSnapshot(roomId);
  const existing = currentCanvas.find((e) => e.id === diff.id);

  const candidate = mergeElementPatch(existing, {
    ...diff.data,
    deleted: diff.action === "delete",
  });

  if (!candidate) {
    return;
  }

  if (existing && !shouldReplace(existing, candidate)) return;

  await enqueueCanvasUpdate(roomId, candidate);
}
