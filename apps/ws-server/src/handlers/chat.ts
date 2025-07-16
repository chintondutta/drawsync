import WebSocket from "ws";
import { prisma } from "@repo/db/client";
import { chat } from "../types";
import { sendError } from "@repo/error-handler/ws-error-handler";
import {
  pushChatMessage,
  publishChatMessage,
  ChatMessage,
} from "@repo/cache/chat";

export async function handleChatMessage(
  data: chat,
  userId: string,
  socket: WebSocket,
) {
  const { roomId, text } = data;

  const senderMembership = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId: roomId,
        userId: userId,
      },
    },
  });

  if (!senderMembership) {
    sendError(socket, "You're no longer part of this room");
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    sendError(socket, "User not found");
  }

  const messagePayload: ChatMessage = {
    userId,
    userName: user?.name ?? "Unknown",
    message: text,
  };

  await pushChatMessage(roomId, messagePayload);

  await publishChatMessage(roomId, messagePayload);

  await prisma.chat.create({
    data: {
      userId,
      roomId,
      message: text,
    },
  });
}
