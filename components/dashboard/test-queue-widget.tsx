import Link from "next/link";
import { PremiumCard } from "@/components/ui/premium-card";

type TestQueueWidgetProps = {
  count: number;
};

export function TestQueueWidget({ count }: TestQueueWidgetProps) {
  if (count === 0) return null;

  return (
    <PremiumCard variant="accent" padding="md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
        Test queue
      </p>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-text-primary">
        {count} hook{count !== 1 ? "s" : ""} ready to test
      </p>
      <p className="mt-1 text-sm text-text-secondary">
        Hooks you marked for your next ad tests.
      </p>
      <Link
        href="/hooks?queue=1"
        className="mt-4 inline-flex text-sm font-semibold text-accent hover:underline"
      >
        View queue →
      </Link>
    </PremiumCard>
  );
}
