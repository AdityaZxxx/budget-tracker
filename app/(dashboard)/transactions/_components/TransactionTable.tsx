"use client";

import type { Household } from "@prisma/client";
import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";

import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  useTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DownloadIcon,
  MoreHorizontal,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";

import { DataTableColumnHeader } from "@/components/datatable/ColumnHeader";
import { DataTableViewOptions } from "@/components/datatable/Columntoggle";
import { DataTableFacetedFilter } from "@/components/datatable/FacetedFilters";
import {
  appTableFeatures,
  type AppTableFeatures,
} from "@/components/datatable/table-features";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCallerRole } from "@/hooks/use-members";
import { useSession } from "@/lib/auth-client";
import { POLL_INTERVAL } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { type GetTransactionsHistoryResponseType } from "@/lib/transactions";
import { cn } from "@/lib/utils";

import DeleteTransactionDialog from "./DeleteTransactionDialog";

interface Props {
  from: Date;
  to: Date;
}

type TransactionHistoryRow = GetTransactionsHistoryResponseType[0];

const emptyData: TransactionHistoryRow[] = [];
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const columnHelper = createColumnHelper<
  AppTableFeatures,
  TransactionHistoryRow
>();

const buildColumns = (formatAmount: (value: number) => string) =>
  columnHelper.columns([
    columnHelper.accessor("category", {
      id: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">
            {row.original.categoryIcon}
          </span>
          <span className="font-medium capitalize">
            {row.original.category}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor("description", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger
            render={
              // A button, not a div: the truncated description needs a
              // keyboard-reachable trigger for its tooltip; the defaults are
              // neutralised so it reads as plain text.
              <button
                type="button"
                aria-label={row.original.description}
                className="block max-w-[200px] truncate border-0 p-0 text-left capitalize md:max-w-none"
              />
            }
          >
            {row.original.description}
          </TooltipTrigger>
          <TooltipContent>{row.original.description}</TooltipContent>
        </Tooltip>
      ),
    }),
    columnHelper.accessor("addedByName", {
      id: "addedBy",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Added by" />
      ),
      cell: ({ row }) => <AddedByCell transaction={row.original} />,
    }),
    columnHelper.accessor("date", {
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.date);
        const formattedDate = date.toLocaleDateString("default", {
          timeZone: "UTC",
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
        return (
          <div className="whitespace-nowrap text-muted-foreground">
            {formattedDate}
          </div>
        );
      },
      sortFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.date).getTime();
        const dateB = new Date(rowB.original.date).getTime();
        return dateA - dateB;
      },
    }),
    columnHelper.accessor("type", {
      id: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
      cell: ({ row }) => (
        <Badge
          className={cn(
            "border-transparent px-2.5 text-xs font-medium capitalize",
            row.original.type === "income"
              ? "bg-income-badge text-income-foreground"
              : "bg-expense-badge text-expense-foreground",
          )}
        >
          {row.original.type}
        </Badge>
      ),
    }),
    columnHelper.accessor("amount", {
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Amount"
          className="w-full justify-end"
        />
      ),
      cell: ({ row }) => (
        <p
          className={cn(
            "text-right text-sm font-medium tabular-nums",
            row.original.type === "income"
              ? "text-income-foreground"
              : "text-expense-foreground",
          )}
        >
          {row.original.type === "expense" ? "-" : "+"}
          {formatAmount(row.original.amount)}
        </p>
      ),
    }),
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <RowActions transaction={row.original} />,
    }),
  ]);

