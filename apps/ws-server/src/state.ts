import WebSocket from "ws";
import { Element } from "./types";

export const rooms: {
  [roomId: number]: { socket: WebSocket; userId: string }[];
} = {};

export const socketMap: Map<string, WebSocket> = new Map();

export const canvasBuffer: Map<number, Map<string, Element>> = new Map();

export const canvasFlushTimeouts: {
  [roomId: number]: NodeJS.Timeout;
} = {};
