import { redisSubscriber } from "@repo/cache/subscriber";
import { redisPublisher } from "@repo/cache/publisher";
import { flushCanvasQueue } from "@repo/cache/canvas";
import { getUsersInRoom } from "@repo/cache/room";

(async () => {
  await redisSubscriber.psubscribe("canvas:room:*");

  redisSubscriber.on(
    "pmessage",
    async (_pattern: string, channel: string, _rawMessage: string) => {
      try {
        const roomId = parseInt(channel.split(":")[2] ?? "");
        if (isNaN(roomId)) return;

        await flushCanvasQueue(roomId);

        const userIds = await getUsersInRoom(roomId);
        const snapshot = await redisPublisher.get(
          `canvas:snapshot:room:${roomId}`,
        );
        if (!snapshot) return;

        for (const userId of userIds) {
          await redisPublisher.publish(
            `ws:deliver:${userId}`,
            JSON.stringify({
              type: "canvas-sync",
              roomId,
              data: JSON.parse(snapshot),
            }),
          );
        }
      } catch (err) {
        console.error("Error handling canvas pubsub:", err);
      }
    },
  );
})();
