import type { HookLibraryEntry } from "@/lib/types/hook";

export function hookTextKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildHookLookup(
  hooks: HookLibraryEntry[]
): Map<string, HookLibraryEntry> {
  const map = new Map<string, HookLibraryEntry>();
  for (const h of hooks) {
    map.set(hookTextKey(h.hook_text), h);
  }
  return map;
}
