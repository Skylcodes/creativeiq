"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ANALYSES_PAGE_SIZE,
  buildAnalysesHistoryQueryString,
  type AnalysesHistoryParams,
} from "@/lib/analyses/history";

type AnalysesPaginationProps = {
  totalCount: number;
  params: AnalysesHistoryParams;
};

export function AnalysesPagination({
  totalCount,
  params,
}: AnalysesPaginationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(totalCount / ANALYSES_PAGE_SIZE));

  if (totalPages <= 1) return null;

  const from = (params.page - 1) * ANALYSES_PAGE_SIZE + 1;
  const to = Math.min(params.page * ANALYSES_PAGE_SIZE, totalCount);

  function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === params.page) return;

    startTransition(() => {
      router.push(
        `/analyses${buildAnalysesHistoryQueryString({ ...params, page })}`
      );
    });
  }

  const pages = buildPageNumbers(params.page, totalPages);

  return (
    <div
      className={`flex flex-col items-center justify-between gap-4 border-t border-black/[0.04] pt-6 sm:flex-row ${isPending ? "opacity-70" : ""}`}
    >
      <p className="text-sm text-text-muted">
        Showing {from}–{to} of {totalCount} analyses
      </p>

      <div className="flex items-center gap-1">
        <PaginationButton
          label="Previous page"
          disabled={params.page <= 1 || isPending}
          onClick={() => goToPage(params.page - 1)}
        >
          ←
        </PaginationButton>

        {pages.map((page, i) =>
          page === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-text-muted">
              …
            </span>
          ) : (
            <PaginationButton
              key={page}
              active={page === params.page}
              disabled={isPending}
              onClick={() => goToPage(page)}
            >
              {page}
            </PaginationButton>
          )
        )}

        <PaginationButton
          label="Next page"
          disabled={params.page >= totalPages || isPending}
          onClick={() => goToPage(params.page + 1)}
        >
          →
        </PaginationButton>
      </div>
    </div>
  );
}

function PaginationButton({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-sm font-medium transition-all ${
        active
          ? "bg-accent text-white shadow-[0_4px_12px_rgba(110,58,255,0.25)]"
          : "text-text-secondary hover:bg-black/[0.04] hover:text-text-primary"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function buildPageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | "…"> = [1];

  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (current < total - 2) pages.push("…");
  pages.push(total);

  return pages;
}
