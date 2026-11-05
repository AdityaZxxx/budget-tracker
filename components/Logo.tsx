import { cn } from "@/lib/utils";
import { PiggyBank } from "lucide-react";
import Link from "next/link";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <PiggyBank
        className="h-11 w-11 stroke-amber-500 stroke-[1.5]"
        aria-hidden="true"
      />
    </Link>
  );
}
