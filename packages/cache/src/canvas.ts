import { prisma } from "@repo/db/client";
import { Prisma } from "@prisma/client";
import { redis } from "./index";
import { redisPublisher } from "./publisher";

type ElementType = "rectangle" | "ellipse" | "text" | "arrow" | "line";

interface Element {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  angle?: number;
  text?: string;
  version: number;
  versionNonce: number;
  seed: number;
  updatedAt: number;
  deleted?: boolean;
}

export async function enqueueCanvasUpdate(roomId: number, element: Element) {
  if (!element || typeof element !== "object" || !element.id) {
    console.error("Tried to enqueue invalid canvas element:", element);
    return;
  }

  const queueKey = `canvas:queue:room:${roomId}`;

  await redis.rpush(queueKey, JSON.stringify(element));
  await redisPublisher.publish(`canvas:room:${roomId}`, "update");
}

export async function flushCanvasQueue(roomId: number) {
  const queueKey = `canvas:queue:room:${roomId}`;
  let flushed: Element[] = [];

  while (true) {
    const item = await redis.lpop(queueKey);
    if (!item) break;

    try {
      const parsed: Element = JSON.parse(item);
      flushed.push(parsed);
    } catch (err) {
      console.error("Failed to parse item from Redis queue:", item);
    }
  }

  if (flushed.length === 0) {
    console.warn("No flushed canvas items found");
    return;
  }

  const existingRecord = await prisma.roomDrawing.findUnique({
    where: { roomId },
  });
  let canvasData: Element[] = [];

  if (existingRecord?.data) {
    try {
      const raw =
        typeof existingRecord.data === "string"
          ? JSON.parse(existingRecord.data)
          : existingRecord.data;

      if (Array.isArray(raw)) {
        canvasData = raw.filter(
          (item): item is Element =>
            item &&
            typeof item === "object" &&
            "id" in item &&
            "type" in item &&
            "version" in item,
        );
      } else {
        console.warn("Existing canvas data is not an array:", raw);
      }
    } catch (err) {
      console.error("Error parsing canvas data from DB:", err);
    }
  }

  for (const el of flushed) {
    const index = canvasData.findIndex((e) => e.id === el.id);

    if (el.deleted) {
      if (index !== -1) {
        canvasData.splice(index, 1);
      }
    } else {
      if (index !== -1) {
        canvasData[index] = el;
      } else {
        canvasData.push(el);
      }
    }
  }

  await prisma.roomDrawing.upsert({
    where: { roomId },
    update: { data: canvasData as unknown as Prisma.JsonArray },
    create: { roomId, data: canvasData as unknown as Prisma.JsonArray },
  });

  await redis.set(
    `canvas:snapshot:room:${roomId}`,
    JSON.stringify(canvasData),
    "EX",
    300,
  );
  await redis.set(
    `canvas:room:${roomId}`,
    JSON.stringify(canvasData),
    "EX",
    300,
  );
}

export async function getCanvasSnapshot(roomId: number): Promise<Element[]> {
  const raw = await redis.get(`canvas:snapshot:room:${roomId}`);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const CANVAS_KEY = (roomId: number) => `canvas:room:${roomId}`;

export async function getCanvasHistory(roomId: number): Promise<Element[]> {
  const key = CANVAS_KEY(roomId);

  const cached = await redis.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      console.warn("Failed to parse canvas from Redis, falling back to DB");
    }
  }

  const dbCanvas = await prisma.roomDrawing.findUnique({ where: { roomId } });
  let data: Element[] = [];

  if (dbCanvas?.data) {
    try {
      const parsed =
        typeof dbCanvas.data === "string"
          ? JSON.parse(dbCanvas.data)
          : dbCanvas.data;

      if (Array.isArray(parsed)) {
        data = parsed.filter(
          (item): item is Element =>
            item && typeof item === "object" && "id" in item && "type" in item,
        );
      }
    } catch {
      data = [];
    }
  }

  await redis.set(key, JSON.stringify(data), "EX", 300);
  return data;
}

export async function cacheCanvasHistory(roomId: number, data: Element[]) {
  await redis.set(CANVAS_KEY(roomId), JSON.stringify(data), "EX", 300);
}
