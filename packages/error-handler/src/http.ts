import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error("[HTTP Error]", err);

  if (err.name === "UnauthorizedError") {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({ message: "Token expired" });
    return;
  }

  if (err.name === "JsonWebTokenError") {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
}
