import { RootChart } from "@/components/RootChart";
import TransactionItem from "@/components/transaction/TransactionItem";

export default function Home() {
  return (
    <main className="flex flex-col overflow-y-auto pb-[70px]">
      <section className="text-center mt-9 mb-3">
        <h2 className="text-input font-bold uppercase tracking-wide">
          available balance
        </h2>
        <h3 className="text-5xl font-bold">$2,483.39</h3>
      </section>
      <section className="grid grid-cols-2 gap-2 p-2">
        <div className="border border-input rounded-md p-2 flex flex-col font-bold">
          <h2 className="uppercase text-xs">Income</h2>
          <h3 className="text-2xl text-right">$99,99,000</h3>
        </div>
        <div className="border border-input rounded-md p-2 flex flex-col font-bold">
          <h2 className="uppercase text-xs">Expense</h2>
          <h3 className="text-2xl text-right">$3,200</h3>
        </div>
      </section>
      <section>
        <RootChart />
      </section>
      <section className="space-y-3 px-3">
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
