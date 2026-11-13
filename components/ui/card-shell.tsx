import type { ReactNode } from "react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CardShell = ({
  className,
  ...props
}: React.ComponentProps<typeof Card>) => (
  <Card
    className={cn("w-full transition-all hover:shadow-md", className)}
    {...props}
  />
);

const CardShellHeader = ({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col gap-3 px-6 pt-6 sm:flex-row sm:items-start sm:justify-between",
      className,
    )}
  >
    <div className="min-w-0 space-y-0.5">
      <CardTitle className="text-xl">{title}</CardTitle>
      {description ? <CardDescription>{description}</CardDescription> : null}
    </div>
    {action ? (
      <div className="flex min-w-0 flex-wrap items-center gap-2">{action}</div>
    ) : null}
  </div>
);

export { CardShell, CardShellHeader };
