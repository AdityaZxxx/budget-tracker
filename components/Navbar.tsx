"use client";

import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

import { cn } from "../lib/utils";
import HouseholdSwitcher from "./HouseholdSwitcher";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";
import { ThemeSwitcherBtn } from "./ThemeSwitcherBtn";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button, buttonVariants } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "./ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useSignOut } from "./use-sign-out";
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
  { label: "Dashboard", link: "/", icon: LayoutDashboard },
  { label: "Transactions", link: "/transactions", icon: ArrowLeftRight },
  { label: "Manage", link: "/manage", icon: Settings },
] as const;

function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const signOut = useSignOut();
  const pathname = usePathname();
  const initials = session?.user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
          className="flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-0 p-0"
          side="left"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <header className="flex h-16 items-center justify-between border-b px-4">
            <Logo />
            <SheetClose
              render={
                <Button variant="ghost" size="icon" aria-label="Close menu" />
              }
            >
              <X />
            </SheetClose>
          </header>
          <ScrollArea className="flex-1" viewportClassName="h-full p-3">
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
              Household
            </p>
            <HouseholdSwitcher variant="row" />
            <p className="px-2 pt-6 pb-1 text-xs font-medium text-muted-foreground">
              Menu
            </p>
            <nav className="flex flex-col gap-1">
              {items.map((item) => {
                const isActive = pathname === item.link;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.link}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      isActive && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
          <footer className="flex flex-col gap-3 border-t p-3">
            {session && (
              <div className="flex items-center gap-3 px-2 py-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {session.user.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </div>
            )}
            <div className="flex h-11 items-center justify-between gap-2 px-0">
              {session ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    void signOut();
                  }}
                  className="flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-destructive transition-colors outline-none hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Sign out
                </button>
              ) : (
                <span />
              )}
              <ThemeSwitcherBtn />
            </div>
          </footer>
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
