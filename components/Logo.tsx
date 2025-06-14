import { cn } from "@/lib/utils";
import { PiggyBank } from "lucide-react";
import Link from "next/link";

interface LogoProps {
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export default function Logo({
  showIcon = true,
  showText = true,
  className,
}: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <PiggyBank
          className="h-11 w-11 stroke-amber-500 stroke-[1.5]"
          aria-hidden="true"
        />
      )}
      {showText && (
        <p className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-3xl font-bold leading-tight tracking-tighter text-transparent">
          BudgetTracker
        </p>
      )}
    </Link>
  );
}
