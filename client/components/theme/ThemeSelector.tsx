"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/theme";

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  Icon: typeof MonitorIcon;
}> = [
  { value: "system", label: "System", Icon: MonitorIcon },
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

type ThemeSelectorProps = {
  className?: string;
  label?: string;
};

export function ThemeSelector({
  className,
  label = "Theme",
}: ThemeSelectorProps) {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="text-sm font-bold">{label}</legend>
      <div
        className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-surface-subtle p-1"
        role="radiogroup"
        aria-label={label}
      >
        {THEME_OPTIONS.map(({ value, label: optionLabel, Icon }) => (
          <label
            key={value}
            className={cn(
              "relative flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-bold text-muted-foreground transition-colors",
              "has-[:checked]:bg-card has-[:checked]:text-primary has-[:checked]:shadow-sm",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
            )}
          >
            <input
              type="radio"
              name="theme-preference"
              value={value}
              checked={preference === value}
              onChange={() => setPreference(value)}
              className="sr-only"
            />
            <Icon className="size-4" aria-hidden="true" />
            <span>{optionLabel}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
