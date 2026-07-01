"use client";

import { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type FilterMenuProps = {
  duration?: string;
  onDurationChange?: (value: string) => void;
  onTypeChange?: (value: string) => void;
  type?: string;
};

export default function FilterMenu({
  duration: controlledDuration,
  onDurationChange,
  onTypeChange,
  type,
}: FilterMenuProps) {
  const [localType, setLocalType] = useState("all");
  const [duration, setDuration] = useState("day");
  const activeDuration = controlledDuration ?? duration;
  const activeType = type ?? localType;

  function handleTypeChange(value: string) {
    setLocalType(value);
    onTypeChange?.(value);
  }

  function handleDurationChange(value: string) {
    setDuration(value);
    onDurationChange?.(value);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <SlidersHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Filter:</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={activeType} onValueChange={handleTypeChange}>
          <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="expense">Expense</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="income">Income</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="transfer">Transfer</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuLabel>Duration</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeDuration}
          onValueChange={handleDurationChange}
        >
          <DropdownMenuRadioItem value="day">Day</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="week">Week</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="month">Month</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
