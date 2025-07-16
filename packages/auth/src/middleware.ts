import { Request, Response, NextFunction } from "express";
import passport from "passport";
import type { User } from "@repo/db/client";

interface CustomRequest extends Request {
  userId?: string;
}

export function auth(req: CustomRequest, res: Response, next: NextFunction) {
  passport.authenticate(
    "jwt",
    { session: false },
    function (err: Error | null, user: User | false, info: any) {
      if (err || !user) {
        return res
          .status(401)
          .json({ message: "Unauthorized: Invalid or missing token" });
      }

      req.userId = user.id;
      next();
    },
  )(req, res, next);
}
