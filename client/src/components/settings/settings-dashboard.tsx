"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarClock,
  CircleUserRound,
  Landmark,
  ReceiptText,
  Tags,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { formatMoney } from "@/lib/home/view-model";
import {
  archiveCategory,
  changeRecurringState,
  createAccount,
  createCategory,
  createLoanPerson,
  createLoanRecord,
  createRecurringRule,
  disableAccount,
  getAccounts,
  getCategories,
  getLoanData,
  getNotifications,
  getProfile,
  getRecurringData,
  markAllNotificationsRead,
  markNotificationRead,
  setDefaultAccount,
  settleLoan,
  updateProfile,
} from "@/lib/settings/api";
import type { LoanData, Profile, RecurringData, SettingsSection } from "@/lib/settings/types";
import { futureDate, isPositiveMoney, localDateTimeValue } from "@/lib/settings/utils";
import { useAuthStore } from "@/lib/auth/store";

const sectionItems: ReadonlyArray<{ icon: typeof Bell; label: string; value: SettingsSection }> = [
  { icon: WalletCards, label: "Overview", value: "overview" },
  { icon: CircleUserRound, label: "Profile", value: "profile" },
  { icon: Landmark, label: "Accounts", value: "accounts" },
  { icon: Tags, label: "Categories", value: "categories" },
  { icon: ReceiptText, label: "Loans", value: "loans" },
  { icon: CalendarClock, label: "Recurring", value: "recurring" },
  { icon: Bell, label: "Alerts", value: "notifications" },
];

function messageFor(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

function SectionCard({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string }) {
  return <section className="management-card"><div className="management-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{children}</section>;
}

function LoadState({ error, label, onRetry }: { error: boolean; label: string; onRetry: () => void }) {
  if (error) return <div className="management-error" role="alert"><strong>Couldn’t load {label}</strong><button onClick={onRetry} type="button">Try again</button></div>;
  return <div aria-label={`Loading ${label}`} className="management-loading" role="status"><span /><span /><span /></div>;
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return <button className="management-submit" disabled={busy} type="submit">{busy ? "Saving…" : children}</button>;
}

function OverviewSection() {
  return <><SectionCard eyebrow="APPEARANCE" title="Choose your theme"><p className="settings-description">Use a light, dark, or device-matched experience.</p><ThemeToggle /></SectionCard><SectionCard eyebrow="YOUR SPACE" title="Everything in one pocket"><p className="settings-description">Keep accounts, categories, loans, schedules, and alerts in sync with your finance data.</p><div className="management-mini-grid"><span><Landmark aria-hidden="true" size={18} />Accounts</span><span><CalendarClock aria-hidden="true" size={18} />Schedules</span><span><Bell aria-hidden="true" size={18} />Alerts</span></div></SectionCard><LogoutButton /></>;
}

function ProfileSection() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const profile = useQuery({ queryFn: getProfile, queryKey: ["settings", "profile"] });
  if (!profile.data) return <LoadState error={profile.isError} label="your profile" onRetry={() => void profile.refetch()} />;
  return <ProfileForm key={profile.data.id} onSaved={(user) => { setUser(user); queryClient.setQueryData(["settings", "profile"], user); }} profile={profile.data} />;
}

