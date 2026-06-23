import Link from "next/link";

type DashboardErrorProps = {
  message: string;
};

export function DashboardError({ message }: DashboardErrorProps) {
  const isMissingTable = message.toLowerCase().includes("analyses");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="dashboard-panel mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/8">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="9" stroke="#ef4444" strokeWidth="1.5" />
            <path d="M11 7V12M11 15V15.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-semibold text-text-primary">
          Couldn&apos;t load dashboard
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        {isMissingTable && (
          <p className="mt-3 text-xs text-text-muted">
            Run the analyses migration in Supabase SQL Editor:{" "}
            <code className="rounded bg-surface-muted px-1 py-0.5">
              supabase/migrations/20250607000001_analyses.sql
            </code>
          </p>
        )}
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex text-sm">
          Try again
        </Link>
      </div>
    </div>
  );
}
