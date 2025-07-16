import { WebSocketServer } from "ws";
import "./pubsub/chat";
import "./pubsub/canvas";
import "./pubsub/cursor";
import "./pubsub/presence";
import "./pubsub/ws-pubsub";
import { authenticateWsRequest } from "@repo/auth/ws_auth";
import { redis } from "@repo/cache/client";
import { prisma } from "@repo/db/client";
import { socketMap } from "./state";
import { handleChatMessage } from "./handlers/chat";
import { handleCanvasDiff } from "./handlers/canvas/canvas";
import { handleCursorUpdate } from "./handlers/cursor";
import { checkRateLimit } from "@repo/rate-limiter/ws-rate-limiter";
import { sendError } from "@repo/error-handler/ws-error-handler";
import {
  setUserPresence,
  removeUserPresence,
  publishPresenceUpdate,
} from "@repo/cache/presence";
import {
  addUserToRoom,
  removeUserFromRoom,
  getUsersInRoom,
  clearRoomState,
} from "@repo/cache/room";
import { getRecentMessages } from "@repo/cache/chat";
import { getCanvasHistory } from "@repo/cache/canvas";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", async function (socket, req) {
  const { isAuthenticated, userId, error } = await authenticateWsRequest(req);

  if (!isAuthenticated || !userId) {
    sendError(socket, error ?? "Authentication failed");
    socket.close();
    return;
  }

  socketMap.set(userId, socket);
  (socket as any).userId = userId;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      include: { room: true },
    });

    (socket as any).roomIds = [];

    const joinedRoomIds: number[] = [];

    for (const membership of memberships) {
      const roomId = membership.room.id;
      const slug = membership.room.slug;

      await addUserToRoom(roomId, userId);
      (socket as any).roomIds.push(roomId);

      joinedRoomIds.push(roomId);

      await setUserPresence(roomId, userId, {
        userName: user?.name ?? "Unknown",
        lastActive: Date.now(),
      });

      socket.send(
        JSON.stringify({
          type: "joined",
          message: `You joined room: ${slug}`,
          roomId,
        }),
      );

      const userIds = await getUsersInRoom(roomId);
      const payload = JSON.stringify({
        type: "user-joined",
        message: `User ${userId} joined room: ${slug}`,
        userId,
        roomId,
      });

      for (const uid of userIds) {
        if (uid !== userId) {
          await redis.publish(`ws:deliver:${uid}`, payload);
        }
      }

      let pastMessages = await getRecentMessages(roomId);

      if (pastMessages.length === 0) {
        const dbMessages = await prisma.chat.findMany({
          where: { roomId },
          orderBy: { id: "asc" },
          include: { user: true },
          take: 50,
        });

        pastMessages = dbMessages.map((msg: any) => ({
          userId: msg.userId,
          userName: msg.user.name,
          message: msg.message,
        }));

        const redisKey = `chat:room:${roomId}`;
        for (const msg of pastMessages.reverse()) {
          await redis.lpush(redisKey, JSON.stringify(msg));
        }
        await redis.ltrim(redisKey, 0, 49);
      }

      socket.send(
        JSON.stringify({
          type: "chat-history",
          roomId,
          messages: pastMessages,
        }),
      );

      const canvasData = await getCanvasHistory(roomId);

      socket.send(
        JSON.stringify({
          type: "canvas-History",
          roomId,
          canvasData,
        }),
      );
    }

    for (const roomId of joinedRoomIds) {
      await publishPresenceUpdate(roomId);
    }
  } catch (err) {
    console.error("WebSocket room join error:", err);
    sendError(socket, "Failed to join rooms");
  }

  socket.on("message", async function (message) {
    try {
      const data = JSON.parse(message.toString());

      if (!checkRateLimit(userId, 5)) {
        sendError(socket, "Rate Limit exceeded. Slow Down.");
        return;
      }

      if (
        data.type === "message" &&
        data.roomId &&
        typeof data.text === "string"
      ) {
        handleChatMessage(data, userId, socket);
      } else if (data.type === "canvas-diff" && data.roomId && data.diff) {
        handleCanvasDiff(data, userId, socket);
      } else if (
        data.type === "cursor-update" &&
        data.roomId &&
        typeof data.x === "number" &&
        typeof data.y === "number"
      ) {
        handleCursorUpdate(data, userId, socket);
      } else {
        sendError(socket, "Invalid message format");
      }
    } catch (err) {
      sendError(socket, "Invalid JSON");
    }
  });

  socket.on("close", async function () {
    const userId = (socket as any).userId;
    const roomIds: number[] = (socket as any).roomIds || [];

    for (const roomId of roomIds) {
      await removeUserFromRoom(roomId, userId);
      socketMap.delete(userId);

      await removeUserPresence(roomId, userId);
      await publishPresenceUpdate(roomId);

      const userIds = await getUsersInRoom(roomId);
      const payload = JSON.stringify({
        type: "user-left",
        roomId,
        userId,
        message: `User ${userId} has left the room`,
      });

      for (const uid of userIds) {
        await redis.publish(`ws:deliver:${uid}`, payload);
      }

      if (userIds.length === 0) {
        await clearRoomState(roomId);
      }
    }
  });
});
