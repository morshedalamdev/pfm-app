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

export default function FilterMenu() {
  const [sortBy, setSortBy] = useState("all");
  const [duration, setDuration] = useState("day");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <SlidersHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Filter:</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
          <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="expense">Expense</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="income">Income</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuLabel>Duration</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={duration} onValueChange={setDuration}>
          <DropdownMenuRadioItem value="day">Day</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="week">Week</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="month">Month</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
