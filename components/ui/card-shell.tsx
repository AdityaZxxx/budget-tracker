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
  <div className={cn("px-6 pt-6", className)}>
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <CardTitle className="text-lg">{title}</CardTitle>
      </div>
      {action ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {action}
        </div>
      ) : null}
    </div>
    {description ? (
      <CardDescription className="mt-0.5">{description}</CardDescription>
    ) : null}
  </div>
);

export { CardShell, CardShellHeader };
