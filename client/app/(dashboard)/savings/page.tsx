"use client";

import { Fragment, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DotIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import SavingsItem from "@/components/items/SavingsItem";

export default function SavingsPage() {
  const [filter, setFilter] = useState<"active" | "completed" | "all">(
    "active",
  );

  return (
    <Fragment>
      <Header homeBtn={true} title="Savings Goals">
        <Link href="/savings/create">
          <Button variant="link" size="icon-sm">
            <PlusIcon />
          </Button>
        </Link>
      </Header>
      <section className="mt-6 p-3 font-medium">
        <h2 className="text-input font-bold uppercase tracking-wide">
          Total Savings
        </h2>
        <h3 className="text-5xl font-bold">$2,483.39</h3>
        <h4 className="flex items-center mt-3">
          <span>3 Active Goals</span>
          <DotIcon />
          <span>Total: $7,500.00</span>
        </h4>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-3">
          <span>Overall Progress</span>
          <span>35% complete</span>
          <Progress value={40} className="h-2" />
        </div>
      </section>
      <section className="p-3 pt-0">
        <div className="bg-secondary text-primary inline-flex h-8 w-full items-center justify-center rounded-full p-1">
          <Button
            onClick={() => setFilter("all")}
            variant={filter == "all" ? "default" : "ghost"}
            className="h-6 w-1/3 rounded-full"
          >
            All
          </Button>
          <Button
            onClick={() => setFilter("active")}
            variant={filter == "active" ? "default" : "ghost"}
            className="h-6 w-1/3 rounded-full"
          >
            Active
          </Button>
          <Button
            onClick={() => setFilter("completed")}
            variant={filter == "completed" ? "default" : "ghost"}
            className="h-6 w-1/3 rounded-full"
          >
            Completed
          </Button>
        </div>
      </section>
      <section className="space-y-3 p-3 h-[calc(100%-312px)] overflow-y-auto">
        <SavingsItem />
        <SavingsItem />
        <SavingsItem />
        <SavingsItem />
        <SavingsItem />
      </section>
    </Fragment>
  );
}
