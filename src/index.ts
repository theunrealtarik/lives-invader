import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import path from "path";
import { fileURLToPath } from "url";

globalThis.__filename ??= fileURLToPath(import.meta.url);
globalThis.__dirname ??= path.dirname(globalThis.__filename);

import ImageKit from "imagekit";

// const ExpressAuth = import("@auth/express");
import { ExpressAuth } from "@auth/express";

import multer from "multer";
import {
  authOptions,
  crypt,
  db,
  getAuthSession,
  getMessage,
  getProfile,
  getUser,
} from "./lib/index.js";
import { authenticatedUser } from "./middleware/index.js";

dotenv.config();
const env = process.env.NODE_ENV;
const app = express();
const upload = multer();

const ttl = 1000 * 3600 * 24 * 7;
const expires = new Date(Date.now() + ttl);
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY as string,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
  urlEndpoint: process.env.IMAGEKIT_ENDPOINT as string,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": ["'self'", "data:", "ik.imagekit.io"],
        "script-src": ["'self'", "unpkg.com"],
      },
    },
  }),
);

app.use(morgan("dev"));
app.use((req, res, next) => {
  res.message = (content: string) => {
    res.render("partials/error", { message: content });
  };

  next();
});
app.set("views", path.join(__dirname, "../templates"));
app.set("view engine", "pug");
app.use("/api/auth/*", ExpressAuth(authOptions));

// page
app.get("/profile/:profile", async (req, res) => {
  const profileId = req.param("profile");
  try {
    const session = await getAuthSession(req);
    const profile = await getProfile(profileId);
    const user = await getUser(session?.user?.id!);

    if (!profile || !user) return res.redirect("pages/not-found");

    // @ts-ignore
    profile.photos = profile.messages.filter(
      (message) => message.image && message.author_id == profile.user_id,
    );

    res.render("pages/profile", {
      data: profile,
      user: {
        profile_id: user.profile?.id,
        user_id: user.id,
        is_stalking: profile.stalkers.find(
          (profile) => profile.user_id == user?.id,
        ),
        is_local: user.profile?.id == profile.id,
      },
    });
  } catch {
    res.render("pages/not-found");
  }
});

app.get("/profile/:profile/messages/:message", async (req, res) => {
  try {
    const profileId = req.param("profile");
    const messageId = req.param("message");

    const message = await db.message.findFirst({
      where: {
        id: messageId,
        AND: {
          profile_id: profileId,
        },
      },
      include: {
        comments: {
          orderBy: {
            created_at: "desc",
          },
          include: {
            author: {
              include: {
                profile: true,
              },
            },
          },
        },
        author: {
          include: {
            profile: true,
          },
        },
      },
    });

    const session = await getAuthSession(req);
    const profile = await db.profile.findUnique({
      where: { user_id: session?.user?.id! },
    });

    res.render("pages/message", { data: message, user: profile });
  } catch (error) {
    res.redirect("/not-found");
  }
});

app.get("/search", authenticatedUser, async (req, res) => {
  const keyword = (req.query.q as string | null)?.trim();

  if (!keyword) {
    res.render("pages/search", { data: null });
  }

  try {
    const profiles = await db.profile.findMany({
      where: {
        display_name: {
          startsWith: keyword,
        },
      },
    });

    res.render("pages/search", { data: profiles });
  } catch (error) {
    res.render("pages/search", { data: null });
  }
});

app.get("/sign-in", (req, res) => res.render("pages/sign-in"));
app.get("/sign-up", (req, res) => res.render("pages/sign-up"));

