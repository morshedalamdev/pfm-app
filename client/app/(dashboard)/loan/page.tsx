import { Fragment } from "react";
import Header from "@/components/Header";

export default function LoanPage() {
  return (
    <Fragment>
      <Header title="Loan & Debt" />
      <section className="p-3">
        <div className="border border-input rounded-md p-3 space-y-1.5">
          <h2 className="font-bold text-base">No loan records available.</h2>
          <p className="text-input text-sm">
            Loan and debt records are not available yet.
          </p>
        </div>
      </section>
    </Fragment>
  );
}
