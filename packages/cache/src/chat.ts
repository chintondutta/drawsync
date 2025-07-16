import { redis } from "./index";

export interface ChatMessage {
  userId: string;
  userName: string;
  message: string;
}

export async function pushChatMessage(roomId: number, msg: ChatMessage) {
  await redis.lpush(`chat:room:${roomId}`, JSON.stringify(msg));
  await redis.ltrim(`chat:room:${roomId}`, 0, 49);
}

export async function getRecentMessages(
  roomId: number,
): Promise<ChatMessage[]> {
  const list = await redis.lrange(`chat:room:${roomId}`, 0, 49);
  return list.map((item) => JSON.parse(item));
}

export async function publishChatMessage(roomId: number, msg: ChatMessage) {
  await redis.publish(`chat:room:${roomId}`, JSON.stringify(msg));
}
