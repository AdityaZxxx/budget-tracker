import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { VIEW_ONLY_ROLE } from "@/lib/constants";
import { requireHousehold } from "@/lib/household";

import { getHouseholdMemberCount } from "./_actions/household";
import AddMemberCta from "./_components/AddMemberCta";
import Balances from "./_components/Balances";
import CreateTransactionDialog from "./_components/CreateTransactionDialog";
import Goals from "./_components/Goals";
import History from "./_components/History";
import Insights from "./_components/Insights";
import Overview from "./_components/Overview";
import SafeToSpend from "./_components/SafeToSpend";
import SharedSpendingCard from "./_components/SharedSpendingCard";
import SimplifyDebts from "./_components/SimplifyDebts";
import UpcomingBills from "./_components/UpcomingBills";

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
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  if (!household.currency) {
    redirect("/wizard");
  }

  const canEdit = result.membership.role !== VIEW_ONLY_ROLE;
  const memberCount = await getHouseholdMemberCount();

  return (
    <div className="h-full bg-background px-6">
      <div className="border-b bg-card">
        <div className="container flex flex-wrap items-center justify-between gap-6 py-8">
          <h1 className="text-3xl font-bold">
            Hello, {session.user.name.split(" ")[0]}! 👋
          </h1>

          {canEdit && (
            <div className="flex items-center gap-3">
              <CreateTransactionDialog
                trigger={
                  <Button
                    variant="default"
                    className="bg-income-action text-white hover:bg-income-action-hover"
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
                    className="bg-expense-action text-white hover:bg-expense-action-hover"
                  >
                    New expense
                  </Button>
                }
                type="expense"
              />
            </div>
          )}
        </div>
      </div>
      {canEdit && <AddMemberCta memberCount={memberCount} />}
      <Overview currency={household.currency} />
      <Insights currency={household.currency} />
      <SafeToSpend currency={household.currency} />
      <UpcomingBills currency={household.currency} canEdit={canEdit} />
      {memberCount > 1 && <SharedSpendingCard currency={household.currency} />}
      {memberCount > 1 && (
        <Balances currency={household.currency} canEdit={canEdit} />
      )}
      {memberCount > 2 && <SimplifyDebts currency={household.currency} />}
      <Goals currency={household.currency} canEdit={canEdit} />
      <History currency={household.currency} />
    </div>
  );
};

export default DashboardPage;
