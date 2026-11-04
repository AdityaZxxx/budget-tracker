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
import { notify, notifyMembers } from "@/lib/notifications";
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
  // one household, so the membership is keyed only on household + user.
  const existingMembership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: inviteLink.householdId,
        userId: session.user.id,
      },
    },
  });

  if (!existingMembership) {
    await prisma.householdMembership.create({
      data: {
        householdId: inviteLink.householdId,
        userId: session.user.id,
      },
    });

    // The link creator gets a dedicated event; everyone else just sees the
    // join, so the creator is excluded from the member_joined fan-out.
    const otherMembers = await prisma.householdMembership.findMany({
      where: {
        householdId: inviteLink.householdId,
        userId: {
          notIn: [session.user.id, inviteLink.createdById],
        },
      },
      select: {
        userId: true,
      },
    });
    await notifyMembers(
      inviteLink.householdId,
      otherMembers.map((membership) => membership.userId),
      "member_joined",
      `${session.user.name} joined the household.`
    );
    if (inviteLink.createdById !== session.user.id) {
      await notify(
        inviteLink.householdId,
        inviteLink.createdById,
        "invite_accepted",
        `${session.user.name} accepted your invite and joined the household.`
      );
    }
  }

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
