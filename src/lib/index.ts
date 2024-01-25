// hashing
export const crypt = {
  async hash(plainText: string) {
    return await Bun.password.hash(plainText);
  },
  async verify(plainText: string, hash: string) {
    return await Bun.password.verify(plainText, hash);
  },
};

export * from "./database";
export * from "./auth";
