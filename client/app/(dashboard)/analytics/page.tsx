"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Download, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

export default function Analytics() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("Jan 2026");

  return (
    <main className="flex flex-col h-dvh">
      <Header title="Analytics">
        <Button variant="link" size="icon-sm">
          <Download />
        </Button>
      </Header>
      <div className="flex items-center justify-end p-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-25 justify-between"
            >
              {value}
              <ChevronDown className="text-input" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-30">
            <Command>
              <CommandInput placeholder="Search Month" />
              <CommandGroup>
                <CommandItem
                  value="Feb 2025"
                  className="flex items-center justify-between"
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  Feb 2025
                  <Check
                    className={
                      value === "Feb 2025" ? "opacity-100" : "opacity-0"
                    }
                  />
                </CommandItem>
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </main>
  );
}
