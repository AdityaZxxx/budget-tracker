import type { ComponentProps } from "react";

import { cn } from "cn";
import Link from "next/link";

const AuthLink = ({ className, ...props }: ComponentProps<typeof Link>) => {
  return (
    <Link
      className={cn(
        "rounded-sm underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    />
  );
};

export default AuthLink;
