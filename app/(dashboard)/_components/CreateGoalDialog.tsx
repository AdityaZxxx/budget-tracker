"use client";

import type { ReactNode } from "react";

import GoalFormDialog from "./GoalFormDialog";

interface Props {
  trigger: ReactNode;
  currency: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const CreateGoalDialog = ({ trigger, currency, open, onOpenChange }: Props) => (
  <GoalFormDialog
    trigger={trigger}
    currency={currency}
    open={open}
    onOpenChange={onOpenChange}
  />
);

export default CreateGoalDialog;
