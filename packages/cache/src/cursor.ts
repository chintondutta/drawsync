import { redis } from "./index";

export async function setUserCursor(
  roomId: number,
  userId: string,
  data: { x: number; y: number },
) {
  await redis.set(
    `cursor:room:${roomId}:user:${userId}`,
    JSON.stringify(data),
    "EX",
    60,
  );
}

export async function getRoomCursors(roomId: number) {
  const keys = await redis.keys(`cursor:room:${roomId}:user:*`);

  if (keys.length === 0) return [];

  const values = await redis.mget(keys);

  return keys.map((key, i) => {
    const parts = key.split(":");
    const userId = parts[parts.length - 1];
    try {
      return {
        userId,
        ...JSON.parse(values[i] ?? "{}"),
      };
    } catch {
      return { userId };
    }
  });
}

export async function publishCursorUpdate(roomId: number, payload: any) {
  await redis.publish(`cursor:room:${roomId}`, JSON.stringify(payload));
}
