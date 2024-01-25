import bcrypt from "bcrypt";

const SALT_ROUNDS = 9;

// hashing
export const crypt = {
  async hash(plainText: string) {
    return await bcrypt.hashSync(plainText, SALT_ROUNDS);
  },
  async verify(plainText: string, hash: string) {
    return await bcrypt.compareSync(plainText, hash);
  },
};

export * from "./database.js";
export * from "./auth.js";
