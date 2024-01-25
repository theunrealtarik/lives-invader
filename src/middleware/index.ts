import { type Session } from "@auth/express";
import type { NextFunction, Request, Response } from "express";
import { authOptions, getAuthSession } from "../lib/index.js";

export async function authenticatedUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = res.locals.session ?? (await getAuthSession(req));

  res.locals.session = session;

  if (session && session.user) {
    return next();
  }

  res.redirect("/sign-in");
}

export async function currentSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await getAuthSession(req);
  res.locals.session = session;
  return next();
}
