"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "../lib/utils";
import HouseholdSwitcher from "./HouseholdSwitcher";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import { ThemeSwitcherBtn } from "./ThemeSwitcherBtn";
import { Button, buttonVariants } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import UserMenu from "./UserMenu";

export default function Navbar() {
  return (
    <div className="border-b bg-background">
      <nav className="container flex items-center justify-between px-6">
        <div className="flex h-[80px] min-h-[60px] items-center gap-x-4">
          <Logo />

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
          <NotificationBell />

          <div className="hidden md:flex md:items-center md:gap-x-2">
            <HouseholdSwitcher />
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
        <Tooltip>
          <SheetTrigger
            render={
              <TooltipTrigger
                render={
                  <Button
                    variant={"ghost"}
                    size={"icon"}
                    aria-label="Toggle navigation menu"
                  />
                }
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <TooltipContent>Menu</TooltipContent>
        </Tooltip>
        <SheetContent
          className="w-[300px] max-w-[calc(100vw-2rem)] sm:w-[400px]"
          side="left"
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <div className="p-4">
            <Logo />
          </div>
          <div className="flex flex-col gap-1 pt-4">
            <div className="px-2 pb-2">
              <HouseholdSwitcher />
            </div>
            {items.map((item) => (
              <NavbarItem
                key={item.label}
                link={item.link}
                label={item.label}
                clickCallback={() => setIsOpen(false)}
              />
            ))}
          </div>
          <div className="absolute right-4 bottom-4 left-4 flex items-center justify-between">
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
      <UserMenu />
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
          isActive && "font-semibold text-foreground",
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
