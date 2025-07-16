import Redis from "ioredis";
import { REDIS_URL } from "./config";

if (!REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}
export const redisPublisher = new Redis(REDIS_URL);
