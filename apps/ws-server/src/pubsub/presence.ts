import { redisSubscriber } from "@repo/cache/subscriber";
import { getRoomPresence } from "@repo/cache/presence";
import { getUsersInRoom } from "@repo/cache/room";
import { redis } from "@repo/cache/client";

(async () => {
  await redisSubscriber.psubscribe("presence:room:*");

  redisSubscriber.on(
    "pmessage",
    async (_pattern: string, channel: string, raw: string) => {
      try {
        const roomId = parseInt(raw);
        if (isNaN(roomId)) return;

        const userIds = await getUsersInRoom(roomId);
        const users = await getRoomPresence(roomId);

        const payload = {
          type: "presence-update",
          roomId,
          users,
        };

        for (const uid of userIds) {
          await redis.publish(`ws:deliver:${uid}`, JSON.stringify(payload));
        }
      } catch (err) {
        console.error("Error in presence pubsub handler:", err);
      }
    },
  );
})();
