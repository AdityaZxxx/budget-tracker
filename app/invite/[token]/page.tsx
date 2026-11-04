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
import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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

  // The token is a bearer credential: holding it authorizes joining this
  // one household, so the upsert is keyed only on household + user.
  await prisma.householdMembership.upsert({
    where: {
      householdId_userId: {
        householdId: inviteLink.householdId,
        userId: session.user.id,
      },
    },
    update: {},
    create: {
      householdId: inviteLink.householdId,
      userId: session.user.id,
    },
  });

  redirect("/");
};

export default InvitePage;

const InvalidInviteLink = () => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo />
      <Card className="mt-12 w-[350px] sm:w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl">Invite link unavailable</CardTitle>
          <CardDescription>
            This invite link is invalid or has been revoked. Ask a member of
            the household for a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" render={<Link href="/" />}>
            Go to Sora
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
