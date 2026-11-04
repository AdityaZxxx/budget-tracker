import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { type Metadata } from "next";
import { redirect } from "next/navigation";
import CreateTransactionDialog from "./_components/CreateTransactionDialog";
import History from "./_components/History";
import Overview from "./_components/Overview";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your personal dashboard to track income, expenses, and see a complete overview of your financial health.",

  robots: {
    index: false,
    follow: false,
  },
};

const DashboardPage = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const userSettings = await prisma.userSettings.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!userSettings) {
    redirect("/wizard");
  }
  return (
    <div className="h-full bg-background px-6">
      <div className="border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-6 py-8">
          <h1 className="text-3xl font-bold">
            Hello, {session.user.name.split(" ")[0]}! 👋
          </h1>

          <div className="flex items-center gap-3">
            <CreateTransactionDialog
              trigger={
                <Button
                  variant="default"
                  className="bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-800"
                >
                  New income
                </Button>
              }
              type="income"
            />
            <CreateTransactionDialog
              trigger={
                <Button
                  variant="default"
                  className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800"
                >
                  New expense
                </Button>
              }
              type="expense"
            />
          </div>
        </div>
      </div>
      <Overview userSettings={userSettings} />
      <History userSettings={userSettings} />
    </div>
  );
};

export default DashboardPage;
