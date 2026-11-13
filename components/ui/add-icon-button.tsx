import type { ComponentProps } from "react";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const AddIconButton = ({
  label,
  className,
  variant = "ghost",
  ...rest
}: ComponentProps<typeof Button> & { label: string }) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          variant={variant}
          size="icon-sm"
          aria-label={label}
          className={cn(className)}
          {...rest}
        />
      }
    >
      <Plus aria-hidden="true" className="h-4 w-4" />
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

export default AddIconButton;
