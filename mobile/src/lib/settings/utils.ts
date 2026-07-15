import type { SettingsSection } from "@/lib/settings/types";

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  "overview",
  "profile",
  "accounts",
  "categories",
  "loans",
  "recurring",
  "notifications",
];

export function settingsSection(value: string | undefined): SettingsSection {
  return SETTINGS_SECTIONS.includes(value as SettingsSection) ? (value as SettingsSection) : "overview";
}

export function isPositiveMoney(value: string): boolean {
  return /^\d+(?:\.\d{1,4})?$/.test(value) && Number(value) > 0;
}

export function localDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function futureDate(days = 30, date = new Date()): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}
