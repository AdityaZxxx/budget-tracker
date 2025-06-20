"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "../lib/utils";
import Logo from "./Logo";
import { ThemeSwitcherBtn } from "./ThemeSwitcherBtn";
import { Button, buttonVariants } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

export default function Navbar() {
  return (
    <div className="border-b bg-background">
      <nav className="container flex items-center justify-between px-4 sm:px-8">
        <div className="flex h-[80px] min-h-[60px] items-center gap-x-4">
          <span className="hidden md:block">
            <Logo />
          </span>

          <span className="block md:hidden">
            <Logo showIcon={false} />
          </span>

          <div className="hidden h-full md:flex">
            {items.map((item) => (
              <NavbarItem
                key={item.label}
                link={item.link}
                label={item.label}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-x-2">
          <div className="hidden md:flex md:items-center md:gap-x-2">
            <NavbarActions />
          </div>

          <MobileMenu />
        </div>
      </nav>
    </div>
  );
}

const items = [
  { label: "Dashboard", link: "/" },
  { label: "Transactions", link: "/transactions" },
  { label: "Manage", link: "/manage" },
];

function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="block md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant={"ghost"}
            size={"icon"}
            aria-label="Toggle navigation menu"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[300px] sm:w-[400px]" side="left">
          <div className="p-4">
            <Logo />
          </div>
          <div className="flex flex-col gap-1 pt-4">
            {items.map((item) => (
              <NavbarItem
                key={item.label}
                link={item.link}
                label={item.label}
                clickCallback={() => setIsOpen(false)}
              />
            ))}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Theme:</p>
            <ThemeSwitcherBtn />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavbarActions() {
  return (
    <>
      <ThemeSwitcherBtn />
      <UserButton afterSwitchSessionUrl="/sign-in" />
    </>
  );
}

function NavbarItem({
  link,
  label,
  clickCallback,
}: {
  link: string;
  label: string;
  clickCallback?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === link;

  return (
    <div className="relative flex items-center">
      <Link
        href={link}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "w-full justify-start text-lg text-muted-foreground hover:text-foreground md:text-sm",
          isActive && "font-semibold text-foreground"
        )}
        onClick={() => {
          if (clickCallback) clickCallback();
        }}
      >
        {label}
      </Link>
      {isActive && (
        <div className="absolute -bottom-[1px] left-1/2 hidden h-[2px] w-[80%] -translate-x-1/2 rounded-xl bg-foreground md:block" />
      )}
    </div>
  );
}
