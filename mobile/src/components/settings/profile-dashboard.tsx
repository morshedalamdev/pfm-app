"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import { type FormEvent, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuthStore } from "@/lib/auth/store";
import { getProfile, updateProfile } from "@/lib/settings/api";
import type { Profile } from "@/lib/settings/types";
import { emptyToNull, isCurrencyCode, profileInitials } from "@/lib/settings/utils";

const occupations = [
  ["student", "Student"],
  ["job", "Job"],
  ["business", "Business"],
  ["nothing", "Nothing"],
] as const;

function ProfileForm({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone_number ?? "");
  const [occupation, setOccupation] = useState(profile.occupation ?? "");
  const [about, setAbout] = useState(profile.about ?? "");
  const [currency, setCurrency] = useState(profile.base_currency);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({ mutationFn: updateProfile });
  const knownOccupation = occupations.some(([value]) => value === occupation);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    if (!isCurrencyCode(currency)) { setError("Use a three-letter currency code, such as USD."); return; }
    try {
      const saved = await save.mutateAsync({ about: emptyToNull(about), base_currency: currency, email: email.trim(), full_name: emptyToNull(fullName), occupation: emptyToNull(occupation), phone_number: emptyToNull(phone) });
      setUser(saved);
      queryClient.setQueryData(["profile"], saved);
      queryClient.setQueryData(["settings", "profile"], saved);
      setNotice("Profile updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your profile.");
    }
  }

  return <><section className="profile-hero"><span className="profile-avatar" aria-hidden="true">{profileInitials(profile.full_name, profile.email)}</span><div><p className="eyebrow">PERSONAL DETAILS</p><h2>{profile.full_name || "Your profile"}</h2><p>Keep the details used across your money workspace up to date.</p></div></section><form className="profile-form" noValidate onSubmit={(event) => void submit(event)}><section className="form-card"><label className="transaction-field"><span>Full name</span><input autoComplete="name" onChange={(event) => setFullName(event.target.value)} placeholder="Your name" value={fullName} /></label><label className="transaction-field"><span>Email</span><input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} /></label><label className="transaction-field"><span>Phone number</span><input autoComplete="tel" inputMode="tel" onChange={(event) => setPhone(event.target.value)} placeholder="Optional" type="tel" value={phone} /></label><label className="transaction-field"><span>Occupation</span><select onChange={(event) => setOccupation(event.target.value)} value={occupation}><option value="">Prefer not to say</option>{!knownOccupation && occupation ? <option value={occupation}>{occupation}</option> : null}{occupations.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="transaction-field"><span>About you</span><textarea maxLength={500} onChange={(event) => setAbout(event.target.value)} placeholder="A short note about your financial focus" rows={4} value={about} /></label></section><section className="form-card profile-currency-card"><div><p className="eyebrow">MONEY DISPLAY</p><h3>Base currency</h3><p>Reports and summaries use this currency when combining your data.</p></div><label className="transaction-field"><span>Currency code</span><input aria-describedby="profile-currency-note" maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} value={currency} /></label><small id="profile-currency-note">Your account policy may limit how often this can change.</small></section>{error ? <p className="form-error" role="alert">{error}</p> : null}{notice ? <p className="form-notice" role="status">{notice}</p> : null}<button className="save-transaction-button" disabled={save.isPending} type="submit">{save.isPending ? "Saving…" : "Save profile"}</button></form></>;
}

export function ProfileDashboard() {
  const profile = useQuery({ queryFn: getProfile, queryKey: ["profile"] });
  return <MobileShell><div className="standard-page profile-page"><PageHeader backHref={"/settings" as Route} title="Profile" trailing={<ThemeToggle compact />} />{profile.isPending ? <div aria-busy="true" aria-label="Loading profile" className="profile-skeleton" /> : null}{profile.isError ? <section className="management-error" role="alert"><strong>Couldn’t load your profile</strong><p>{profile.error.message}</p><button onClick={() => void profile.refetch()} type="button">Try again</button></section> : null}{profile.data ? <ProfileForm key={profile.data.id} profile={profile.data} /> : null}</div></MobileShell>;
}
