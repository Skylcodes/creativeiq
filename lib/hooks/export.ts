import type { HookLibraryEntry } from "@/lib/types/hook";
import { platformLabel, manualSourceLabel } from "@/lib/hooks/constants";

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function hooksToCsv(hooks: HookLibraryEntry[]): string {
  const headers = [
    "Hook",
    "Platform",
    "Angle Tags",
    "Custom Tags",
    "Source",
    "Source Score",
    "Favorited",
    "Test Queue",
    "Notes",
    "Date Added",
  ];

  const rows = hooks.map((h) => [
    escapeCsv(h.hook_text),
    escapeCsv(platformLabel(h.platform)),
    escapeCsv(h.angle_tags.join("; ")),
    escapeCsv(h.custom_tags.join("; ")),
    escapeCsv(
      h.source_type === "manual"
        ? manualSourceLabel(h.manual_source_category) || "Manual"
        : "Advara Generated"
    ),
    h.source_score != null ? String(h.source_score) : "",
    h.is_favorited ? "Yes" : "No",
    h.is_in_test_queue ? "Yes" : "No",
    escapeCsv(h.notes ?? ""),
    new Date(h.created_at).toISOString(),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadHooksCsv(hooks: HookLibraryEntry[], filename = "hook-library.csv") {
  const csv = hooksToCsv(hooks);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatHooksForClipboard(hooks: HookLibraryEntry[]): string {
  return hooks.map((h, i) => `${i + 1}. ${h.hook_text}`).join("\n\n");
}
