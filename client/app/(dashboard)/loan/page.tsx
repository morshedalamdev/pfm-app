import FilterMenu from "@/components/filter/FilterMenu";
import Header from "@/components/Header";
import LoanItem from "@/components/LoanItem";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

export default function Loan() {
  return (
    <main className="flex flex-col h-dvh">
      <Header title="Loan & Debt">
        <Link href="/loan/create">
          <Button variant="link" size="icon-sm">
            <Plus />
          </Button>
        </Link>
      </Header>
      <section className="grid grid-cols-2 gap-2 p-2">
        <div className="border border-input rounded-md p-2 flex flex-col font-bold">
          <h2 className="uppercase text-xs">Lent Out</h2>
          <h3 className="text-2xl text-right">$99,99,000</h3>
        </div>
        <div className="border border-input rounded-md p-2 flex flex-col font-bold">
          <h2 className="uppercase text-xs">Borrowed</h2>
          <h3 className="text-2xl text-right">$3,200</h3>
        </div>
      </section>
      <section className="flex items-center justify-between gap-1 h-[58px] p-2">
        <InputGroup className="mr-2">
          <InputGroupInput placeholder="Search..." />
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
        </InputGroup>
        <FilterMenu />
      </section>
      <section className="space-y-4 h-[calc(100%-194px)] pb-[70px] overflow-y-auto mt-2">
        <div className="space-y-2 px-2">
          <LoanItem type="lent" />
          <LoanItem type="borrowed" />
        </div>
      </section>
    </main>
  );
}
