import { type NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email";
import prisma from "@/lib/prisma";

// Vercel Cron hits this daily; the only credential is the shared secret, so
// an unset CRON_SECRET means the route always answers 401.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const memberships = await prisma.householdMembership.findMany({
    where: {
      emailDigest: true,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  let sent = 0;

  for (const membership of memberships) {
    const notifications = await prisma.notification.findMany({
      where: {
        householdId: membership.householdId,
        userId: membership.userId,
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // The digest emails unread activity but never marks notifications read.
    if (notifications.length === 0) continue;

    const items = notifications.map(
      (notification) => `<li>${escapeHtml(notification.message)}</li>`,
    );

    await sendEmail({
      to: membership.user.email,
      subject: `Your Sora digest: ${notifications.length} new ${
        notifications.length === 1 ? "notification" : "notifications"
      }`,
      text: `Hi ${membership.user.name}, here are your household notifications from the last 24 hours:\n\n${notifications
        .map((notification) => `- ${notification.message}`)
        .join("\n")}\n`,
      html: `<p>Hi ${escapeHtml(membership.user.name)}, here are your household notifications from the last 24 hours:</p><ul>${items.join(
        "",
      )}</ul><p>Open Sora to see them in the app.</p>`,
    });
    sent += 1;
  }

  return NextResponse.json({ sent });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
