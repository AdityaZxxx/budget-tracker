"use client";

import type { GoalWithProgress } from "@/lib/goals";
import type { ReactNode } from "react";

import GoalFormDialog from "./GoalFormDialog";

interface Props {
  goal: GoalWithProgress;
  currency: string | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EditGoalDialog = ({
  goal,
  currency,
  trigger,
  open,
  onOpenChange,
}: Props) => (
  <GoalFormDialog
    goal={goal}
    currency={currency}
    trigger={trigger}
    open={open}
    onOpenChange={onOpenChange}
  />
);

export default EditGoalDialog;
