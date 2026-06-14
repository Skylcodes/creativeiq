"use client";

import { COMPARISON_TEST_DIMENSIONS } from "@/lib/analyses/constants";
import type { ComparisonTestDimension } from "@/lib/types/comparison";

type StepTestDimensionProps = {
  selected: ComparisonTestDimension[];
  onToggle: (id: ComparisonTestDimension) => void;
};

export function StepTestDimension({ selected, onToggle }: StepTestDimensionProps) {
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[1.75rem]">
        What are you testing?
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
        Select every element that differs across your variants. Our agents will
        focus their comparison on these dimensions.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {COMPARISON_TEST_DIMENSIONS.map((dim) => {
          const isSelected = selected.includes(dim.id);
          return (
            <button
              key={dim.id}
              type="button"
              onClick={() => onToggle(dim.id)}
              className={`group relative rounded-2xl p-5 text-left transition-all duration-200 ${
                isSelected
                  ? "bg-white shadow-[0_8px_28px_rgba(110,58,255,0.12)] ring-2 ring-accent/30"
                  : "bg-white/70 ring-1 ring-black/[0.06] hover:bg-white hover:ring-accent/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-primary">{dim.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {dim.description}
                  </p>
                </div>
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isSelected
                      ? "border-accent bg-accent text-white"
                      : "border-black/[0.12] bg-white"
                  }`}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
