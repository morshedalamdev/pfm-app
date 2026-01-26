import { Fragment } from "react";
import FilterLoan from "@/components/filters/FilterLoan";
import Header from "@/components/Header";
import HeaderItem from "@/components/items/HeaderItem";
import LoanItem from "@/components/items/LoanItem";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";

export default function LoanPage() {
  return (
    <Fragment>
      <Header title="Loan & Debt">
        <Link href="/loan/create">
          <Button variant="link" size="icon-sm">
            <PlusIcon />
          </Button>
        </Link>
      </Header>
      <section className="grid grid-cols-2 gap-3 p-3 pb-0">
        <HeaderItem title="Lent Out" amount="$12,500" />
        <HeaderItem title="Borrowed" amount="$3,200" />
      </section>
      <section className="flex items-center justify-between gap-1.5 p-3">
        <InputGroup className="mr-1.5">
          <InputGroupInput placeholder="Search..." />
          <InputGroupAddon>
            <SearchIcon className="size-3.5" />
          </InputGroupAddon>
        </InputGroup>
        <FilterLoan />
      </section>
      <section className="h-[calc(100%-194px)] space-y-3 overflow-y-auto p-3 pb-[70px]">
        <LoanItem type="lent" />
        <LoanItem type="borrowed" />
        <LoanItem type="lent" />
        <LoanItem type="borrowed" />
        <LoanItem type="lent" />
        <LoanItem type="borrowed" />
        <LoanItem type="lent" />
        <LoanItem type="borrowed" />
        <LoanItem type="lent" />
        <LoanItem type="borrowed" />
      </section>
    </Fragment>
  );
}
