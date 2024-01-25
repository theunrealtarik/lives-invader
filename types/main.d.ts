import { User } from "@prisma/client";
import { Session } from "@auth/express";
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: number;
    }
  }

  namespace Express {
    interface Response {
      message: (content: string) => void;
      locals: { session: Session | null };
    }
  }

  // payloads
  interface SignInPayload {
    username?: string;
    password?: string;
  }

  interface SignUpPayload extends SignInPayload {
    displayName?: string;
    relation?: string;
    occupation?: string;
  }
}

declare module "express-session" {
  interface SessionData {
    user: (User & { session_id: string }) | null;
  }
}
