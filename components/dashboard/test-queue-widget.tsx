import Link from "next/link";

type TestQueueWidgetProps = {
  count: number;
};

export function TestQueueWidget({ count }: TestQueueWidgetProps) {
  if (count === 0) return null;

  return (
    <div className="dash-card border-l-[3px] border-l-[#6947ff] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6947ff]">
        Test queue
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
        {count} hook{count !== 1 ? "s" : ""} ready to test
      </p>
      <p className="mt-1 text-[13px] text-text-secondary">
        Hooks you marked for your next ad tests.
      </p>
      <Link
        href="/hooks?queue=1"
        className="mt-4 inline-flex text-[13px] font-semibold text-[#4c3d8f] hover:underline"
      >
        View queue →
      </Link>
    </div>
  );
}
