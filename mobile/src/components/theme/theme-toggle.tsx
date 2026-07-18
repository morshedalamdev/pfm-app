"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import type { ThemeMode } from "@/theme/tokens";

type ThemeToggleProps = Readonly<{
  compact?: boolean;
}>;

const choices: ReadonlyArray<{
  icon: typeof Sun;
  label: string;
  value: ThemeMode;
}> = [
  { icon: Sun, label: "Light", value: "light" },
  { icon: Moon, label: "Dark", value: "dark" },
  { icon: Laptop, label: "System", value: "system" },
];

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (compact) {
    const isDark = mounted && resolvedTheme === "dark";
    const Icon = isDark ? Sun : Moon;

    return (
      <button
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className="icon-button"
        disabled={!mounted}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        type="button"
      >
        <Icon aria-hidden="true" size={18} strokeWidth={2.3} />
      </button>
    );
  }

  return (
    <div aria-label="Color theme" className="theme-selector" role="group">
      {choices.map(({ icon: Icon, label, value }) => (
        <button
          aria-pressed={mounted && theme === value}
          className="theme-choice"
          disabled={!mounted}
          key={value}
          onClick={() => setTheme(value)}
          type="button"
        >
          <Icon aria-hidden="true" size={18} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
