import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "../../components/ui/button";
import { prisma } from "../../lib/prisma";
import CreateTransactionDialog from "./_components/CreateTransactionDialog";
import History from "./_components/History";
import Overview from "./_components/Overview";

const page = async () => {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const userSettings = await prisma.userSettings.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (!userSettings) {
    redirect("/wizard");
  }
  return (
    <div className="h-full bg-background px-6">
      <div className="border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-6 py-8">
          <p className="text-3xl font-bold">Hello, {user.firstName}! 👋</p>

          <div className="flex items-center gap-3">
            <CreateTransactionDialog
              trigger={
                <Button
                  variant="default"
                  className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
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

export default page;
