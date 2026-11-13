import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

import { CurrencyComboBox } from "../../components/CurrencyComboBox";
import Logo from "../../components/Logo";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";

const page = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return (
    <div className="container flex max-w-2xl flex-col items-center justify-between gap-4">
      <div>
        <h1 className="text-center text-2xl">
          Welcome,{" "}
          <span className="ml-2 font-bold">
            {session.user.name.split(" ")[0]}! 👋
          </span>
        </h1>
        <h2 className="mt-4 text-center text-base text-muted-foreground">
          Let&apos;s get started by setting up your currency
        </h2>
        <h3 className="mt-2 text-center text-sm text-muted-foreground">
          You can change these settings at any time.
        </h3>
      </div>
      <Separator />
      <Card className="w-full">
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
      <Separator />
      <Button
        className="w-full"
        nativeButton={false}
        render={<Link href={"/"} />}
      >
        I&apos;m done! Take me to the dashboard
      </Button>
      <div className="mt-8">
        <Logo />
      </div>
    </div>
  );
};

export default page;