function ProfileForm({ onSaved, profile }: { onSaved: (profile: Profile) => void; profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone_number ?? "");
  const [occupation, setOccupation] = useState(profile.occupation ?? "");
  const [about, setAbout] = useState(profile.about ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: updateProfile });
  async function submit(event: FormEvent) {
    event.preventDefault(); setNotice(null);
    try {
      const saved = await mutation.mutateAsync({ about: about.trim() || null, full_name: fullName.trim() || null, occupation: occupation.trim() || null, phone_number: phone.trim() || null });
      onSaved(saved); setNotice("Profile updated.");
    } catch (cause) { setNotice(messageFor(cause, "Unable to update your profile.")); }
  }
  return <SectionCard eyebrow="PERSONAL DETAILS" title="Your profile"><form className="management-form" onSubmit={(event) => void submit(event)}><label><span>Full name</span><input autoComplete="name" onChange={(event) => setFullName(event.target.value)} value={fullName} /></label><label><span>Email</span><input disabled value={profile.email} /></label><label><span>Phone</span><input autoComplete="tel" onChange={(event) => setPhone(event.target.value)} value={phone} /></label><label><span>Occupation</span><input onChange={(event) => setOccupation(event.target.value)} value={occupation} /></label><label><span>About</span><textarea maxLength={500} onChange={(event) => setAbout(event.target.value)} value={about} /></label>{notice ? <p className={notice === "Profile updated." ? "form-notice" : "form-error"} role="status">{notice}</p> : null}<SubmitButton busy={mutation.isPending}>Save profile</SubmitButton></form></SectionCard>;
}

function AccountsSection() {
  const queryClient = useQueryClient();
  const accounts = useQuery({ queryFn: getAccounts, queryKey: ["settings", "accounts"] });
  const [name, setName] = useState(""); const [type, setType] = useState<"cash" | "debit_card" | "credit_card" | "bank_account" | "mobile_banking">("bank_account"); const [balance, setBalance] = useState("0"); const [currency, setCurrency] = useState("USD"); const [error, setError] = useState<string | null>(null);
  const create = useMutation({ mutationFn: createAccount });
  const state = useMutation({ mutationFn: ({ action, id }: { action: "default" | "disable"; id: string }) => action === "default" ? setDefaultAccount(id) : disableAccount(id) });
  async function refresh() { await queryClient.invalidateQueries({ queryKey: ["settings", "accounts"] }); }
  async function submit(event: FormEvent) { event.preventDefault(); setError(null); if (!name.trim() || !/^\d+(?:\.\d{1,4})?$/.test(balance) || !/^[A-Z]{3}$/.test(currency)) { setError("Enter a name, valid balance, and currency."); return; } try { await create.mutateAsync({ currency, name: name.trim(), opening_balance: balance, type }); setName(""); setBalance("0"); await refresh(); } catch (cause) { setError(messageFor(cause, "Unable to add the account.")); } }
  if (!accounts.data) return <LoadState error={accounts.isError} label="accounts" onRetry={() => void accounts.refetch()} />;
  const visible = accounts.data.items.filter((account) => !account.is_archived);
  return <><SectionCard eyebrow="MONEY SOURCES" title="Accounts"><div className="management-list">{visible.length ? visible.map((account) => <article className="management-row" key={account.id}><span className="category-icon accent-blue"><Landmark aria-hidden="true" size={19} /></span><div><strong>{account.name}</strong><span>{formatMoney(account.current_balance, account.currency)} · {account.type.replaceAll("_", " ")}</span></div><div className="row-actions">{account.is_default ? <span className="status-pill">Default</span> : !account.is_disabled ? <button disabled={state.isPending} onClick={() => void state.mutateAsync({ action: "default", id: account.id }).then(refresh)} type="button">Make default</button> : null}{!account.is_disabled ? <button disabled={state.isPending} onClick={() => void state.mutateAsync({ action: "disable", id: account.id }).then(refresh)} type="button">Disable</button> : <span className="status-pill status-pill--muted">Disabled</span>}</div></article>) : <p className="management-empty">No accounts yet.</p>}</div></SectionCard><SectionCard eyebrow="NEW ACCOUNT" title="Add a money source"><form className="management-form" onSubmit={(event) => void submit(event)}><label><span>Account name</span><input onChange={(event) => setName(event.target.value)} value={name} /></label><div className="management-form-grid"><label><span>Type</span><select onChange={(event) => setType(event.target.value as typeof type)} value={type}><option value="bank_account">Bank account</option><option value="cash">Cash</option><option value="debit_card">Debit card</option><option value="credit_card">Credit card</option><option value="mobile_banking">Mobile banking</option></select></label><label><span>Currency</span><input maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} value={currency} /></label></div><label><span>Opening balance</span><input inputMode="decimal" onChange={(event) => setBalance(event.target.value)} value={balance} /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<SubmitButton busy={create.isPending}>Add account</SubmitButton></form></SectionCard></>;
}

