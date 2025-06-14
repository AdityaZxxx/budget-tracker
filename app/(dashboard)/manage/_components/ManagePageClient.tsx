"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusSquare, TrashIcon, TrendingDown, TrendingUp } from "lucide-react";
import { CurrencyComboBox } from "../../../../components/CurrencyComboBox";
import SkeletonWrapper from "../../../../components/SkeletonWrapper";
import { Button } from "../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Separator } from "../../../../components/ui/separator";
import { Category } from "../../../../lib/generated/prisma";
import { TransactionType } from "../../../../lib/types";
import { cn } from "../../../../lib/utils";
import CreateCategoryDialog from "../../_components/CreateCategoryDialog";
import DeleteCategoryDialog from "../../_components/DeletecategoryDialog";

const ManagePageClient = () => {
  return (
    <div className="space-y-8 px-6">
      <header className="border-b bg-card py-8">
        <div className="container">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Manage</h1>
            <p className="text-muted-foreground">
              Manage your account settings and categories
            </p>
          </div>
        </div>
      </header>

      <div className="container space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Currency</CardTitle>
            <CardDescription>
              Set your default currency for transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CurrencyComboBox />
          </CardContent>
        </Card>

        <CategoryList type="income" />
        <CategoryList type="expense" />
      </div>
    </div>
  );
};

export default ManagePageClient;

function CategoryList({ type }: { type: TransactionType }) {
  const {
    data: categories = [],
    isLoading,
    refetch,
  } = useQuery<Category[]>({
    queryKey: ["categories", type],
    queryFn: () =>
      fetch(`/api/categories?type=${type}`).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      }),
  });

  const typeLabel = type === "income" ? "Income" : "Expense";
  const typeColor = type === "income" ? "text-emerald-500" : "text-rose-500";
  const typeIcon =
    type === "income" ? (
      <TrendingUp className="h-6 w-6 text-emerald-500" />
    ) : (
      <TrendingDown className="h-6 w-6 text-rose-500" />
    );

  return (
    <SkeletonWrapper isLoading={isLoading}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-muted p-3">{typeIcon}</div>
              <div>
                <CardTitle>{typeLabel} Categories</CardTitle>
                <CardDescription>Sorted by name</CardDescription>
              </div>
            </div>
            <CreateCategoryDialog
              type={type}
              successCallback={() => refetch()}
              trigger={
                <Button size="sm" className="gap-2">
                  <PlusSquare className="h-4 w-4" />
                  Create
                </Button>
              }
            />
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-6">
          {categories.length === 0 ? (
            <EmptyState type={type} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
  const typeColor = type === "income" ? "text-emerald-500" : "text-rose-500";

  return (
    <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center">
      <p className="mb-1 text-sm text-muted-foreground">
        No <span className={cn("font-medium", typeColor)}>{type}</span>{" "}
        categories yet
      </p>
      <p className="text-sm text-muted-foreground">Create one to get started</p>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border shadow-sm transition-all hover:shadow-md">
      <div className="flex flex-col items-center gap-3 p-6">
        <span className="text-3xl" role="img" aria-label={category.name}>
          {category.icon}
        </span>
        <span className="text-center font-medium">{category.name}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-background/80 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        <DeleteCategoryDialog
          category={category}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="w-full rounded-none text-destructive hover:bg-destructive/10"
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
