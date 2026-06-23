import { Suspense } from "react";
import { BillingSuccess } from "@/components/billing/billing-success";

export const dynamic = "force-dynamic";

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <BillingSuccess />
    </Suspense>
  );
}
