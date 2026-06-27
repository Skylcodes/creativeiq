import Link from "next/link";

type TestQueueWidgetProps = {
  count: number;
};

export function TestQueueWidget({ count }: TestQueueWidgetProps) {
  if (count === 0) return null;

  return (
    <div className="dash-card noise-overlay border-l-[3px] border-l-accent p-5 md:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-tertiary">
        Test queue
      </p>
      <p className="mt-2.5 font-display text-2xl font-semibold tracking-[-0.04em] text-white">
        {count} hook{count !== 1 ? "s" : ""} ready to test
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
        Hooks you marked for your next ad tests.
      </p>
      <Link
        href="/hooks?queue=1"
        className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-accent-tertiary transition-colors hover:text-accent"
      >
        View queue →
      </Link>
    </div>
  );
}
