"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { type FC, JSX, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

export interface DateRangePickerProps {
  /** Fired immediately whenever the committed range changes. */
  onUpdate?: (values: { range: DateRange }) => void;
  /** Initial value for start date */
  initialDateFrom?: Date | string;
  /** Initial value for end date */
  initialDateTo?: Date | string;
  /** Alignment of popover */
  align?: "start" | "center" | "end";
  /** Option for locale */
  locale?: string;
  /** Maximum allowed range length in days; longer selections are rejected */
  maxRangeDays?: number;
}

const formatDate = (date: Date, locale?: string): string => {
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === "string") {
    // Split the date string to get year, month, and day parts
    const parts = dateInput.split("-").map((part) => parseInt(part, 10));
    // Create a new Date object using the local timezone
    // Note: Month is 0-indexed, so subtract 1 from the month part
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date;
  } else {
    // If dateInput is already a Date object, return it directly
    return dateInput;
  }
};

interface DateRange {
  from: Date;
  to: Date | undefined;
}

interface Preset {
  name: string;
  label: string;
}

// Define presets (Title Case labels)
const PRESETS: Preset[] = [
  { name: "today", label: "Today" },
  { name: "yesterday", label: "Yesterday" },
  { name: "last7", label: "Last 7 Days" },
  { name: "last14", label: "Last 14 Days" },
  { name: "last30", label: "Last 30 Days" },
  { name: "thisWeek", label: "This Week" },
  { name: "lastWeek", label: "Last Week" },
  { name: "thisMonth", label: "This Month" },
  { name: "lastMonth", label: "Last Month" },
];

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker: FC<DateRangePickerProps> & {
  filePath: string;
} = ({
  initialDateFrom = new Date(new Date().setHours(0, 0, 0, 0)),
  initialDateTo,
  onUpdate,
  align = "end",
  locale,
  maxRangeDays,
}): JSX.Element => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const [range, setRange] = useState<DateRange>({
    from: getDateAdjustedForTimezone(initialDateFrom),
    to: initialDateTo
      ? getDateAdjustedForTimezone(initialDateTo)
      : getDateAdjustedForTimezone(initialDateFrom),
  });

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(
    undefined
  );

  // Selections apply live: every committed change goes straight to onUpdate,
  // so closing the popover never discards anything.
  const isRangeWithinLimit = (value: DateRange): boolean =>
    !maxRangeDays ||
    !value.from ||
    !value.to ||
    differenceInDays(value.to, value.from) <= maxRangeDays;

  const warnRangeTooBig = (): void => {
    toast.error(
      `The selected date range is too big. Max allowed range is ${maxRangeDays} days.`
    );
  };

  const getPresetRange = (presetName: string): DateRange => {
    const preset = PRESETS.find(({ name }) => name === presetName);
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`);
    const from = new Date();
    const to = new Date();
    const first = from.getDate() - from.getDay();

    switch (preset.name) {
      case "today":
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        from.setDate(from.getDate() - 1);
        from.setHours(0, 0, 0, 0);
        to.setDate(to.getDate() - 1);
        to.setHours(23, 59, 59, 999);
        break;
      case "last7":
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "last14":
        from.setDate(from.getDate() - 13);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "last30":
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "thisWeek":
        from.setDate(first);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "lastWeek":
        from.setDate(from.getDate() - 7 - from.getDay());
        to.setDate(to.getDate() - to.getDay() - 1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "thisMonth":
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "lastMonth":
        from.setMonth(from.getMonth() - 1);
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        to.setDate(0);
        to.setHours(23, 59, 59, 999);
        break;
    }

    return { from, to };
  };

  // Applies a candidate range: updates state, notifies onUpdate once the
  // range is complete, and closes the popover when requested.
  const applyRange = (next: DateRange, close: boolean): void => {
    if (!isRangeWithinLimit(next)) {
      warnRangeTooBig();
      return;
    }
    setRange(next);
    if (next.to) {
      onUpdate?.({ range: next });
      if (close) setIsOpen(false);
    }
  };

  const setPreset = (preset: string): void => {
    applyRange(getPresetRange(preset), true);
  };

  const checkPreset = (): void => {
    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name);

      const normalizedRangeFrom = new Date(range.from);
      normalizedRangeFrom.setHours(0, 0, 0, 0);
      const normalizedPresetFrom = new Date(
        presetRange.from.setHours(0, 0, 0, 0)
      );

      const normalizedRangeTo = new Date(range.to ?? 0);
      normalizedRangeTo.setHours(0, 0, 0, 0);
      const normalizedPresetTo = new Date(
        presetRange.to?.setHours(0, 0, 0, 0) ?? 0
      );

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name);
        return;
      }
    }

    setSelectedPreset(undefined);
  };

  useEffect(() => {
    checkPreset();
  }, [range]);

  const PresetButton = ({
    preset,
    label,
    isSelected,
  }: {
    preset: string;
    label: string;
    isSelected: boolean;
  }): JSX.Element => (
    <Button
      className={cn(
        "h-8 w-full justify-start rounded-md px-2.5 text-[13px] font-normal",
        isSelected && "pointer-events-none bg-accent text-foreground"
      )}
      variant="ghost"
      onClick={() => {
        setPreset(preset);
      }}
    >
      {label}
    </Button>
  );

  const sameDay =
    range.to != null &&
    range.from.toDateString() === range.to.toDateString();

  const triggerContent = (
    <>
      <CalendarIcon className="size-4 opacity-60" />
      <span className="text-sm">
        {sameDay
          ? formatDate(range.from, locale)
          : `${formatDate(range.from, locale)}${
              range.to != null ? " - " + formatDate(range.to, locale) : ""
            }`}
      </span>
      {isOpen ? (
        <ChevronUp className="size-4 opacity-60" />
      ) : (
        <ChevronDown className="size-4 opacity-60" />
      )}
    </>
  );

  const liveRegion = (
    <span aria-live="polite" className="sr-only">
      {range.to != null
        ? `From ${formatDate(range.from, locale)} to ${formatDate(range.to, locale)}`
        : ""}
    </span>
  );

  const pickerContent = (
    <div className="flex flex-col md:flex-row">
      <div className="grid grid-cols-3 gap-0.5 border-b border-border pb-3 md:flex md:w-36 md:flex-col md:flex-nowrap md:border-b-0 md:border-r md:pr-3 md:pb-0">
        {PRESETS.map((preset) => (
          <PresetButton
            key={preset.name}
            preset={preset.name}
            label={preset.label}
            isSelected={selectedPreset === preset.name}
          />
        ))}
      </div>
      <div className="pt-3 md:pl-3 md:pt-0">
        <Calendar
          className="mx-auto md:mx-0"
          mode="range"
          onSelect={(value: { from?: Date; to?: Date } | undefined) => {
            if (value?.from == null) return;
            applyRange(
              { from: value.from, to: value.to },
              Boolean(value.to)
            );
          }}
          selected={range}
          numberOfMonths={1}
          defaultMonth={range.from}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {liveRegion}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger render={<Button variant="outline" />}>
            {triggerContent}
          </SheetTrigger>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-background px-4 pb-6"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <SheetHeader className="p-0 pb-2 text-left">
              <SheetTitle>Date range</SheetTitle>
            </SheetHeader>
            {pickerContent}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {liveRegion}
      <Popover
        modal={true}
        open={isOpen}
        onOpenChange={(open: boolean) => {
          setIsOpen(open);
        }}
      >
        <PopoverTrigger render={<Button variant="outline" />}>
          {triggerContent}
        </PopoverTrigger>
        <PopoverContent align={align} className="w-auto p-3">
          {pickerContent}
        </PopoverContent>
      </Popover>
    </>
  );
};

DateRangePicker.displayName = "DateRangePicker";
DateRangePicker.filePath =
  "libs/shared/ui-kit/src/lib/date-range-picker/date-range-picker.tsx";
