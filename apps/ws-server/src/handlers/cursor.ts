import { prisma } from "@repo/db/client";
import WebSocket from "ws";
import { cursor } from "../types";
import { sendError } from "@repo/error-handler/ws-error-handler";
import { setUserPresence } from "@repo/cache/presence";
import { setUserCursor } from "@repo/cache/cursor";
import { publishCursorUpdate } from "@repo/cache/cursor";

export async function handleCursorUpdate(
  data: cursor,
  userId: string,
  socket: WebSocket,
) {
  const { roomId, x, y } = data;

  const senderMembership = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
  });

  if (!senderMembership) {
    sendError(socket, "You're not part of this room");
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  await setUserPresence(roomId, userId, {
    userName: user?.name ?? "Unknown",
    lastActive: Date.now(),
  });

  await setUserCursor(roomId, userId, { x, y });

  await publishCursorUpdate(roomId, {
    userId,
    x,
    y,
  });
}
