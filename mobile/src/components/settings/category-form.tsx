"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tags, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { archiveCategory, createCategory, getCategory, updateCategory } from "@/lib/settings/api";
import type { Category } from "@/lib/settings/types";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";

const iconChoices = [
  ["tag", "General"],
  ["shopping-cart", "Shopping"],
  ["utensils", "Food"],
  ["car", "Transport"],
  ["home", "Home"],
  ["briefcase", "Work"],
  ["wallet", "Wallet"],
] as const;

function CategoryEditor({ category, initialKind, nextPath }: { category?: Category; initialKind: "expense" | "income"; nextPath: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<"expense" | "income">(category?.kind === "income" ? "income" : category ? "expense" : initialKind);
  const [iconKey, setIconKey] = useState(category?.icon_key ?? "tag");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({ mutationFn: async () => category ? updateCategory(category.id, { icon_key: iconKey, kind, name: name.trim() }) : createCategory({ icon_key: iconKey, kind, name: name.trim() }) });
  const archive = useMutation({ mutationFn: archiveCategory });
  const knownIcon = iconChoices.some(([value]) => value === iconKey);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["budget-setup"] }),
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
      queryClient.invalidateQueries({ queryKey: ["recurring-editor"] }),
      queryClient.invalidateQueries({ queryKey: ["settings", "categories"] }),
      queryClient.invalidateQueries({ queryKey: ["transaction-options"] }),
    ]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Enter a category name."); return; }
    try { await save.mutateAsync(); await refresh(); router.replace((nextPath === "/" ? "/settings/categories" : nextPath) as Route); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this category."); }
  }

  async function confirmArchive() {
    if (!category || category.is_default) return;
    setError(null);
    try { await archive.mutateAsync(category.id); await refresh(); router.replace("/settings/categories" as Route); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to archive this category."); setArchiveOpen(false); }
  }

  return <><section className="category-form-intro"><span className={`category-icon ${kind === "income" ? "accent-green" : "accent-purple"}`}><Tags aria-hidden="true" size={22} /></span><div><p className="eyebrow">{category ? "CUSTOM CATEGORY" : "NEW CATEGORY"}</p><h2>{category ? "Keep this label useful." : "What should this money be called?"}</h2><p>Use a short name you will recognize when adding a transaction.</p></div></section><form className="category-form" noValidate onSubmit={(event) => void submit(event)}><section className="form-card"><label className="transaction-field"><span>Category name</span><input autoFocus maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Books" value={name} /></label><label className="transaction-field"><span>Money type</span><select onChange={(event) => setKind(event.target.value as typeof kind)} value={kind}><option value="expense">Expense</option><option value="income">Income</option></select></label><label className="transaction-field"><span>Icon style</span><select onChange={(event) => setIconKey(event.target.value)} value={iconKey}>{!knownIcon ? <option value={iconKey}>{iconKey}</option> : null}{iconChoices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></section>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="save-transaction-button" disabled={save.isPending} type="submit">{save.isPending ? "Saving…" : category ? "Save category" : "Create category"}</button>{category && !category.is_default ? <button className="category-archive-button" onClick={() => setArchiveOpen(true)} type="button"><Trash2 aria-hidden="true" size={18} />Archive category</button> : null}</form><Drawer onOpenChange={setArchiveOpen} open={archiveOpen}><DrawerContent><DrawerHeader><DrawerTitle>Archive {category?.name}?</DrawerTitle><DrawerDescription>It disappears from new transactions, while past records keep their category.</DrawerDescription></DrawerHeader><DrawerFooter><button className="drawer-danger-button" disabled={archive.isPending} onClick={() => void confirmArchive()} type="button">{archive.isPending ? "Archiving…" : "Archive category"}</button><DrawerClose asChild><button className="drawer-close-button" type="button">Keep category</button></DrawerClose></DrawerFooter></DrawerContent></Drawer></>;
}

export function CategoryForm({ categoryId, kind, next }: { categoryId?: string; kind?: string; next?: string }) {
  const category = useQuery({ enabled: Boolean(categoryId), queryFn: () => getCategory(categoryId ?? ""), queryKey: ["categories", categoryId] });
  const isNew = !categoryId;
  const nextPath = getSafeNextPath(next);
  const initialKind = kind === "income" ? "income" : "expense";
  return <MobileShell><div className="standard-page category-form-page"><PageHeader backHref={"/settings/categories" as Route} title={isNew ? "New category" : "Edit category"} />{categoryId && category.isPending ? <div aria-busy="true" aria-label="Loading category" className="categories-skeleton" /> : null}{category.isError ? <section className="management-error" role="alert"><strong>Couldn’t load this category</strong><p>{category.error.message}</p><button onClick={() => void category.refetch()} type="button">Try again</button></section> : null}{isNew ? <CategoryEditor initialKind={initialKind} nextPath={nextPath} /> : category.data ? <CategoryEditor category={category.data} initialKind={initialKind} key={category.data.id} nextPath={nextPath} /> : null}</div></MobileShell>;
}
