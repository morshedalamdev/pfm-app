"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveX, Landmark, ShieldCheck, Star, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { deleteAccount, disableAccount, getAccount, getAccountDeleteEligibility, setDefaultAccount } from "@/lib/accounts/api";
import { accountDeleteReason, canDeleteAccount } from "@/lib/accounts/utils";
import { formatMoney } from "@/lib/home/view-model";

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function AccountDetail({ accountId }: { accountId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const account = useQuery({ queryFn: () => getAccount(accountId), queryKey: ["accounts", accountId] });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const setDefault = useMutation({ mutationFn: setDefaultAccount, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["accounts"] }) });
  const disable = useMutation({ mutationFn: disableAccount, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["accounts"] }) });
  const remove = useMutation({ mutationFn: deleteAccount, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["accounts"] }); router.replace("/accounts" as Route); } });
  const eligibility = useQuery({ enabled: deleteOpen, queryFn: () => getAccountDeleteEligibility(accountId), queryKey: ["accounts", accountId, "delete-eligibility"] });
  const value = account.data;

  async function confirmDelete() {
    if (!eligibility.data || !canDeleteAccount(eligibility.data)) return;
    setDeleteError(null);
    try { await remove.mutateAsync(accountId); } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "Unable to remove this account."); }
  }

  return <MobileShell><div className="standard-page account-detail-page"><PageHeader backHref={"/accounts" as Route} title="Account details" trailing={<ThemeToggle compact />} />
    {account.isPending ? <div aria-busy="true" aria-label="Loading account" className="accounts-skeleton" /> : null}
    {account.isError ? <section className="management-error" role="alert"><strong>Couldn’t load this account</strong><button onClick={() => void account.refetch()} type="button">Try again</button></section> : null}
    {value ? <><section className="account-detail-hero"><span><Landmark aria-hidden="true" size={25} /></span><p className="eyebrow">{value.type.replaceAll("_", " ")}</p><h2>{value.name}</h2><strong>{formatMoney(value.current_balance, value.currency)}</strong>{value.is_default ? <small><Star aria-hidden="true" size={13} /> Default account</small> : value.is_disabled ? <small className="account-disabled">Disabled</small> : <small>Available for transactions</small>}</section>
      <section className="account-facts" aria-label="Account information"><div><span>Opening balance</span><strong>{formatMoney(value.opening_balance, value.currency)}</strong></div><div><span>Currency</span><strong>{value.currency}</strong></div><div><span>Created</span><strong>{displayDate(value.created_at)}</strong></div></section>
      <section className="account-actions" aria-label="Account actions">{!value.is_default && !value.is_disabled ? <button disabled={setDefault.isPending} onClick={() => void setDefault.mutateAsync(accountId)} type="button"><Star aria-hidden="true" size={18} />{setDefault.isPending ? "Updating…" : "Make default"}</button> : null}{!value.is_disabled ? <button disabled={disable.isPending} onClick={() => void disable.mutateAsync(accountId)} type="button"><ArchiveX aria-hidden="true" size={18} />{disable.isPending ? "Disabling…" : "Disable account"}</button> : null}<button className="account-delete-button" onClick={() => setDeleteOpen(true)} type="button"><Trash2 aria-hidden="true" size={18} />Remove account</button></section>
      <p className="account-detail-note"><ShieldCheck aria-hidden="true" size={16} />Removing is available only when an account has no linked activity.</p>
    </> : null}
    <Drawer onOpenChange={setDeleteOpen} open={deleteOpen}><DrawerContent><DrawerHeader><DrawerTitle>Remove this account?</DrawerTitle><DrawerDescription>{eligibility.isPending ? "Checking whether this account is safe to remove…" : eligibility.data && !canDeleteAccount(eligibility.data) ? accountDeleteReason(eligibility.data) : "This permanently removes the account. This can’t be undone."}</DrawerDescription></DrawerHeader>{deleteError ? <p className="drawer-error" role="alert">{deleteError}</p> : null}<DrawerFooter>{eligibility.data && canDeleteAccount(eligibility.data) ? <button className="drawer-danger-button" disabled={remove.isPending} onClick={() => void confirmDelete()} type="button">{remove.isPending ? "Removing…" : "Remove account"}</button> : null}<DrawerClose asChild><button className="drawer-close-button" type="button">Close</button></DrawerClose></DrawerFooter></DrawerContent></Drawer>
  </div></MobileShell>;
}
