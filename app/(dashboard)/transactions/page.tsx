import { type Metadata } from "next";
import TransactionsClient from "./_components/TransactionsClient";

export const metadata: Metadata = {
  title: "Transaction History",
  description:
    "View, search, and filter all your transaction history. Keep a detailed record of your income and expenses.",

  keywords: [
    "transaction history",
    "financial records",
    "expense list",
    "income log",
    "budget records",
  ],

  openGraph: {
    title: "Transaction History | Budget Tracker",
    description: "Keep a detailed record of your income and expenses.",
    url: "/transactions",
  },
  twitter: {
    title: "Transaction History | Budget Tracker",
    description: "Keep a detailed record of your income and expenses.",
  },
};

export default function TransactionsPage() {
  return <TransactionsClient />;
}
