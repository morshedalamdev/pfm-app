import DateFilter from "@/components/filters/DateFilter";
import FilterMenu from "@/components/filters/FilterMenu";
import Header from "@/components/Header";
import TransactionItem from "@/components/items/TransactionItem";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

export default function TransactionPage() {
  return (
    <main className="flex flex-col h-dvh">
      <Header title="Transaction">
        <Link href="/transaction/create">
          <Button variant="link" size="icon-sm">
            <Plus />
          </Button>
        </Link>
      </Header>
      <section className="flex items-center justify-between gap-1 h-[58px] p-2">
        <InputGroup className="mr-2">
          <InputGroupInput placeholder="Search..." />
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
        </InputGroup>
        <FilterMenu />
        <DateFilter />
      </section>
      <section className="space-y-4 h-[calc(100%-106px)] pb-[70px] overflow-y-auto">
        <div className="space-y-1.5">
          <div className="sticky top-0 backdrop-blur-lg flex items-center justify-between border-b border-border py-1 px-2">
            <h3 className="font-bold">31 May</h3>
            <p className="text-xs text-input">4 Transactions</p>
          </div>
          <div className="space-y-2 px-2">
            <TransactionItem
              type="expense"
              category="Transport"
              note="Uber"
              amount={45.0}
              date="14:32"
            />
            <TransactionItem
              type="income"
              category="Salary"
              note="Monthly Salary"
              amount={3000.0}
              date="09:00"
            />
            <TransactionItem
              type="expense"
              category="Dining"
              note="Restaurant"
              amount={75.5}
              date="19:20"
            />
            <TransactionItem
              type="expense"
              category="Groceries"
              note="Supermarket"
              amount={120.25}
              date="16:45"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
