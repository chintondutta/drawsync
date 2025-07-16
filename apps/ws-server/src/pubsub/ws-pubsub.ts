import { redisSubscriber } from "@repo/cache/subscriber";
import { socketMap } from "../state";

(async () => {
  await redisSubscriber.psubscribe("ws:deliver:*");

  redisSubscriber.on(
    "pmessage",
    async (_pattern: string, channel: string, raw: string) => {
      try {
        const userId = channel.split(":")[2];
        if (!userId) return;

        const socket = socketMap.get(userId);
        if (!socket || socket.readyState !== 1) return;

        if (typeof raw !== "string") return;

        socket.send(raw);
      } catch (err) {
        console.error("Failed to dispatch message via ws:deliver:", err);
      }
    },
  );
})();