const TransactionTable = ({ from, to }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const householdQuery = useQuery<Household>({
    queryKey: ["household"],
    queryFn: async () => {
      const res = await fetch("/api/user-settings");
      if (!res.ok) {
        throw new Error("Failed to fetch user settings");
      }
      return res.json();
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
  const currency = householdQuery.data?.currency ?? "USD";
  const formatAmount = getFormatterForCurrency(currency).format;
  const columns = buildColumns(formatAmount);

  const history = useQuery<GetTransactionsHistoryResponseType>({
    queryKey: ["transactions", "history", from, to],
    queryFn: async () => {
      const response = await fetch(
        `/api/transaction-history?from=${format(
          from,
          "yyyy-MM-dd",
        )}&to=${format(to, "yyyy-MM-dd")}`,
      );
      if (!response.ok) throw new Error("Failed to fetch transaction history");
      return response.json();
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const table = useTable({
    data: history.data || emptyData,
    columns,
    features: appTableFeatures,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(table.getPageCount(), 1);

  const csvData = getCsvData(
    history.data,
    formatAmount,
    householdQuery.data?.currency ?? "USD",
  );

  const csvHeaders = [
    { label: "Date", key: "Date" },
    { label: "Category", key: "Category" },
    { label: "Description", key: "Description" },
    { label: "Type", key: "Type" },
    { label: "Amount", key: "Amount" },
    { label: "Currency", key: "Currency" },
  ];

  const categoriesOptions = getCategoryOptions(history.data ?? []);

  const typeOptions = [
    { label: "Income", value: "income" },
    { label: "Expense", value: "expense" },
  ];

  const downloadCsv = () => {
    if (csvData.length === 0) return;
    const lines = [
      csvHeaders.map((h) => escapeCell(h.label)).join(","),
      ...csvData.map((row) =>
        csvHeaders
          .map((h) => escapeCell((row as Record<string, string>)[h.key]))
          .join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions_${from.toISOString().split("T")[0]}_to_${
      to.toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {table.getColumn("category") && (
            <DataTableFacetedFilter
              title="Category"
              column={table.getColumn("category")}
              options={categoriesOptions}
            />
          )}
          {table.getColumn("type") && (
            <DataTableFacetedFilter
              title="Type"
              column={table.getColumn("type")}
              options={typeOptions}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
          <Button
            type="button"
            variant="outline"
            className="h-10 sm:h-9"
            onClick={downloadCsv}
            disabled={csvData.length === 0}
          >
            <DownloadIcon />
            <span className="sr-only sm:not-sr-only">Export CSV</span>
          </Button>
        </div>
      </div>

      <SkeletonWrapper isLoading={history.isLoading}>
        <div className="relative rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {history.isError ? (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-destructive">
                          Unable to load transactions. Check your connection and
                          try again.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => history.refetch()}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <p className="font-medium">Nothing in this range</p>
                        <p className="text-sm text-muted-foreground">
                          Try a different date range, or clear the filters to
                          see everything.
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Scroll cue; the table always overflows below xl. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-lg bg-gradient-to-l from-background via-background/60 to-transparent xl:hidden"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) =>
                setPagination({ pageIndex: 0, pageSize: Number(value) })
              }
              items={Object.fromEntries(
                PAGE_SIZE_OPTIONS.map((size) => [
                  String(size),
                  `${size} / page`,
                ]),
              )}
            >
              <SelectTrigger aria-label="Rows per page" className="h-10 sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
              Page {pagination.pageIndex + 1} of {pageCount}
              <span className="hidden sm:inline">
                : {totalRows} {totalRows === 1 ? "row" : "rows"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PageButton
              label="Go to first page"
              className="hidden lg:inline-flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft />
            </PageButton>
            <PageButton
              label="Go to previous page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </PageButton>
            <PageButton
              label="Go to next page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </PageButton>
            <PageButton
              label="Go to last page"
              className="hidden lg:inline-flex"
              onClick={() =>
                table.setPageIndex(Math.max(table.getPageCount() - 1, 0))
              }
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight />
            </PageButton>
          </div>
        </div>
      </SkeletonWrapper>
    </div>
  );
};

export default TransactionTable;

function getCsvData(
  transactions: GetTransactionsHistoryResponseType | undefined,
  formatAmount: (value: number) => string,
  currency: string,
) {
  if (!transactions) return [];

  return transactions.map((transaction) => ({
    Date: new Date(transaction.date).toLocaleDateString(),
    Category: transaction.category,
    Description: transaction.description,
    Type: transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
    Amount:
      transaction.type === "expense"
        ? `-${formatAmount(transaction.amount)}`
        : formatAmount(transaction.amount),
    Currency: currency,
  }));
}

function getCategoryOptions(transactions: GetTransactionsHistoryResponseType) {
  const categories = new Map<string, { value: string; label: string }>();
  for (const transaction of transactions) {
    categories.set(transaction.category, {
      value: transaction.category,
      label: `${transaction.categoryIcon} ${transaction.category}`,
    });
  }
  return Array.from(categories.values());
}

function escapeCell(value: string) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function PageButton({
  label,
  className,
  disabled,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className={cn("inline-flex", className)} />}
      >
        <Button
          variant="outline"
          size="icon"
          className="size-10"
          onClick={onClick}
          disabled={disabled}
        >
          <span className="sr-only">{label}</span>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function AddedByCell({ transaction }: { transaction: TransactionHistoryRow }) {
  const { data: session } = useSession();
  const isSelf = session?.user.id === transaction.addedById;
  return (
    <div className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
      <span>{isSelf ? "You" : `added by ${transaction.addedByName}`}</span>
      {!transaction.shared && (
        <Badge variant="outline" className="text-xs">
          Personal
        </Badge>
      )}
      {transaction.addedVia === "agent" && (
        // The marker says the entry arrived through an assistant, so a Member
        // can spot the ones to check. The label carries the meaning on its
        // own and the tooltip only adds the detail.
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <Badge variant="outline" className="text-xs">
              Via agent
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Added through an assistant</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function RowActions({ transaction }: { transaction: TransactionHistoryRow }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { canEdit } = useCallerRole();

  if (!canEdit) return null;

  return (
    <>
      <DeleteTransactionDialog
        setOpen={setShowDeleteDialog}
        open={showDeleteDialog}
        transactionId={transaction.id}
      />
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant={"ghost"}
                    size="icon"
                    className="max-sm:size-10"
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
              onClick={() => {
                setShowDeleteDialog((prev) => !prev);
              }}
            >
              <TrashIcon className="h-4 w-4 text-muted-foreground" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent>Actions</TooltipContent>
      </Tooltip>
    </>
  );
}
