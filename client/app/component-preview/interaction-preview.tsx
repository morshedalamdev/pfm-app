"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  ActionMenu,
  AlertBanner,
  AppDialog,
  AppDrawer,
  AppSheet,
  CardSkeleton,
  ConfirmDialog,
  DateRangeControl,
  DestructiveConfirmDialog,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterButton,
  FilterChip,
  MoneyInput,
  Pagination,
  ResponsiveDataList,
  SearchAndFilterHeader,
  SelectField,
  SegmentedControl,
  SuccessBanner,
  Tabs,
  TextInput,
  TextareaField,
  ToggleField,
  WarningBanner,
} from "@/components/finance";

export function InteractionPreview() {
  const [query, setQuery] = React.useState("");
  const [segment, setSegment] = React.useState("all");
  const [removed, setRemoved] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState("none");

  return (
    <section className="grid gap-5" data-testid="interaction-preview">
      <div className="grid gap-4 md:grid-cols-3" data-testid="state-preview">
        <CardSkeleton />
        <EmptyState
          description="No fake balances are shown while empty."
          primaryAction={{ label: "Create" }}
          title="No records"
        />
        <ErrorState
          description="Retry action is explicit."
          retryAction={{ label: "Retry" }}
          title="Could not load"
        />
      </div>

      <div className="grid gap-2">
        <AlertBanner>Informational banner</AlertBanner>
        <SuccessBanner>Saved successfully</SuccessBanner>
        <WarningBanner>Review before continuing</WarningBanner>
      </div>

      <form className="grid gap-4 rounded-md border border-border bg-card p-4" data-testid="form-preview">
        <TextInput
          description="This field has an associated label and description."
          id="preview-name"
          label="Display name"
          placeholder="Enter a name"
          required
        />
        <MoneyInput
          error="Amount must be greater than zero."
          id="preview-amount"
          label="Amount"
          placeholder="0.00"
        />
        <SearchAndFilterHeader
          onSearchChange={setQuery}
          searchLabel="Search preview"
          searchValue={query}
        >
          <FilterButton active>Filters</FilterButton>
        </SearchAndFilterHeader>
        <SelectField
          label="Account"
          options={[
            { label: "Main checking", value: "checking" },
            { label: "Disabled account", value: "disabled", disabled: true },
          ]}
          placeholder="Choose account"
          value="checking"
        />
        <DateRangeControl end="2026-07-31" start="2026-07-01" />
        <TextareaField label="Notes" optional placeholder="Optional note" />
        <SegmentedControl
          ariaLabel="Transaction type"
          onValueChange={setSegment}
          options={[
            { label: "All", value: "all" },
            { label: "Income", value: "income" },
            { label: "Expense", value: "expense" },
          ]}
          value={segment}
        />
        <ToggleField
          checked
          description="Checkbox remains native and keyboard friendly."
          label="Remember filters"
        />
      </form>

      <FilterBar onReset={() => setRemoved(false)}>
        {!removed ? (
          <FilterChip active onRemove={() => setRemoved(true)}>
            Active month
          </FilterChip>
        ) : null}
        <FilterChip>Archived hidden</FilterChip>
      </FilterBar>

      <Tabs
        items={[
          {
            content: <p className="text-sm text-muted-foreground">Overview panel</p>,
            label: "Overview",
            value: "overview",
          },
          {
            content: <p className="text-sm text-muted-foreground">Details panel</p>,
            label: "Details",
            value: "details",
          },
        ]}
      />

      <ResponsiveDataList>
        <div className="rounded-md border border-border p-3">Responsive row one</div>
        <div className="rounded-md border border-border p-3">Responsive row two</div>
      </ResponsiveDataList>
      <Pagination page={1} totalPages={3} />

      <div className="flex flex-wrap gap-2" data-testid="overlay-preview">
        <AppDialog
          description="Long dialog content scrolls inside the panel."
          primaryAction={{ label: "Save" }}
          secondaryAction={{ label: "Cancel" }}
          title="Preview dialog"
          trigger={<Button type="button">Open dialog</Button>}
        >
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <p className="text-sm text-muted-foreground" key={index}>
                Dialog paragraph {index + 1}
              </p>
            ))}
          </div>
        </AppDialog>

        <AppDrawer
          description="Drawer uses mobile safe-area padding."
          title="Preview drawer"
          trigger={<Button type="button" variant="outline">Open drawer</Button>}
        >
          <p className="text-sm text-muted-foreground">Drawer content</p>
        </AppDrawer>

        <AppSheet
          description="Sheet reuses Radix dialog behavior."
          title="Preview sheet"
          trigger={<Button type="button" variant="outline">Open sheet</Button>}
        >
          <p className="text-sm text-muted-foreground">Sheet content</p>
        </AppSheet>

        <ConfirmDialog
          description="Confirmation keeps focus trapped until closed."
          onConfirm={() => setConfirmed("confirmed")}
          title="Confirm action"
          trigger={<Button type="button" variant="outline">Open confirm</Button>}
        />

        <DestructiveConfirmDialog
          description="This action is destructive."
          onConfirm={() => setConfirmed("deleted")}
          title="Delete record?"
          trigger={<Button type="button" variant="outline">Open destructive</Button>}
        />

        <ActionMenu
          items={[
            { label: "Edit", onSelect: () => setConfirmed("edit") },
            { destructive: true, label: "Delete", onSelect: () => setConfirmed("menu-delete") },
          ]}
        />
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        Last action: {confirmed}
      </p>
    </section>
  );
}
