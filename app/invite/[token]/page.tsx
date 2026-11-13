import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

import JoinHouseholdCard from "./JoinHouseholdCard";

export const metadata: Metadata = {
  title: "Household invite",
  robots: {
    index: false,
    follow: false,
  },
};

const InvitePage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;
  // getSession reads headers(), which opts this route into dynamic
  // rendering before any database query runs.
  const session = await getSession();

  const inviteLink = await prisma.inviteLink.findFirst({
    where: {
      token,
      revokedAt: null,
    },
  });

  if (!inviteLink) {
    return <InvalidInviteLink />;
  }

  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const existingMembership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: inviteLink.householdId,
        userId: session.user.id,
      },
    },
  });

  if (existingMembership) {
    redirect("/");
  }

  const [household, inviter] = await Promise.all([
    prisma.household.findUnique({
      where: {
        id: inviteLink.householdId,
      },
      select: {
        name: true,
      },
    }),
    prisma.user.findUnique({
      where: {
        id: inviteLink.createdById,
      },
      select: {
        name: true,
      },
    }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo />
      <JoinHouseholdCard
        token={token}
        householdName={household?.name ?? null}
        inviterName={inviter?.name ?? null}
      />
    </div>
  );
};

export default InvitePage;

const InvalidInviteLink = () => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo />
      <Card className="mt-12 w-[min(400px,calc(100vw-2rem))]">
        <CardHeader>
          <CardTitle className="text-xl">Invite link unavailable</CardTitle>
          <CardDescription>
            This invite link is invalid or has been revoked. Ask a member of the
            household for a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/" />}
          >
            Go to Sora
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
