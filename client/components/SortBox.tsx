"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";

const list = ["all", "expense", "income"];

export default function SortBox() {
  const [sortBy, setSortBy] = useState("all");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-24 justify-between capitalize">
          {sortBy} <ChevronDown className="text-stone-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {list.map((i) => (
          <DropdownMenuItem onClick={() => setSortBy(i)} className="capitalize">
            {i}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
