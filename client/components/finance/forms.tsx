"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { InlineError } from "./states";

export function FormField({
  children,
  className,
  disabled = false,
  error,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  error?: React.ReactNode;
  id?: string;
}) {
  return (
    <div
      aria-describedby={error && id ? `${id}-error` : undefined}
      className={cn("space-y-1.5", className)}
      data-disabled={disabled || undefined}
      data-slot="form-field"
    >
      {children}
      {error ? (
        <FieldError id={id ? `${id}-error` : undefined}>{error}</FieldError>
      ) : null}
    </div>
  );
}

export function FieldLabel({
  children,
  className,
  optional = false,
  required = false,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <label
      className={cn("flex w-fit items-center gap-1 text-sm font-semibold", className)}
      data-slot="field-label"
      {...props}
    >
      {children}
      {required ? <span aria-hidden="true" className="text-destructive">*</span> : null}
      {optional ? (
        <span className="text-xs font-normal text-muted-foreground">(optional)</span>
      ) : null}
    </label>
  );
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="field-description"
      {...props}
    />
  );
}

export function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <InlineError
      className={cn("text-xs", className)}
      data-slot="field-error"
      {...props}
    />
  );
}

export function TextInput({
  error,
  label,
  optional,
  required,
  description,
  id,
  ...props
}: React.ComponentProps<typeof Input> & {
  description?: React.ReactNode;
  error?: React.ReactNode;
  label: React.ReactNode;
  optional?: boolean;
}) {
  const reactId = React.useId();
  const fieldId = id ?? reactId;

  return (
    <FormField error={error} id={fieldId}>
      <FieldLabel htmlFor={fieldId} optional={optional} required={required}>
        {label}
      </FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Input aria-invalid={!!error || undefined} id={fieldId} {...props} />
    </FormField>
  );
}

export function MoneyInput(props: Omit<React.ComponentProps<typeof TextInput>, "inputMode" | "type">) {
  return <TextInput inputMode="decimal" type="text" {...props} />;
}

export function SearchInput({
  className,
  label = "Search",
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & {
  label?: string;
}) {
  return (
    <div className="relative" data-slot="search-input">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={label}
        className={cn("pl-9", className)}
        type="search"
        {...props}
      />
    </div>
  );
}

export type SelectOption = {
  disabled?: boolean;
  label: React.ReactNode;
  value: string;
};

export function SelectField({
  description,
  error,
  label,
  onValueChange,
  options,
  placeholder = "Select",
  value,
}: {
  description?: React.ReactNode;
  error?: React.ReactNode;
  label: React.ReactNode;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
}) {
  const id = React.useId();
  return (
    <FormField error={error} id={id}>
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger aria-invalid={!!error || undefined} aria-labelledby={`${id}-label`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem disabled={option.disabled} key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

export function DateField(props: Omit<React.ComponentProps<typeof TextInput>, "type">) {
  return <TextInput type="date" {...props} />;
}

export function TextareaField({
  description,
  error,
  id,
  label,
  optional,
  required,
  ...props
}: React.ComponentProps<typeof Textarea> & {
  description?: React.ReactNode;
  error?: React.ReactNode;
  label: React.ReactNode;
  optional?: boolean;
}) {
  const reactId = React.useId();
  const fieldId = id ?? reactId;
  return (
    <FormField error={error} id={fieldId}>
      <FieldLabel htmlFor={fieldId} optional={optional} required={required}>
        {label}
      </FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Textarea aria-invalid={!!error || undefined} id={fieldId} {...props} />
    </FormField>
  );
}

export function SegmentedControl({
  ariaLabel,
  disabled = false,
  onValueChange,
  options,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  value?: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="inline-flex rounded-full bg-secondary p-1"
      data-slot="segmented-control"
      role="radiogroup"
    >
      {options.map((option) => (
        <button
          aria-checked={value === option.value}
          className="rounded-full px-3 py-1 text-sm font-semibold text-muted-foreground aria-checked:bg-foreground aria-checked:text-background disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled || option.disabled}
          key={option.value}
          onClick={() => onValueChange?.(option.value)}
          role="radio"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleField({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: {
  checked?: boolean;
  description?: React.ReactNode;
  disabled?: boolean;
  label: React.ReactNode;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border p-3" data-slot="toggle-field">
      <input
        checked={checked}
        className="mt-1 size-4 accent-primary"
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        type="checkbox"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {description ? (
          <span className="block text-sm text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
