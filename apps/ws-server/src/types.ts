export type chat = {
  roomId: number;
  text: string;
};

export type canvas = {
  roomId: number;
  diff: JSON;
};

export type cursor = {
  roomId: number;
  x: number;
  y: number;
};

export type ElementType = "rectangle" | "ellipse" | "text" | "arrow" | "line";

export interface Element {
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

export type CanvasAction = "add" | "update" | "delete";

export interface CanvasDiff {
  roomId: number;
  action: CanvasAction;
  id: string;
  data: Partial<Element>;
}

export interface CanvasPayload {
  roomId: number;
  diff: CanvasDiff;
}
