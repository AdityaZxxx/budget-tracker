"use client";

import type { ReactNode } from "react";

import { LogoMark } from "@/components/Logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import AuthLink from "./AuthLink";
import GoogleSignInButton from "./GoogleSignInButton";

interface AuthCardProps {
  title: string;
  description: string;
  next?: string;
  alternate: { href: string; label: string; prompt: string };
  children: ReactNode;
}

const AuthCard = ({
  title,
  description,
  next,
  alternate,
  children,
}: AuthCardProps) => {
  const alternateHref = next
    ? `${alternate.href}?next=${encodeURIComponent(next)}`
    : alternate.href;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <LogoMark className="shrink-0" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        <CardDescription className="text-pretty">{description}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {children}
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>
        <GoogleSignInButton callbackURL={next ?? "/"} />
        <p className="text-center text-sm text-muted-foreground">
          {alternate.prompt}{" "}
          <AuthLink href={alternateHref}>{alternate.label}</AuthLink>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          <AuthLink
            href="/privacy"
            className="inline-flex min-h-6 items-center"
          >
            Privacy policy
          </AuthLink>
        </p>
      </CardContent>
    </Card>
  );
};

export default AuthCard;
