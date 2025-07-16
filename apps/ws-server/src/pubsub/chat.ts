import { redisSubscriber } from "@repo/cache/subscriber";
import { ChatMessage } from "@repo/cache/chat";
import { getUsersInRoom } from "@repo/cache/room";
import { redis } from "@repo/cache/client";

(async () => {
  await redisSubscriber.psubscribe("chat:room:*");

  redisSubscriber.on(
    "pmessage",
    async (_pattern: string, channel: string, raw: string) => {
      try {
        const roomId = parseInt(channel.split(":")[2] ?? "");
        if (isNaN(roomId)) return;

        if (typeof raw !== "string")
          throw new Error("Received non-string message");

        const message: ChatMessage = JSON.parse(raw);
        const userIds = await getUsersInRoom(roomId);

        for (const userId of userIds) {
          await redis.publish(
            `ws:deliver:${userId}`,
            JSON.stringify({
              type: "message",
              roomId,
              ...message,
            }),
          );
        }
      } catch (err) {
        console.error("Error handling chat pubsub message:", err);
      }
    },
  );
})();
