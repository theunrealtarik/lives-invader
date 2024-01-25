import { db } from "./database.js";

import { getSession } from "@auth/express";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Request } from "express";

import CredentialsProvider from "@auth/express/providers/credentials";

export const authOptions = {
  adapter: PrismaAdapter(db),
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Life Invaders",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const { username, password } = credentials as SignInPayload;

        console.log(username, password);
        if (!username && !password) {
          return null;
        }

        try {
          const user = await db.user.findUnique({
            where: { username: username as string },
          });

          if (!user) return null;
          return {
            id: `${user.id}`,
            name: user.username,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token }) {
      return token;
    },
    //@ts-ignore
    session({ session, token }) {
      if (session?.user) {
        const userId = token.sub;
        session.user.id = userId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/404",
    signOut: "/sign-in",
    newUser: "/profile",
  },
  session: {
    strategy: "jwt",
    maxAge: 1000 * 3600 * 24 * 7,
  },
} as AuthOptions;
type AuthOptions = Parameters<typeof getSession>[1];

export const getAuthSession = async (req: Request) => {
  const session = await getSession(req, authOptions);
  return session;
};
