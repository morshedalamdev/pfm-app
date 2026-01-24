"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dot, Plus } from "lucide-react";
import Link from "next/link";
import SavingsItem from "@/components/items/SavingsItem";

export default function SavingsPage() {
  const [filter, setFilter] = useState<"active" | "completed" | "all">(
    "active",
  );

  return (
    <main className="flex flex-col h-dvh">
      <Header homeBtn={true} title="Savings Goals">
        <Link href="/savings/create">
          <Button variant="link" size="icon-sm">
            <Plus />
          </Button>
        </Link>
      </Header>
      <section className="mt-6 p-2 font-medium">
        <h2 className="text-input font-bold uppercase tracking-wide">
          Total Savings
        </h2>
        <h3 className="text-5xl font-bold">$2,483.39</h3>
        <h4 className="flex items-center mt-2">
          <span>3 Active Goals</span>
          <Dot />
          <span>Total: $7,500.00</span>
        </h4>
        <div className="flex flex-wrap items-center justify-between gap-1 mt-3">
          <span>Overall Progress</span>
          <span>35% complete</span>
          <Progress value={40} className="h-2" />
        </div>
      </section>
      <section className="p-2">
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
      <section className="space-y-4 h-[calc(100%-276px)] overflow-y-auto">
        <div className="space-y-2 px-2">
          <SavingsItem />
        </div>
      </section>
    </main>
  );
}
