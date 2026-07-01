import { Fragment } from "react";
import BackBtn from "@/components/BackBtn";
import Header from "@/components/Header";

export default function LoanDetailPage() {
  return (
    <Fragment>
      <Header homeBtn={true} title="Loan & Debt">
        <BackBtn />
      </Header>
      <section className="p-3 pt-6">
        <div className="border border-input rounded-md p-3 space-y-1.5">
          <h2 className="font-bold text-base">No loan record available.</h2>
          <p className="text-input text-sm">
            Loan and debt records are not available yet.
          </p>
        </div>
      </section>
    </Fragment>
  );
}
