import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function GET() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  const [members, transactions, categories, inviteLinks] = await Promise.all([
    prisma.householdMembership.findMany({
      where: { householdId: household.id },
      select: {
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: { householdId: household.id },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({
      where: { householdId: household.id },
      orderBy: { name: "asc" },
    }),
    // Tokens are bearer credentials, so only metadata is exported.
    prisma.inviteLink.findMany({
      where: { householdId: household.id },
      select: {
        id: true,
        createdById: true,
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    household: {
      id: household.id,
      currency: household.currency,
      createdAt: household.createdAt,
    },
    members: members.map((member) => ({
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      joinedAt: member.joinedAt,
    })),
    transactions,
    categories,
    inviteLinks,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sora-export.json"',
    },
  });
}
