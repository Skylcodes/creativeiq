"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildAnalysesHistoryQueryString,
  CREATIVE_TYPE_FILTER_OPTIONS,
  PLATFORM_FILTER_OPTIONS,
  SORT_OPTIONS,
  type AnalysesHistoryParams,
} from "@/lib/analyses/history";

type AnalysesFiltersProps = {
  params: AnalysesHistoryParams;
  onPendingChange?: (pending: boolean) => void;
};

export function AnalysesFilters({
  params,
  onPendingChange,
}: AnalysesFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(params.search);

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  function navigate(next: Partial<AnalysesHistoryParams>) {
    const merged: AnalysesHistoryParams = {
      ...params,
      ...next,
      page: next.page ?? 1,
    };

    startTransition(() => {
      router.push(`/analyses${buildAnalysesHistoryQueryString(merged)}`);
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === params.search) return;
      navigate({ search: searchInput, page: 1 });
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search verdict, platform, or title…"
          className="input-field w-full py-2.5 pl-10 pr-4 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
        <FilterSelect
          className="col-span-2 lg:col-auto"
          label="Sort by"
          value={params.sort}
          options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          onChange={(value) =>
            navigate({ sort: value as AnalysesHistoryParams["sort"] })
          }
        />

        <FilterSelect
          label="Platform"
          value={params.platform}
          options={PLATFORM_FILTER_OPTIONS.map((o) => ({
            value: o.id,
            label: o.label,
          }))}
          onChange={(value) =>
            navigate({ platform: value as AnalysesHistoryParams["platform"] })
          }
        />

        <FilterSelect
          label="Type"
          value={params.creativeType}
          options={CREATIVE_TYPE_FILTER_OPTIONS.map((o) => ({
            value: o.id,
            label: o.label,
          }))}
          onChange={(value) =>
            navigate({
              creativeType: value as AnalysesHistoryParams["creativeType"],
            })
          }
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label
      className={`flex min-w-0 flex-col gap-1 text-sm sm:min-w-[160px] sm:flex-1 sm:flex-row sm:items-center sm:gap-2 lg:flex-none ${className}`}
    >
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-white/40 sm:text-sm sm:normal-case sm:tracking-normal">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field min-h-11 w-full px-3 py-2 text-sm font-medium sm:min-h-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
