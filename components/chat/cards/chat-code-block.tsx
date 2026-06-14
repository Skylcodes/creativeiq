"use client";

import { CopyButton } from "@/components/report/shared/copy-button";

type ChatCodeBlockProps = {
  content: string;
  label?: string;
};

export function ChatCodeBlock({ content, label = "Creative output" }: ChatCodeBlockProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-black/[0.06] bg-[#faf9ff]">
      <div className="flex items-center justify-between border-b border-black/[0.04] bg-white/60 px-3.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          {label}
        </span>
        <CopyButton text={content} label="Copy" />
      </div>
      <pre className="whitespace-pre-wrap px-4 py-3.5 font-mono text-[13px] leading-[1.65] text-text-primary">
        {content}
      </pre>
    </div>
  );
}
