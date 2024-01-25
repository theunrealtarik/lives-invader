import { PrismaClient, User } from "@prisma/client";
import type { Request } from "express";

export const db = new PrismaClient();

// get some user, duh
export const getUser = async (userId: string) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  return user;
};

// get some user's profile from db or throw up
export const getProfile = async (profileId: string) => {
  const profile = await db.profile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      messages: {
        orderBy: {
          created_at: "desc",
        },
        include: {
          author: {
            select: {
              profile: {
                select: {
                  id: true,
                  display_name: true,
                  image: true,
                },
              },
              password: false,
            },
          },
        },
      },
      stalkers: true,
      stalking: true,
    },
  });

  return profile;
};

// get message from db or throw up
export const getMessage = async (messageId: string, comments?: boolean) => {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: {
      author: {
        select: {
          profile: true,
        },
      },
      comments: comments
        ? {
            include: {
              author: true,
            },
          }
        : undefined,
    },
  });

  return message;
};
