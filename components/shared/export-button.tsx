"use client";

import { useState } from "react";
import { useToast } from "@/components/shared/toast";

type ExportButtonProps = {
  onExport: () => Promise<void>;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export function ExportButton({
  onExport,
  label = "Export PDF",
  className = "btn-ghost text-xs",
  disabled = false,
}: ExportButtonProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onExport();
      showToast("PDF downloaded.");
    } catch {
      showToast("Could not generate PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${className} ${disabled || loading ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {loading ? "Exporting…" : label}
    </button>
  );
}
