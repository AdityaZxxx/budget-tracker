"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  DownloadIcon,
  MoreHorizontal,
  TrashIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DataTableColumnHeader } from "@/components/datatable/ColumnHeader";
import { DataTableFacetedFilter } from "@/components/datatable/facetedFilters";
import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateToUTCDate } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { CSVLink } from "react-csv";
import { DataTableViewOptions } from "../../../../components/datatable/Columntoggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
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
        <span className="text-xl" role="img" aria-label={row.original.category}>
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
      <div className="max-w-[200px] truncate capitalize md:max-w-none">
        {row.original.description}
      </div>
    ),
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
        <div className="text-muted-foreground whitespace-nowrap">
          {formattedDate}
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
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
            : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400"
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
          "text-md font-medium",
          row.original.type === "income"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
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
        `/api/transaction-history?from=${DateToUTCDate(
          from
        )}&to=${DateToUTCDate(to)}`
      );
      if (!response.ok) throw new Error("Failed to fetch transaction history");
      return response.json();
    },
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

  const csvData = useMemo(() => {
    if (!history.data) return [];

    return history.data.map((transaction) => ({
      Date: new Date(transaction.date).toLocaleDateString(),
      Category: transaction.category,
      Description: transaction.description,
      Type:
        transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      Amount:
        transaction.type === "expense"
          ? `-${transaction.formattedAmount}`
          : transaction.formattedAmount,
      Currency: transaction.formattedAmount.replace(/[^a-zA-Z]/g, ""), // Extract currency symbol
    }));
  }, [history.data]);

  const csvHeaders = [
    { label: "Date", key: "Date" },
    { label: "Category", key: "Category" },
    { label: "Description", key: "Description" },
    { label: "Type", key: "Type" },
    { label: "Amount", key: "Amount" },
    { label: "Currency", key: "Currency" },
  ];

  const categoriesOptions = useMemo(() => {
    const categoriesMap = new Map();
    history.data?.forEach((transaction) => {
      categoriesMap.set(transaction.category, {
        value: transaction.category,
        label: `${transaction.categoryIcon} ${transaction.category}`,
      });
    });
    return Array.from(categoriesMap.values());
  }, [history.data]);

  const typeOptions = useMemo(
    () => [
      { label: "Income", value: "income" },
      { label: "Expense", value: "expense" },
    ],
    []
  );

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
          <CSVLink
            data={csvData}
            headers={csvHeaders}
            filename={`transactions_${from.toISOString().split("T")[0]}_to_${
              to.toISOString().split("T")[0]
            }.csv`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 gap-1"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export CSV
            </span>
          </CSVLink>
        </div>
      </div>

      <SkeletonWrapper isLoading={history.isFetching}>
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
                            header.getContext()
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
                          cell.getContext()
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
                      <div className="text-destructive">
                        Error loading transactions
                      </div>
                    ) : (
                      "No transactions found"
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronLeft />
          </Button>
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
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </SkeletonWrapper>
    </div>
  );
};

export default TransactionTable;

function RowActions({ transaction }: { transaction: TransactionHistoryRow }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <DeleteTransactionDialog
        setOpen={setShowDeleteDialog}
        open={showDeleteDialog}
        transactionId={transaction.id}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={"ghost"} className="h-8 w-8 p-0">
            <span className="sr-only">Open Menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2"
            onSelect={() => {
              setShowDeleteDialog((prev) => !prev);
            }}
          >
            <TrashIcon className="h-4 w-4 text-muted-foreground" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
