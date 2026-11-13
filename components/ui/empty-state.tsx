import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const EmptyState = ({
  icon: Icon,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  hint: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex h-32 flex-col items-center justify-center gap-1.5 p-2 text-center",
      className,
    )}
  >
    <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
      <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
    </span>
    <p className="max-w-64 text-sm text-muted-foreground">{hint}</p>
    {action ? <div className="mt-1.5">{action}</div> : null}
  </div>
);

export default EmptyState;
