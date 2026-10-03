import type { ReactNode } from "react";

/** Flat report surface. No noise, blur, or glow over the text. */
export function PlainPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.1] bg-[#161222] text-white ${className}`}
    >
      {children}
    </div>
  );
}
