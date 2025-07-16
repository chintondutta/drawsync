import { redis } from "./index";

export async function addUserToRoom(roomId: number, userId: string) {
  await redis.sadd(`room:${roomId}:users`, userId);
}

export async function removeUserFromRoom(roomId: number, userId: string) {
  await redis.srem(`room:${roomId}:users`, userId);
}

export async function getUsersInRoom(roomId: number): Promise<string[]> {
  return await redis.smembers(`room:${roomId}:users`);
}

export async function clearRoomState(roomId: number) {
  const roomKey = `room:${roomId}:users`;
  const presencePattern = `presence:room:${roomId}:user:*`;
  const cursorPattern = `cursor:room:${roomId}:user:*`;

  await redis.del(roomKey);

  const presenceKeys = await redis.keys(presencePattern);
  if (presenceKeys.length > 0) {
    await redis.del(...presenceKeys);
  }

  const cursorKeys = await redis.keys(cursorPattern);
  if (cursorKeys.length > 0) {
    await redis.del(...cursorKeys);
  }
}
