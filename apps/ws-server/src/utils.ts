import { socketMap } from "./state";
import type WebSocket from "ws";

export function findSocketByUserId(userId: string): WebSocket | undefined {
  return socketMap.get(userId);
}
