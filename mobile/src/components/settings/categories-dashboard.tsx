"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Plus, Tags } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getCategories } from "@/lib/settings/api";

type CategoryFilter = "all" | "expense" | "income";

export function CategoriesDashboard() {
  const categories = useQuery({ queryFn: () => getCategories(), queryKey: ["categories"] });
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const active = categories.data?.items.filter((item) => !item.is_archived) ?? [];
  const visible = filter === "all" ? active : active.filter((item) => item.kind === filter);
  const expenseCount = active.filter((item) => item.kind === "expense").length;
  const incomeCount = active.filter((item) => item.kind === "income").length;

  return <MobileShell><div className="standard-page categories-page"><PageHeader backHref={"/settings" as Route} title="Categories" /><section className="categories-hero"><div><p className="eyebrow">ORGANIZE YOUR MONEY</p><h2>Give every transaction a clear home.</h2><p>Categories make budgets and reports easier to understand.</p></div><Link href={"/settings/categories/new" as Route}><Plus aria-hidden="true" size={18} />New category</Link></section><section className="category-summary" aria-label="Category summary"><div><span className="category-icon accent-coral"><ArrowUpRight aria-hidden="true" size={18} /></span><span><small>Expense</small><strong>{expenseCount}</strong></span></div><div><span className="category-icon accent-green"><ArrowDownLeft aria-hidden="true" size={18} /></span><span><small>Income</small><strong>{incomeCount}</strong></span></div></section><div className="category-filter" aria-label="Filter categories" role="group">{(["all", "expense", "income"] as const).map((value) => <button aria-pressed={filter === value} key={value} onClick={() => setFilter(value)} type="button">{value === "all" ? "All" : value === "expense" ? "Expense" : "Income"}</button>)}</div>{categories.isPending ? <div aria-busy="true" aria-label="Loading categories" className="categories-skeleton" /> : null}{categories.isError ? <section className="management-error" role="alert"><strong>Couldn’t load your categories</strong><button onClick={() => void categories.refetch()} type="button">Try again</button></section> : null}{categories.data ? <section aria-label={`${filter === "all" ? "All" : filter} categories`} className="category-list">{visible.length ? visible.map((category) => category.is_default ? <article className="category-list-row" key={category.id}><span className={`category-icon ${category.kind === "income" ? "accent-green" : "accent-purple"}`}><Tags aria-hidden="true" size={19} /></span><span><strong>{category.name}</strong><small>{category.kind} · built in</small></span><span className="status-pill">Built in</span></article> : <Link className="category-list-row" href={`/settings/categories/${category.id}/edit` as Route} key={category.id}><span className={`category-icon ${category.kind === "income" ? "accent-green" : "accent-purple"}`}><Tags aria-hidden="true" size={19} /></span><span><strong>{category.name}</strong><small>{category.kind} · custom</small></span><ChevronRight aria-hidden="true" size={18} /></Link>) : <div className="categories-empty"><Tags aria-hidden="true" size={24} /><strong>No {filter === "all" ? "" : `${filter} `}categories here</strong><p>Create a label that matches how you earn or spend.</p><Link href={"/settings/categories/new" as Route}>Add category</Link></div>}</section> : null}</div></MobileShell>;
}
