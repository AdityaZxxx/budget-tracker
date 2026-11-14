"use client";

import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { POLL_INTERVAL } from "@/lib/constants";
import { cn } from "@/lib/utils";

import CreateCategoryDialog from "./CreateCategoryDialog";

interface Props {
  type: TransactionType;
  onChange: (value: string) => void;
  id?: string;
  value?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

const CategoryPicker = ({
  type,
  onChange,
  id,
  value: initialValue,
  ...ariaProps
}: Props) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const listId = useId();

  const selectCategory = (name: string) => {
    setValue(name);
    onChange(name);
  };

  const categoriesQuery = useQuery({
    queryKey: ["categories", type],
    queryFn: async () => {
      const res = await fetch(`api/categories?type=${type}`);
      if (!res.ok) {
        throw new Error("Failed to fetch categories");
      }
      return res.json();
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const selectedCategory = categoriesQuery.data?.find(
    (category: Category) => category.name === value,
  );

  const SuccessCallback = (category: Category) => {
    selectCategory(category.name);
    setOpen((prev) => !prev);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant={"outline"}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            className="w-full justify-between"
            {...ariaProps}
          />
        }
      >
        {selectedCategory ? (
          <CategoryRow category={selectedCategory} />
        ) : (
          "Select category"
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <CommandInput placeholder="Search category…" />
          <CreateCategoryDialog type={type} successCallback={SuccessCallback} />
          <CommandEmpty>
            <p>Category not found</p>
            <p className="text-xs text-muted-foreground">
              Create a new category
            </p>
          </CommandEmpty>
          <CommandGroup>
            <CommandList id={listId}>
              {categoriesQuery.data &&
                categoriesQuery.data.map((category: Category) => (
                  <CommandItem
                    key={category.name}
                    onSelect={() => {
                      selectCategory(category.name);
                      setOpen((prev) => !prev);
                    }}
                  >
                    <CategoryRow category={category} />
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 opacity-0",
                        value === category.name && "opacity-100",
                      )}
                    />
                  </CommandItem>
                ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CategoryPicker;

function CategoryRow({ category }: { category: Category }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true">{category.icon}</span>
      <span>{category.name}</span>
    </div>
  );
}
