import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import bcrypt from "bcrypt";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Sora password",
        text: `Reset your Sora password: ${url}\nIf you didn't request this, ignore this email.`,
        html: `<p>Reset your Sora password by clicking the link below:</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      });
    },
    password: {
      hash: async (password) => await bcrypt.hash(password, 10),
      verify: async ({ hash, password }) =>
        await bcrypt.compare(password, hash),
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Sora email",
        text: `Verify your Sora email: ${url}`,
        html: `<p>Verify your Sora email by clicking the link below:</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 20,
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
