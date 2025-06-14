import { type Metadata } from "next";
import ManagePageClient from "./_components/ManagePageClient";

export const metadata: Metadata = {
  title: "Manage Settings",
  description:
    "Manage your account settings, default currency, and categories.",

  robots: {
    index: false,
    follow: false,
  },
};

export default function ManagePage() {
  return <ManagePageClient />;
}
