import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import { prisma, User } from "@repo/db/client";
import { addUserToRoom, removeUserFromRoom } from "@repo/cache/room";
import {
  authRateLimiter,
  generalRateLimiter,
} from "@repo/rate-limiter/http-rate-limiter";
import { errorHandler } from "@repo/error-handler/http-error-handler";
import "@repo/auth/passport";
import passport from "passport";
import jwt from "jsonwebtoken";
import { auth } from "@repo/auth/middleware";
import { JWT_SECRET } from "@repo/auth/jwt_secret";
import bcrypt from "bcrypt";
import { z } from "zod";

interface CustomRequest extends Request {
  userId?: string;
}

const app = express();

app.use(express.json());
app.use(passport.initialize());

app.post(
  "/signup",
  generalRateLimiter,
  async function (req: Request, res: Response) {
    const signupSchema = z.object({
      email: z.string().email().min(3).max(100),
      password: z.string().min(3).max(100),
      name: z.string().min(3).max(100),
      photo: z.string().min(10).max(300),
    });

    const parsed = signupSchema.safeParse(req.body);

    if (!parsed.success) {
      res.json({
        message: "Incorrect Format",
        error: parsed.error,
      });
      return;
    }

    const { email, password, name, photo } = parsed.data;

    try {
      const hashedPassword = await bcrypt.hash(password, 5);
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          photo,
        },
      });
    } catch (err) {
      res.json({
        message: "Email already exists",
      });
      return;
    }

    res.json({
      message: "You are signed up",
    });
  },
);

app.post(
  "/signin",
  generalRateLimiter,
  function (req: Request, res: Response, next: NextFunction) {
    const signinSchema = z.object({
      email: z.string().email().min(3).max(100),
      password: z.string().min(3).max(100),
    });

    const parsed = signinSchema.safeParse(req.body);

    if (!parsed.success) {
      res.json({
        message: "Incorrect Format",
        error: parsed.error,
      });
      return;
    }

    passport.authenticate(
      "local",
      { session: false },
      function (
        err: Error | null,
        user: User | false,
        info: { message?: string } | undefined,
      ) {
        if (err || !user) {
          res
            .status(401)
            .json({ message: info?.message || "Invalid credentials" });
          return;
        }

        const token = jwt.sign({ userId: user.id.toString() }, JWT_SECRET, {
          expiresIn: "1h",
        });
        res.json({ token });
      },
    )(req, res, next);
  },
);

app.post(
  "/room",
  auth,
  authRateLimiter,
  async function (req: CustomRequest, res: Response) {
    const CreateRoomSchema = z.object({
      slug: z.string().min(3).max(100),
    });

    const parsed = CreateRoomSchema.safeParse(req.body);

    if (!parsed.success) {
      res.json({
        message: "Incorrect Format",
        error: parsed.error,
      });
      return;
    }

    const userId = req.userId;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized: userId missing" });
      return;
    }

    try {
      const room = await prisma.room.create({
        data: {
          slug: parsed.data.slug,
          adminId: userId,
        },
      });

      res.json({
        message: "Room created",
        roomId: room.id,
      });
    } catch (err) {
      res.status(411).json({
        message: "Room already exists with the same name",
      });
    }
  },
);

app.delete(
  "/room/:id",
  auth,
  authRateLimiter,
  async function (req: CustomRequest, res: Response) {
    try {
      if (!req.params.id) {
        res.json({ message: "roomId is required" });
        return;
      }

      const roomId = parseInt(req.params.id);

      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      if (room.adminId !== req.userId) {
        res.status(403).json({ message: "Only the admin can delete the room" });
        return;
      }

      await prisma.chat.deleteMany({ where: { roomId } });
      await prisma.roomDrawing.deleteMany({ where: { roomId } });
      await prisma.roomMember.deleteMany({ where: { roomId } });
      await prisma.room.delete({ where: { id: roomId } });

      res.json({ message: "Room deleted successfully" });
    } catch (err) {
      console.log(err);
      res.json({ message: "Error while deleting the room" });
    }
  },
);

app.post(
  "/room/:slug/join",
  auth,
  authRateLimiter,
  async function (req: CustomRequest, res: Response) {
    try {
      const slug = req.params.slug;

      if (!slug) {
        res.status(400).json({ message: "Room slug is required" });
        return;
      }

      const room = await prisma.room.findUnique({
        where: { slug },
      });

      if (!room) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      const existingMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId: req.userId!,
          },
        },
      });

      if (existingMember) {
        res
          .status(400)
          .json({ message: "User is already a member of the room" });
        return;
      }

      await prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId: req.userId!,
        },
      });

      await addUserToRoom(room.id, req.userId!);

      res.status(200).json({ message: "Joined the room successfully" });
    } catch (err) {
      console.error("Join room error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

app.post(
  "/room/:slug/leave",
  auth,
  authRateLimiter,
  async function (req: CustomRequest, res: Response) {
    try {
      const slug = req.params.slug;

      if (!slug) {
        res.status(400).json({ message: "Room slug is required" });
        return;
      }

      const room = await prisma.room.findUnique({
        where: { slug },
      });

      if (!room) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      if (room.adminId === req.userId) {
        res.status(403).json({ message: "Admin cannot leave their own room" });
        return;
      }

      const existingMember = await prisma.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId: req.userId!,
          },
        },
      });

      if (!existingMember) {
        res.status(400).json({ message: "User is not a member of this room" });
        return;
      }

      await prisma.roomMember.delete({
        where: {
          roomId_userId: {
            roomId: room.id,
            userId: req.userId!,
          },
        },
      });

      await removeUserFromRoom(room.id, req.userId!);

      res.status(200).json({ message: "Left the room successfully" });
    } catch (err) {
      console.error("Leave room error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

app.listen(3000);

app.use(errorHandler as unknown as ErrorRequestHandler);