// api
app.post(
  "/api/create-message/:profile",
  authenticatedUser,
  async (req, res, next) => {
    try {
      const session = await getAuthSession(req);
      //@ts-ignore
      req.user_id = session?.user?.id;
      next();
    } catch (err) {
      res.status(400).send("FAILED TO RETRIEVE USER SESSION");
    }
  },
  upload.single("image"),
  async (req, res) => {
    const profileId = req.param("profile");
    const file = req.file;
    const payload = req.body as {
      content: string;
    };

    payload.content = payload.content.trim();
    if (payload.content.length == 0) res.status(400).send();

    try {
      const profile = await getProfile(profileId);

      //@ts-ignore;
      const authorId = req.user_id;
      let data = {
        content: payload.content,
        profile_id: profile.id,
        author_id: authorId,
        image: null,
      };

      let query = {
        data,
        include: {
          author: {
            select: {
              profile: true,
            },
          },
        },
      };

      if (!authorId) res.status(400).send("UNAUHENTICATED");
      if (file) {
        const fileSize = file?.buffer.length / 10 ** 6;
        if (fileSize > 0 && fileSize < 2) {
          const image = await imagekit.upload({
            file: file.buffer,
            fileName: file.originalname,
          });
          //@ts-ignore
          data.image = image.url;
        }
      }

      const message = await db.message.create(query);
      res.render("partials/message", { data: message });
    } catch {
      res.status(400).send();
    }
  },
);

app.post("/api/sign-up", upload.single("file"), async (req, res) => {
  const payload = req.body as SignUpPayload;
  const file = req.file;

  try {
    for (const [k, v] of Object.entries(payload)) {
      if (!v) res.message(`${k.toString()} is required`);
      if (v.length == 0) res.message(`the field '${k.toString()}' is missing`);
      if (v.length > 20) res.message(`${k} can not be more than 20 characters`);
    }

    const fileName = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");

    let image;
    if (file && file.buffer.length > 1 * 10 ** 6) {
      res.message("image file is too large");
    } else if (file && file.buffer.length > 0) {
      image = await imagekit.upload({
        file: file.buffer,
        fileName: fileName.concat(file.originalname),
      });
    }

    const hashed = await crypt.hash(payload.password!);
    const user = await db.user.create({
      data: {
        username: payload.username!,
        password: hashed,
        profile: {
          create: {
            relation: payload.relation!,
            occupation: payload.occupation!,
            display_name: payload.displayName!,
            image: image?.url ?? null,
          },
        },
      },
    });

    res.header("HX-Redirect", "/sign-in");
    res.status(200).send();
  } catch (error) {
    res.message(`failed to create user (lmao)`);
  }
});

app.post("/api/stalk/:profile", authenticatedUser, async (req, res) => {
  try {
    const profileId = req.param("profile");
    const profile = await getProfile(profileId);
    const session = await getAuthSession(req);

    console.log(profile);

    if (profile.user_id == session?.user?.id) {
      res.status(400).send();
    }

    await db.profile.update({
      where: { user_id: session?.user?.id! },
      data: {
        stalking: {
          connect: {
            id: profile.id,
          },
        },
      },
    });
    res.header("HX-Refresh", "true");
    res.send("");
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
});

app.get("/api/comments/:message", authenticatedUser, async (req, res) => {
  try {
  } catch (error) {}
});

app.post(
  "/api/comments/:message/create",
  authenticatedUser,
  async (req, res) => {
    try {
      const session = await getAuthSession(req);
      const payload = req.body as { content: string | undefined };

      if (!payload.content) res.status(400).send();

      const messageId = req.param("message");
      const message = await getMessage(messageId);

      if (!message) {
        res.status(400).send();
      }

      const comment = await db.comment.create({
        data: {
          content: payload.content!,
          author_id: session?.user?.id!,
          message_id: messageId,
        },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
        },
      });

      res.render("partials/comment", { data: comment });
    } catch (error) {
      res.header("HX-Redirect", "error");
      res.send();
    }
  },
);

app.get("/*", async (req, res) => {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      res.redirect("/sign-in");
    }

    const user = await getUser(session?.user?.id!);

    if (!user) res.redirect("/sign-in");
    res.redirect(`/profile/${user!.profile!.id}`);
  } catch (error) {
    res.render("pages/not-found.pug");
  }
});

app.listen(process.env.PORT, () => {
  console.log("ENVIROMENT:\t", process.env.NODE_ENV);
  console.log("SERVER:\t", `http://127.0.0.1:${process.env.PORT}`);
});
