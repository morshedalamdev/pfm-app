import FilterBox from "@/components/FilterBox";
import Header from "@/components/Header";
import SortBox from "@/components/SortBox";
import { Button } from "@/components/ui/button";
import { Ellipsis, Plus } from "lucide-react";
import Link from "next/link";

export default function Transaction() {
  return (
    <main className="flex flex-col overflow-y-auto pb-[70px]">
      <Header title="Transaction">
        <Link href="/transaction/create"><Plus /></Link>
      </Header>
      <section className="flex items-center justify-between">
          <SortBox />
          <FilterBox />
      </section>
    </main>
  );
}
