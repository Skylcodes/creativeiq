"use client";

import { useRef } from "react";

type BulletListEditorProps = {
  label: string;
  description?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  disabled?: boolean;
};

export function BulletListEditor({
  label,
  description,
  items,
  onChange,
  placeholder = "Add a point…",
  maxItems = 8,
  disabled = false,
}: BulletListEditorProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function updateItem(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    onChange(next);
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length ? next : [""]);
  }

  function addItem() {
    if (items.length >= maxItems) return;
    onChange([...items, ""]);
    requestAnimationFrame(() => {
      inputRefs.current[items.length]?.focus();
    });
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (items[index]?.trim() && items.length < maxItems) {
        addItem();
      }
      return;
    }

    if (
      event.key === "Backspace" &&
      !items[index] &&
      items.length > 1
    ) {
      event.preventDefault();
      removeItem(index);
      requestAnimationFrame(() => {
        inputRefs.current[Math.max(0, index - 1)]?.focus();
      });
    }
  }

  const visibleItems = items.length ? items : [""];

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-primary">{label}</p>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              {description}
            </p>
          )}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={addItem}
            disabled={visibleItems.length >= maxItems}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/8 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add point
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleItems.map((item, index) => (
          <div key={index} className="group flex items-center gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" />
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-text-primary ring-1 ring-black/[0.06] transition-all placeholder:text-text-muted hover:ring-black/[0.1] focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
            />
            {!disabled && visibleItems.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-muted opacity-0 transition-all hover:bg-black/[0.04] hover:text-text-primary group-hover:opacity-100"
                aria-label="Remove point"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <p className="mt-2 text-[11px] text-text-muted">
          Press Enter to add another point. Backspace on an empty line to remove.
          {maxItems ? ` Max ${maxItems}.` : ""}
        </p>
      )}
    </div>
  );
}
