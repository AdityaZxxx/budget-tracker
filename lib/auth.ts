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
    password: {
      hash: async (password) => await bcrypt.hash(password, 10),
      verify: async ({ hash, password }) =>
        await bcrypt.compare(password, hash),
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});

export async function getSession() {
  return await auth.api.getSession({
    headers: await headers(),
  });
}
