"use client";

import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Link2,
  MoreHorizontal,
  Pencil,
  TrashIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { CurrencyComboBox } from "@/components/CurrencyComboBox";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import AddIconButton from "@/components/ui/add-icon-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmptyStateUI from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCallerRole } from "@/hooks/use-members";
import { POLL_INTERVAL } from "@/lib/constants";
import { cn } from "@/lib/utils";

import CreateCategoryDialog from "../../_components/CreateCategoryDialog";
import DeleteCategoryDialog from "../../_components/DeletecategoryDialog";
import EditCategoryDialog from "../../_components/EditCategoryDialog";
import AccountSection from "./AccountSection";
import AgentAccessSection from "./AgentAccessSection";
import BudgetsSection from "./BudgetsSection";
import HouseholdSection from "./HouseholdSection";
import InviteLinkDialog from "./InviteLinkDialog";
import MembersSection from "./MembersSection";

const ManagePageClient = () => {
  const { canEdit } = useCallerRole();

  return (
    <div className="min-h-screen bg-background px-6">
      <header className="border-b bg-card py-8">
        <div className="container">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Manage</h1>
            <p className="text-muted-foreground">
              Manage your categories, budgets, and account
            </p>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="space-y-8">
          <HouseholdSection canEdit={canEdit} />

          {canEdit && (
            <section>
              <Card className="transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Invite link</CardTitle>
                  <CardDescription>
                    Share a revocable link or QR code to add another member to
                    your household
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InviteLinkDialog
                    trigger={
                      <Button className="gap-2">
                        <Link2 className="h-4 w-4" />
                        Manage invite link
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            </section>
          )}

          <AgentAccessSection canEdit={canEdit} />

          <MembersSection />

          <section>
            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Currency settings</CardTitle>
                <CardDescription>
                  Set the currency for your transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-xs">
                  <CurrencyComboBox />
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">
              Transaction categories
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <CategoryList type="income" canEdit={canEdit} />
              <CategoryList type="expense" canEdit={canEdit} />
            </div>
          </section>

          <BudgetsSection canEdit={canEdit} />

          <AccountSection />
        </div>
      </div>
    </div>
  );
};

export default ManagePageClient;

const COLLAPSED_CATEGORIES = 6;

function CategoryList({
  type,
  canEdit,
}: {
  type: TransactionType;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Category[]>({
    queryKey: ["categories", type],
    queryFn: () =>
      fetch(`/api/categories?type=${type}`).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(
            error.message || "Unable to load categories. Try again.",
          );
        }
        return res.json();
      }),
    retry: 1,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const typeConfig = {
    income: {
      label: "Income",
      color: "text-income-foreground",
      bgColor: "bg-income-soft",
      icon: <TrendingUp className="h-6 w-6 text-income-foreground" />,
    },
    expense: {
      label: "Expense",
      color: "text-expense-foreground",
      bgColor: "bg-expense-soft",
      icon: <TrendingDown className="h-6 w-6 text-expense-foreground" />,
    },
  }[type];

  return (
    <SkeletonWrapper isLoading={isLoading}>
      <Card className="h-full transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${typeConfig.bgColor}`}>
                {typeConfig.icon}
              </div>
              <div>
                <CardTitle>{typeConfig.label} categories</CardTitle>
                <CardDescription>
                  {categories.length}{" "}
                  {categories.length === 1 ? "item" : "items"}
                </CardDescription>
              </div>
            </div>
            {canEdit && (
              <CreateCategoryDialog
                type={type}
                successCallback={() => refetch()}
                trigger={<AddIconButton label={`Create ${type} category`} />}
              />
            )}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-6">
          {isError ? (
            <ErrorState type={type} onRetry={refetch} />
          ) : categories.length === 0 ? (
            <EmptyState type={type} />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {(expanded
                  ? categories
                  : categories.slice(0, COLLAPSED_CATEGORIES)
                ).map((category) => (
                  <CategoryCard
                    key={category.name}
                    category={category}
                    canEdit={canEdit}
                  />
                ))}
              </div>
              {categories.length > COLLAPSED_CATEGORIES && (
                <Button
                  variant="ghost"
                  className="w-full justify-between text-muted-foreground"
                  aria-expanded={expanded}
                  onClick={() => setExpanded((current) => !current)}
                >
                  <span className="text-sm">
                    {expanded
                      ? "Show fewer"
                      : `Show all ${categories.length} ${type} categories`}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expanded && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </SkeletonWrapper>
  );
}

function EmptyState({ type }: { type: TransactionType }) {
  return (
    <EmptyStateUI
      icon={type === "income" ? TrendingUp : TrendingDown}
      hint={`No ${type} categories yet. Add one to get started.`}
    />
  );
}

function ErrorState({
  type,
  onRetry,
}: {
  type: TransactionType;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
      <div className="mb-3 rounded-full bg-destructive/10 p-3">
        <TrashIcon className="h-6 w-6 text-destructive" />
      </div>
      <p className="mb-2 text-sm font-medium text-destructive">
        Unable to load {type} categories. Try again.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

function CategoryCard({
  category,
  canEdit,
}: {
  category: Category;
  canEdit: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="relative flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md">
        <div className="flex min-w-0 items-center gap-4">
          <span className="text-xl" aria-hidden="true">
            {category.icon}
          </span>
          <span className="truncate font-medium">{category.name}</span>
        </div>

        {canEdit && (
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
                        aria-label={`Open actions for ${category.name} category`}
                      />
                    }
                  />
                }
              >
                <span className="sr-only">Open actions</span>
                <MoreHorizontal className="h-4 w-4" />
              </TooltipTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={() => setDeleteOpen(true)}
                >
                  <TrashIcon className="h-4 w-4 text-muted-foreground" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent>Actions</TooltipContent>
          </Tooltip>
        )}
      </div>
      {canEdit && (
        <>
          <EditCategoryDialog
            category={category}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteCategoryDialog
            category={category}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </>
  );
}
