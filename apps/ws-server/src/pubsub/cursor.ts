import { redisSubscriber } from "@repo/cache/subscriber";
import { getUsersInRoom } from "@repo/cache/room";
import { redis } from "@repo/cache/client";

(async () => {
  await redisSubscriber.psubscribe("cursor:room:*");

  redisSubscriber.on(
    "pmessage",
    async (_pattern: string, channel: string, raw: string) => {
      try {
        const roomId = parseInt(channel.split(":")[2] ?? "");
        if (isNaN(roomId)) return;

        if (typeof raw !== "string")
          throw new Error("Non-string message from Redis");

        const { userId, x, y } = JSON.parse(raw);
        const userIds = await getUsersInRoom(roomId);

        for (const uid of userIds) {
          if (uid !== userId) {
            await redis.publish(
              `ws:deliver:${uid}`,
              JSON.stringify({
                type: "cursor-update",
                roomId,
                userId,
                x,
                y,
              }),
            );
          }
        }
      } catch (err) {
        console.error("Error in cursor pubsub handler:", err);
      }
    },
  );
})();
