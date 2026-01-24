import HeaderItem from "@/components/items/HeaderItem";
import { RootChart } from "@/components/charts/RootChart";
import TransactionItem from "@/components/items/TransactionItem";

export default function HomePage() {
  return (
    <main className="flex flex-col overflow-y-auto pb-[70px]">
      <section className="text-center mt-9 mb-3">
        <h2 className="text-input font-bold uppercase tracking-wide">
          available balance
        </h2>
        <h3 className="text-5xl font-bold">$2,483.39</h3>
      </section>
      <section className="grid grid-cols-2 gap-2 p-2">
        <HeaderItem title="Income" amount="$5,000.00" />
        <HeaderItem title="Expense" amount="$2,516.61" />
      </section>
      <section>
        <RootChart />
      </section>
      <section className="space-y-3 px-2">
        <h2 className="font-bold text-lg">Recent Transactions</h2>
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
      </section>
    </main>
  );
}
