import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import bcrypt from "bcrypt";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // Clerk hashes passwords with bcrypt; keep verifying with bcrypt so
    // migrated users can sign in with their existing passwords.
    password: {
      hash: async (password) => await bcrypt.hash(password, 10),
      verify: async ({ hash, password }) =>
        await bcrypt.compare(password, hash),
    },
  },
});

export async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}
