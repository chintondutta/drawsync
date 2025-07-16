import { redis } from "./index";

export async function setUserPresence(
  roomId: number,
  userId: string,
  data: { userName: string; lastActive: number },
) {
  await redis.hset(`presence:room:${roomId}`, userId, JSON.stringify(data));
}

export async function removeUserPresence(roomId: number, userId: string) {
  await redis.hdel(`presence:room:${roomId}`, userId);
}

export async function getRoomPresence(roomId: number) {
  const raw = await redis.hgetall(`presence:room:${roomId}`);
  return Object.entries(raw).map(([userId, value]) => ({
    userId,
    ...(JSON.parse(value) as { userName: string; lastActive: number }),
  }));
}

export async function publishPresenceUpdate(roomId: number) {
  await redis.publish(`presence:room:${roomId}`, `${roomId}`);
}
