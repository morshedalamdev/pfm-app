import { AccountForm } from "@/components/accounts/account-form";
import { Suspense } from "react";

export default function NewAccountPage() {
  return <Suspense fallback={null}><AccountForm /></Suspense>;
}