function CategoriesSection() {
  const queryClient = useQueryClient(); const categories = useQuery({ queryFn: () => getCategories(), queryKey: ["settings", "categories"] }); const [name, setName] = useState(""); const [kind, setKind] = useState<"expense" | "income">("expense"); const [error, setError] = useState<string | null>(null); const create = useMutation({ mutationFn: createCategory }); const archive = useMutation({ mutationFn: archiveCategory });
  async function refresh() { await queryClient.invalidateQueries({ queryKey: ["settings", "categories"] }); }
  async function submit(event: FormEvent) { event.preventDefault(); setError(null); if (!name.trim()) { setError("Enter a category name."); return; } try { await create.mutateAsync({ icon_key: kind === "income" ? "wallet" : "tag", kind, name: name.trim() }); setName(""); await refresh(); } catch (cause) { setError(messageFor(cause, "Unable to create the category.")); } }
  if (!categories.data) return <LoadState error={categories.isError} label="categories" onRetry={() => void categories.refetch()} />;
  const visible = categories.data.items.filter((category) => !category.is_archived);
  return <><SectionCard eyebrow="ORGANIZE" title="Categories"><div className="management-list">{visible.length ? visible.map((category) => <article className="management-row" key={category.id}><span className={`category-icon ${category.kind === "income" ? "accent-green" : "accent-purple"}`}><Tags aria-hidden="true" size={19} /></span><div><strong>{category.name}</strong><span>{category.kind}</span></div>{category.is_default ? <span className="status-pill">Built in</span> : <button className="row-delete" disabled={archive.isPending} onClick={() => void archive.mutateAsync(category.id).then(refresh)} type="button">Archive</button>}</article>) : <p className="management-empty">No categories yet.</p>}</div></SectionCard><SectionCard eyebrow="NEW CATEGORY" title="Add a label"><form className="management-form" onSubmit={(event) => void submit(event)}><label><span>Name</span><input onChange={(event) => setName(event.target.value)} value={name} /></label><label><span>Type</span><select onChange={(event) => setKind(event.target.value as typeof kind)} value={kind}><option value="expense">Expense</option><option value="income">Income</option></select></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<SubmitButton busy={create.isPending}>Add category</SubmitButton></form></SectionCard></>;
}

function LoansSection() {
  const queryClient = useQueryClient(); const loans = useQuery({ queryFn: getLoanData, queryKey: ["settings", "loans"] });
  if (!loans.data) return <LoadState error={loans.isError} label="loans" onRetry={() => void loans.refetch()} />;
  return <LoanContent data={loans.data} refresh={() => queryClient.invalidateQueries({ queryKey: ["settings", "loans"] })} />;
}

