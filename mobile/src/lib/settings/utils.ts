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

export function emptyToNull(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

export function isCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}

export function profileInitials(fullName: string | null, email: string): string {
  const words = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length) return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
  return email.slice(0, 1).toUpperCase() || "U";
}
