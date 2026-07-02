"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { CalendarDays } from "lucide-react";

type DateFilterProps = {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
};

export default function DateFilter({
  date: controlledDate,
  onDateChange,
}: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const activeDate = controlledDate ?? date;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          id="date-picker"
        >
          <CalendarDays />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={activeDate}
          captionLayout="dropdown"
          onSelect={(date) => {
            setDate(date);
            onDateChange?.(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
