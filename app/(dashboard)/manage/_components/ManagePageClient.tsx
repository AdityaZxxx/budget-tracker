"use client";

import { CurrencyComboBox } from "@/components/CurrencyComboBox";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Category } from "@/lib/generated/prisma";
import { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { PlusSquare, TrashIcon, TrendingDown, TrendingUp } from "lucide-react";
import CreateCategoryDialog from "../../_components/CreateCategoryDialog";
import DeleteCategoryDialog from "../../_components/DeletecategoryDialog";

const ManagePageClient = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card py-8 px-6">
        <div className="container">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Manage</h1>
            <p className="text-muted-foreground">
              Manage your account settings and categories
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <section>
            <Card className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Currency Settings</CardTitle>
                <CardDescription>
                  Set your default currency for all transactions
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
            <h2 className="text-2xl font-semibold tracking-tight">
              Transaction Categories
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <CategoryList type="income" />
              <CategoryList type="expense" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ManagePageClient;

function CategoryList({ type }: { type: TransactionType }) {
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
          throw new Error(error.message || "Failed to fetch categories");
        }
        return res.json();
      }),
    retry: 1,
  });

  const typeConfig = {
    income: {
      label: "Income",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      icon: <TrendingUp className="h-6 w-6 text-emerald-500" />,
    },
    expense: {
      label: "Expense",
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      icon: <TrendingDown className="h-6 w-6 text-rose-500" />,
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
                <CardTitle>{typeConfig.label} Categories</CardTitle>
                <CardDescription>
                  {categories.length}{" "}
                  {categories.length === 1 ? "item" : "items"}
                </CardDescription>
              </div>
            </div>
            <CreateCategoryDialog
              type={type}
              successCallback={() => refetch()}
              trigger={
                <Button
                  size="sm"
                  className="gap-2"
                  aria-label={`Create ${type} category`}
                >
                  <PlusSquare className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only">Create</span>
                </Button>
              }
            />
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-6">
          {isError ? (
            <ErrorState type={type} onRetry={refetch} />
          ) : categories.length === 0 ? (
            <EmptyState type={type} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {categories.map((category) => (
                <CategoryCard key={category.name} category={category} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </SkeletonWrapper>
  );
}

function EmptyState({ type }: { type: TransactionType }) {
  const typeConfig = {
    income: {
      label: "income",
      color: "text-emerald-500",
    },
    expense: {
      label: "expense",
      color: "text-rose-500",
    },
  }[type];

  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center">
      <div className="mb-2 rounded-full bg-muted p-3">
        {type === "income" ? (
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
        ) : (
          <TrendingDown className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        No{" "}
        <span className={cn("font-medium", typeConfig.color)}>
          {typeConfig.label}
        </span>{" "}
        categories yet
      </p>
      <p className="text-sm text-muted-foreground">Create one to get started</p>
    </div>
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
        Failed to load {type} categories
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

function CategoryCard({ category }: { category: Category }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border transition-all hover:shadow-md">
      <div className="flex items-center gap-4 p-4">
        <span className="text-2xl" role="img" aria-label={category.name}>
          {category.icon}
        </span>
        <span className="font-medium">{category.name}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-background/90 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        <DeleteCategoryDialog
          category={category}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="w-full rounded-none text-destructive hover:bg-destructive/10"
              aria-label={`Delete ${category.name} category`}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete
            </Button>
          }
        />
      </div>
    </div>
  );
}