function LoanContent({ data, refresh }: { data: LoanData; refresh: () => Promise<unknown> }) {
  const [personName, setPersonName] = useState(""); const [phone, setPhone] = useState(""); const [personId, setPersonId] = useState(data.people[0]?.id ?? ""); const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? ""); const [direction, setDirection] = useState<"given" | "taken">("given"); const [amount, setAmount] = useState(""); const [currency, setCurrency] = useState(data.summary.currency); const [issuedAt, setIssuedAt] = useState(localDateTimeValue()); const [repayDate, setRepayDate] = useState(futureDate()); const [error, setError] = useState<string | null>(null); const [settlements, setSettlements] = useState<Record<string, string>>({});
  const person = useMutation({ mutationFn: createLoanPerson }); const record = useMutation({ mutationFn: createLoanRecord }); const settlement = useMutation({ mutationFn: ({ amount: paid, id }: { amount: string; id: string }) => settleLoan(id, { account_id: accountId, amount: paid, note: null, settled_at: new Date().toISOString() }) });
  async function addPerson(event: FormEvent) { event.preventDefault(); setError(null); if (!personName.trim() || !phone.trim()) { setError("Enter a name and phone number."); return; } try { const created = await person.mutateAsync({ name: personName.trim(), note: null, phone_number: phone.trim() }); setPersonId(created.id); setPersonName(""); setPhone(""); await refresh(); } catch (cause) { setError(messageFor(cause, "Unable to add the contact.")); } }
  async function addRecord(event: FormEvent) { event.preventDefault(); setError(null); if (!personId || !accountId || !isPositiveMoney(amount) || !repayDate) { setError("Choose a contact and account, then enter amount and repay date."); return; } try { await record.mutateAsync({ account_id: accountId, currency, direction, issued_at: new Date(issuedAt).toISOString(), note: null, person_id: personId, principal_amount: amount, repay_date: repayDate }); setAmount(""); await refresh(); } catch (cause) { setError(messageFor(cause, "Unable to create the loan.")); } }
  async function pay(id: string) { const paid = settlements[id] ?? ""; setError(null); if (!accountId || !isPositiveMoney(paid)) { setError("Choose an account and enter a positive settlement."); return; } try { await settlement.mutateAsync({ amount: paid, id }); setSettlements((current) => ({ ...current, [id]: "" })); await refresh(); } catch (cause) { setError(messageFor(cause, "Unable to record the settlement.")); } }
  const people = new Map(data.people.map((item) => [item.id, item.name]));
  return <><div className="loan-summary-grid"><span><small>Given</small><strong>{formatMoney(data.summary.total_loan_given, data.summary.currency)}</strong></span><span><small>Taken</small><strong>{formatMoney(data.summary.total_loan_taken, data.summary.currency)}</strong></span><span><small>Due</small><strong>{formatMoney(data.summary.due_loan, data.summary.currency)}</strong></span></div><SectionCard eyebrow="OPEN RECORDS" title="Loans"><div className="management-list">{data.records.length ? data.records.map((loan) => <article className="loan-row" key={loan.id}><div className="management-row"><span className={`category-icon ${loan.direction === "given" ? "accent-coral" : "accent-blue"}`}><ReceiptText aria-hidden="true" size={19} /></span><div><strong>{people.get(loan.person_id) ?? "Loan contact"}</strong><span>{loan.direction} · due {loan.repay_date ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${loan.repay_date}T00:00:00`)) : "later"}</span></div><strong>{formatMoney(loan.outstanding_amount, loan.currency)}</strong></div><div className="settlement-form"><input aria-label={`Settlement for ${people.get(loan.person_id) ?? "loan"}`} inputMode="decimal" onChange={(event) => setSettlements((current) => ({ ...current, [loan.id]: event.target.value }))} placeholder="Settlement" value={settlements[loan.id] ?? ""} /><button disabled={settlement.isPending} onClick={() => void pay(loan.id)} type="button">Record</button></div></article>) : <p className="management-empty">No open loans.</p>}</div></SectionCard><SectionCard eyebrow="LOAN CONTACT" title="Add a person"><form className="management-form" onSubmit={(event) => void addPerson(event)}><label><span>Name</span><input onChange={(event) => setPersonName(event.target.value)} value={personName} /></label><label><span>Phone</span><input onChange={(event) => setPhone(event.target.value)} value={phone} /></label><SubmitButton busy={person.isPending}>Add person</SubmitButton></form></SectionCard><SectionCard eyebrow="NEW RECORD" title="Track a loan"><form className="management-form" onSubmit={(event) => void addRecord(event)}><div className="management-form-grid"><label><span>Person</span><select onChange={(event) => setPersonId(event.target.value)} value={personId}><option value="">Choose person</option>{data.people.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Direction</span><select onChange={(event) => setDirection(event.target.value as typeof direction)} value={direction}><option value="given">I gave</option><option value="taken">I took</option></select></label></div><label><span>Account</span><select onChange={(event) => setAccountId(event.target.value)} value={accountId}><option value="">Choose account</option>{data.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="management-form-grid"><label><span>Amount</span><input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} /></label><label><span>Currency</span><input maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} value={currency} /></label></div><div className="management-form-grid"><label><span>Loan date</span><input onChange={(event) => setIssuedAt(event.target.value)} type="datetime-local" value={issuedAt} /></label><label><span>Repay date</span><input min={issuedAt.slice(0, 10)} onChange={(event) => setRepayDate(event.target.value)} type="date" value={repayDate} /></label></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<SubmitButton busy={record.isPending}>Create loan</SubmitButton></form></SectionCard></>;
}

function RecurringSection() {
  const queryClient = useQueryClient(); const recurring = useQuery({ queryFn: getRecurringData, queryKey: ["settings", "recurring"] });
  if (!recurring.data) return <LoadState error={recurring.isError} label="recurring items" onRetry={() => void recurring.refetch()} />;
  return <RecurringContent data={recurring.data} refresh={() => queryClient.invalidateQueries({ queryKey: ["settings", "recurring"] })} />;
}

function RecurringContent({ data, refresh }: { data: RecurringData; refresh: () => Promise<unknown> }) {
  const [kind, setKind] = useState<"expense" | "income">("expense"); const [accountId, setAccountId] = useState(data.accounts[0]?.id ?? ""); const suitable = data.categories.filter((item) => item.kind === kind); const [categoryId, setCategoryId] = useState(suitable[0]?.id ?? ""); const [amount, setAmount] = useState(""); const [description, setDescription] = useState(""); const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly"); const [startAt, setStartAt] = useState(localDateTimeValue()); const [error, setError] = useState<string | null>(null); const create = useMutation({ mutationFn: createRecurringRule }); const state = useMutation({ mutationFn: changeRecurringState });
  function changeKind(value: "expense" | "income") { setKind(value); setCategoryId(data.categories.find((item) => item.kind === value)?.id ?? ""); }
  async function submit(event: FormEvent) { event.preventDefault(); setError(null); if (!accountId || !categoryId || !isPositiveMoney(amount)) { setError("Choose an account and category, then enter a positive amount."); return; } try { await create.mutateAsync({ account_id: accountId, amount, category_id: categoryId, description: description.trim() || null, end_at: null, frequency, interval_count: 1, start_at: new Date(startAt).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", transaction_type: kind }); setAmount(""); setDescription(""); await refresh(); } catch (cause) { setError(messageFor(cause, "Unable to create the recurring item.")); } }
  return <><SectionCard eyebrow="AUTOMATIONS" title="Recurring items"><div className="management-list">{data.rules.length ? data.rules.map((rule) => <article className="management-row" key={rule.id}><span className={`category-icon ${rule.transaction_type === "income" ? "accent-green" : "accent-orange"}`}><CalendarClock aria-hidden="true" size={19} /></span><div><strong>{rule.description || `${rule.frequency} ${rule.transaction_type}`}</strong><span>{formatMoney(rule.amount, rule.currency)} · next {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(rule.next_run_at))}</span></div><button className="state-button" disabled={state.isPending} onClick={() => void state.mutateAsync(rule).then(refresh)} type="button">{rule.status === "paused" ? "Resume" : "Pause"}</button></article>) : <p className="management-empty">No recurring items yet.</p>}</div></SectionCard><SectionCard eyebrow="NEW SCHEDULE" title="Repeat a transaction"><form className="management-form" onSubmit={(event) => void submit(event)}><div className="management-form-grid"><label><span>Type</span><select onChange={(event) => changeKind(event.target.value as typeof kind)} value={kind}><option value="expense">Expense</option><option value="income">Income</option></select></label><label><span>Frequency</span><select onChange={(event) => setFrequency(event.target.value as typeof frequency)} value={frequency}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label></div><label><span>Account</span><select onChange={(event) => setAccountId(event.target.value)} value={accountId}><option value="">Choose account</option>{data.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Category</span><select onChange={(event) => setCategoryId(event.target.value)} value={categoryId}><option value="">Choose category</option>{data.categories.filter((item) => item.kind === kind).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Amount</span><input inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} /></label><label><span>Description</span><input onChange={(event) => setDescription(event.target.value)} value={description} /></label><label><span>First run</span><input onChange={(event) => setStartAt(event.target.value)} type="datetime-local" value={startAt} /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<SubmitButton busy={create.isPending}>Create schedule</SubmitButton></form></SectionCard></>;
}

function NotificationsSection() {
  const queryClient = useQueryClient(); const [unreadOnly, setUnreadOnly] = useState(false); const notifications = useQuery({ queryFn: () => getNotifications(unreadOnly), queryKey: ["settings", "notifications", unreadOnly] }); const read = useMutation({ mutationFn: markNotificationRead }); const readAll = useMutation({ mutationFn: markAllNotificationsRead }); const refresh = () => queryClient.invalidateQueries({ queryKey: ["settings", "notifications"] });
  if (!notifications.data) return <LoadState error={notifications.isError} label="notifications" onRetry={() => void notifications.refetch()} />;
  const unread = notifications.data.items.filter((item) => !item.read_at).length;
  return <SectionCard eyebrow={`${unread} UNREAD`} title="Notifications"><div className="notification-toolbar"><button aria-pressed={unreadOnly} onClick={() => setUnreadOnly((value) => !value)} type="button">Unread only</button><button disabled={!unread || readAll.isPending} onClick={() => void readAll.mutateAsync().then(refresh)} type="button">Mark all read</button></div><div className="notification-list">{notifications.data.items.length ? notifications.data.items.map((item) => <article className={item.read_at ? "notification-row" : "notification-row notification-row--unread"} key={item.id}><span className="category-icon accent-purple"><Bell aria-hidden="true" size={18} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</small></div>{!item.read_at ? <button aria-label={`Mark ${item.title} read`} disabled={read.isPending} onClick={() => void read.mutateAsync(item.id).then(refresh)} type="button">Read</button> : null}</article>) : <p className="management-empty">You’re all caught up.</p>}</div></SectionCard>;
}

type SettingsDashboardProps = Readonly<{
  initialSection: SettingsSection;
  standalone?: boolean;
  title?: string;
}>;

export function SettingsDashboard({
  initialSection,
  standalone = false,
  title = "Settings",
}: SettingsDashboardProps) {
  const router = useRouter(); const [section, setSection] = useState(initialSection);
  function choose(value: SettingsSection) { setSection(value); router.replace(`/settings?section=${value}` as Route, { scroll: false }); }
  return <MobileShell><div className="standard-page settings-page"><PageHeader backHref={standalone ? "/" : undefined} title={title} trailing={<span className="settings-avatar"><UserRound aria-hidden="true" size={18} /></span>} />{!standalone ? <nav aria-label="Settings sections" className="settings-tabs">{sectionItems.map(({ icon: Icon, label, value }) => <button aria-current={section === value ? "page" : undefined} key={value} onClick={() => choose(value)} type="button"><Icon aria-hidden="true" size={17} /><span>{label}</span></button>)}</nav> : null}<div className="settings-content">{section === "overview" ? <OverviewSection /> : null}{section === "profile" ? <ProfileSection /> : null}{section === "accounts" ? <AccountsSection /> : null}{section === "categories" ? <CategoriesSection /> : null}{section === "loans" ? <LoansSection /> : null}{section === "recurring" ? <RecurringSection /> : null}{section === "notifications" ? <NotificationsSection /> : null}</div></div></MobileShell>;
}
