"use client";

import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

import { useQuery } from "@tanstack/react-query";
import { flexRender } from "@tanstack/react-table";
import {
  LegacyColumnDef as ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable as useReactTable,
} from "@tanstack/react-table/legacy";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  DownloadIcon,
  MoreHorizontal,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";

import { DataTableColumnHeader } from "@/components/datatable/ColumnHeader";
import { DataTableViewOptions } from "@/components/datatable/Columntoggle";
import { DataTableFacetedFilter } from "@/components/datatable/FacetedFilters";
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
import { useSession } from "@/lib/auth-client";
import { dateToUtcDate } from "@/lib/helpers";
import { cn } from "@/lib/utils";

import { GetTrasactionsHistoryResponseType } from "../../../api/transaction-history/route";
import DeleteTransactionDialog from "./DeleteTransactionDialog";

interface Props {
  from: Date;
  to: Date;
}

const emptyData: any[] = [];
type TransactionHistoryRow = GetTrasactionsHistoryResponseType[0];

export const columns: ColumnDef<TransactionHistoryRow>[] = [
  {
    id: "category",
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="text-xl" aria-hidden="true">
          {row.original.categoryIcon}
        </span>
        <span className="font-medium capitalize">{row.original.category}</span>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <Tooltip>
        <TooltipTrigger
          render={
            // A button, not a div: the tooltip reveals the description that
            // the cell truncates, so the trigger has to be reachable by
            // keyboard. The button defaults are neutralised to keep it
            // looking like the plain text it replaces.
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
  },
  {
    id: "addedBy",
    accessorKey: "addedByName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Added by" />
    ),
    cell: ({ row }) => <AddedByCell transaction={row.original} />,
  },
  {
    accessorKey: "date",
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
  },
  {
    id: "type",
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => (
      <div
        className={cn(
          "w-fit rounded-full px-4 py-1 text-sm font-medium capitalize",
          row.original.type === "income"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
            : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400",
        )}
      >
        {row.original.type}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => (
      <p
        className={cn(
          "text-sm font-medium tabular-nums",
          row.original.type === "income"
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400",
        )}
      >
        {row.original.type === "expense" ? "-" : "+"}
        {row.original.formattedAmount}
      </p>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <RowActions transaction={row.original} />,
  },
];

const TransactionTable = ({ from, to }: Props) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const history = useQuery<GetTrasactionsHistoryResponseType>({
    queryKey: ["transactions", "history", from, to],
    queryFn: async () => {
      const response = await fetch(
        `/api/transaction-history?from=${dateToUtcDate(
          from,
        )}&to=${dateToUtcDate(to)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch transaction history");
      return response.json();
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const table = useReactTable({
    data: history.data || emptyData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const csvData = getCsvData(history.data);

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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={downloadCsv}
                />
              }
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export CSV
              </span>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <SkeletonWrapper isLoading={history.isLoading}>
        <div className="rounded-lg border">
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
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50"
                  >
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
                        <p className="font-medium">No transactions found</p>
                        <p className="text-sm text-muted-foreground">
                          Try a different date range or clear the filters.
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <Tooltip>
            <TooltipTrigger render={<span className="hidden lg:inline-flex" />}>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to first page</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to previous page</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to next page</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<span className="hidden lg:inline-flex" />}>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to last page</TooltipContent>
          </Tooltip>
        </div>
      </SkeletonWrapper>
    </div>
  );
};

export default TransactionTable;

function getCsvData(
  transactions: GetTrasactionsHistoryResponseType | undefined,
) {
  if (!transactions) return [];

  return transactions.map((transaction) => ({
    Date: new Date(transaction.date).toLocaleDateString(),
    Category: transaction.category,
    Description: transaction.description,
    Type: transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
    Amount:
      transaction.type === "expense"
        ? `-${transaction.formattedAmount}`
        : transaction.formattedAmount,
    Currency: transaction.formattedAmount.replace(/[^a-zA-Z]/g, ""),
  }));
}

function getCategoryOptions(transactions: GetTrasactionsHistoryResponseType) {
  const categories = new Map<string, { value: string; label: string }>();
  for (const transaction of transactions) {
    categories.set(transaction.category, {
      value: transaction.category,
      label: `${transaction.categoryIcon} ${transaction.category}`,
    });
  }
  return Array.from(categories.values());
}

function escapeCell(value: unknown) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
    </div>
  );
}

function RowActions({ transaction }: { transaction: TransactionHistoryRow }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
                render={<Button variant={"ghost"} className="h-8 w-8 p-0" />}
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
