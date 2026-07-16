"use client";

import { Check, Search } from "lucide-react";
import { type KeyboardEvent, useId, useMemo, useState } from "react";

import { isWorldCurrency, worldCurrencyOptions } from "@/lib/accounts/currencies";

type CurrencyPickerProps = Readonly<{
  id?: string;
  onChange: (currency: string) => void;
  value: string;
}>;

export function CurrencyPicker({ id = "account-currency", onChange, value }: CurrencyPickerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);
  const options = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search || search === value.toLowerCase()) return worldCurrencyOptions;
    return worldCurrencyOptions.filter(({ code, name }) => code.toLowerCase().includes(search) || name.toLowerCase().includes(search));
  }, [query, value]);

  function select(code: string) {
    setQuery(code);
    onChange(code);
    setOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        const offset = event.key === "ArrowDown" ? 1 : -1;
        return Math.max(0, Math.min(options.length - 1, current + offset));
      });
      return;
    }
    if (event.key === "Enter" && open && options[activeIndex]) {
      event.preventDefault();
      select(options[activeIndex].code);
    }
  }

  return <div className="currency-picker"><div className="currency-picker-input"><Search aria-hidden="true" size={16} /><input aria-activedescendant={open && options[activeIndex] ? `${listId}-${options[activeIndex].code}` : undefined} aria-autocomplete="list" aria-controls={listId} aria-expanded={open} aria-label="Currency" autoComplete="off" id={id} onBlur={() => setOpen(false)} onChange={(event) => { const next = event.target.value; const normalized = next.trim().toUpperCase(); setQuery(next); onChange(isWorldCurrency(normalized) ? normalized : ""); setActiveIndex(0); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={handleKeyDown} placeholder="Search currency" role="combobox" type="search" value={query} /></div>{open ? <div aria-label="World currencies" className="currency-picker-list" id={listId} role="listbox">{options.length ? options.map(({ code, name }, index) => <button aria-selected={code === value} className={index === activeIndex ? "currency-picker-option currency-picker-option--active" : "currency-picker-option"} id={`${listId}-${code}`} key={code} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(code)} role="option" type="button"><span><strong>{code}</strong><small>{name}</small></span>{code === value ? <Check aria-hidden="true" size={16} /> : null}</button>) : <p className="currency-picker-empty">No currency found.</p>}</div> : null}</div>;
}
