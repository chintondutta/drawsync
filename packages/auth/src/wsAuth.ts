import jwt from "jsonwebtoken";
import { IncomingMessage } from "http";
import { prisma } from "@repo/db/client";
import { JWT_SECRET } from "./config";

interface JWTPayload {
  userId: string;
}

export interface AuthenticatedSocket extends WebSocket {
  userId?: string;
}

export async function authenticateWsRequest(
  req: IncomingMessage,
): Promise<{ isAuthenticated: boolean; userId?: string; error?: string }> {
  try {
    const url = new URL(req.url || "", `ws://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      return { isAuthenticated: false };
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return { isAuthenticated: false };
    }

    return { isAuthenticated: true, userId: user.id };
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return { isAuthenticated: false, error: "Token expired" };
    }

    if (err.name === "JsonWebTokenError") {
      return { isAuthenticated: false, error: "Invalid token" };
    }

    console.error("WebSocket auth error:", err);
    return { isAuthenticated: false, error: "Unknown token error" };
  }
}
