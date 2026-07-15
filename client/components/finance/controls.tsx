"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tabs as BaseTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { SearchInput, SelectField, type SelectOption } from "./forms";

export function FilterBar({
  children,
  className,
  onReset,
}: {
  children: React.ReactNode;
  className?: string;
  onReset?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      data-slot="filter-bar"
    >
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">{children}</div>
      {onReset ? (
        <Button onClick={onReset} size="sm" type="button" variant="ghost">
          Reset
        </Button>
      ) : null}
    </div>
  );
}

export function FilterChip({
  active = false,
  children,
  onRemove,
}: {
  active?: boolean;
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold",
        active
          ? "border-primary-border bg-primary-soft text-primary-soft-foreground"
          : "border-border bg-muted text-muted-foreground",
      )}
      data-slot="filter-chip"
    >
      <span className="truncate">{children}</span>
      {onRemove ? (
        <button aria-label="Remove filter" onClick={onRemove} type="button">
          <X aria-hidden="true" className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function FilterButton({
  active = false,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  active?: boolean;
}) {
  return (
    <Button
      aria-pressed={active}
      data-slot="filter-button"
      size="sm"
      type="button"
      variant={active ? "default" : "outline"}
      {...props}
    >
      <SlidersHorizontal aria-hidden="true" />
      {children}
    </Button>
  );
}

export function SearchAndFilterHeader({
  children,
  className,
  onSearchChange,
  searchLabel = "Search",
  searchValue,
}: {
  children?: React.ReactNode;
  className?: string;
  onSearchChange?: (value: string) => void;
  searchLabel?: string;
  searchValue?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}
      data-slot="search-and-filter-header"
    >
      <SearchInput
        className="sm:max-w-xs"
        label={searchLabel}
        onChange={(event) => onSearchChange?.(event.target.value)}
        value={searchValue}
      />
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function SortControl({
  label = "Sort",
  onValueChange,
  options,
  value,
}: {
  label?: React.ReactNode;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  value?: string;
}) {
  return (
    <div className="min-w-40" data-slot="sort-control">
      <SelectField
        label={label}
        onValueChange={onValueChange}
        options={options}
        value={value}
      />
    </div>
  );
}

export function DateRangeControl({
  end,
  onEndChange,
  onStartChange,
  start,
}: {
  end?: string;
  onEndChange?: (value: string) => void;
  onStartChange?: (value: string) => void;
  start?: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" data-slot="date-range-control">
      <label className="grid gap-1 text-sm font-semibold">
        Start
        <input
          className="h-8 rounded-md border border-input bg-transparent px-3 text-base md:text-sm"
          onChange={(event) => onStartChange?.(event.target.value)}
          type="date"
          value={start}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        End
        <input
          className="h-8 rounded-md border border-input bg-transparent px-3 text-base md:text-sm"
          onChange={(event) => onEndChange?.(event.target.value)}
          type="date"
          value={end}
        />
      </label>
    </div>
  );
}

export function Pagination({
  onNext,
  onPrevious,
  page,
  totalPages,
}: {
  onNext?: () => void;
  onPrevious?: () => void;
  page: number;
  totalPages: number;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3"
      data-slot="pagination"
    >
      <Button disabled={page <= 1} onClick={onPrevious} size="sm" type="button" variant="outline">
        <ChevronLeft aria-hidden="true" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button disabled={page >= totalPages} onClick={onNext} size="sm" type="button" variant="outline">
        Next
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}

export function ResponsiveDataList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)} data-slot="responsive-data-list">
      {children}
    </div>
  );
}

export function Tabs({
  defaultValue,
  items,
}: {
  defaultValue?: string;
  items: Array<{
    content: React.ReactNode;
    disabled?: boolean;
    label: React.ReactNode;
    value: string;
  }>;
}) {
  const firstValue = defaultValue ?? items[0]?.value;

  return (
    <BaseTabs data-slot="finance-tabs" defaultValue={firstValue}>
      <TabsList>
        {items.map((item) => (
          <TabsTrigger disabled={item.disabled} key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </BaseTabs>
  );
}
