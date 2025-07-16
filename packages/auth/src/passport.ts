import passport from "passport";
import passportLocal from "passport-local";
import passportJWT from "passport-jwt";

import bcrypt from "bcrypt";

import { prisma } from "@repo/db/client";

import { JWT_SECRET } from "./config";

const local = passportLocal.Strategy;
const jwt = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

passport.use(
  new local({ usernameField: "email" }, async function (
    email: string,
    password: string,
    done,
  ) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return done(null, false, { message: "Incorrect password" });
      }

      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }),
);

interface JWTPayload {
  userId: string;
}
passport.use(
  new jwt(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    },

    async function (JWTPayload: JWTPayload, done) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: JWTPayload.userId },
        });
        if (user) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      } catch (err) {
        return done(err, false);
      }
    },
  ),
);
