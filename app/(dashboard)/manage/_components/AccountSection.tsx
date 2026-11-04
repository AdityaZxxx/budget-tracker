"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, TrashIcon } from "lucide-react";
import Link from "next/link";
import DeleteAccountDialog from "./DeleteAccountDialog";

const AccountSection = () => {
  return (
    <>
      <section>
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Your data</CardTitle>
            <CardDescription>
              Download everything your household has stored in Sora, or read
              how we handle it
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              render={<a href="/api/export" download="sora-export.json" />}
            >
              <Download className="h-4 w-4" />
              Download full export (JSON)
            </Button>
            <Button
              variant="ghost"
              className="gap-2"
              render={<Link href="/privacy" />}
            >
              Privacy policy
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-destructive/20 transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-xl text-destructive">
              Delete account
            </CardTitle>
            <CardDescription>
              Permanently delete your sign-in and every household where you are
              the last member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog
              trigger={
                <Button variant="destructive" className="gap-2">
                  <TrashIcon className="h-4 w-4" />
                  Delete account
                </Button>
              }
            />
          </CardContent>
        </Card>
      </section>
    </>
  );
};

export default AccountSection;
