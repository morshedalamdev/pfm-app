import Header from "@/components/Header";

export default function AccountsPage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <Header homeBtn={true} title="Accounts" />
      <section className="p-3">
        <div className="rounded-xl border border-input/50 bg-secondary/70 p-4">
          <h2 className="text-base font-bold">Accounts</h2>
          <p className="mt-2 text-sm font-medium text-input">
            Account management will be available here in a later phase.
          </p>
        </div>
      </section>
    </main>
  );
}
