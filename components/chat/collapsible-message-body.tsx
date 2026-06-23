"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

const COLLAPSED_MAX_PX = 200;
const LONG_CHAR_THRESHOLD = 380;

type CollapsibleMessageBodyProps = {
  children: ReactNode;
  contentLength: number;
  defaultExpanded?: boolean;
  disabled?: boolean;
  fadeClassName?: string;
};

export function CollapsibleMessageBody(props: CollapsibleMessageBodyProps) {
  const resetKey = `${props.contentLength}:${props.defaultExpanded ?? false}`;
  return <CollapsibleMessageBodyInner key={resetKey} {...props} />;
}

function CollapsibleMessageBodyInner({
  children,
  contentLength,
  defaultExpanded = false,
  disabled = false,
  fadeClassName = "from-white via-white/90",
}: CollapsibleMessageBodyProps) {
  const contentId = useId();
  const measureRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [overflows, setOverflows] = useState(false);

  const isLong = contentLength >= LONG_CHAR_THRESHOLD;
  const effectiveOverflows = disabled || !isLong ? false : overflows;
  const canCollapse = isLong && effectiveOverflows && !disabled;

  useEffect(() => {
    if (disabled || !isLong) return;

    const el = measureRef.current;
    if (!el) return;

    const check = () => {
      setOverflows(el.scrollHeight > COLLAPSED_MAX_PX + 8);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, disabled, isLong]);

  if (!canCollapse) {
    return <div ref={measureRef}>{children}</div>;
  }

  return (
    <div>
      <div
        id={contentId}
        ref={measureRef}
        className={
          expanded ? undefined : "relative max-h-[200px] overflow-hidden"
        }
      >
        {children}
        {!expanded && (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t ${fadeClassName} to-transparent`}
            aria-hidden
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-2 text-xs font-semibold text-[#4c3d8f] hover:text-accent"
        aria-expanded={expanded}
        aria-controls={contentId}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}
