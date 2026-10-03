import type { BriefShot } from "@/lib/types/brief";

export type ScriptBeat = {
  label: string;
  timeLabel: string | null;
  text: string;
};

export type ShotRow = {
  shotNumber: number;
  name: string;
  timeLabel: string | null;
  action: string;
  detail: string | null;
  overlay: string | null;
};

const MID_LABELS = ["PROBLEM", "DISCOVERY", "PAYOFF"];

function positionalLabel(index: number, count: number): string {
  if (count <= 1) return "SCRIPT";
  if (index === 0) return "HOOK";
  if (index === count - 1) return "CTA";
  return MID_LABELS[Math.min(index - 1, MID_LABELS.length - 1)] ?? "BEAT";
}

function sentencesOf(script: string): string[] {
  const matches = script.match(/[^.!?\n]+(?:[.!?]+|$)/g);
  return (matches ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Group existing script copy into beats. Does not rewrite or drop words beyond trimming. */
export function scriptBeats(
  script: string,
  shots: BriefShot[] = []
): ScriptBeat[] {
  const trimmed = script.trim();
  if (!trimmed) return [];

  const blocks = trimmed
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const ranges = shotTimeRanges(shots);
  const usableShots = ranges.filter(Boolean).length === shots.length && shots.length > 0;

  let parts = blocks.length >= 2 ? blocks : sentencesOf(trimmed);
  if (parts.length === 0) parts = [trimmed];

  if (parts.length === 1) {
    return [
      {
        label: "SCRIPT",
        timeLabel: usableShots ? fullRange(ranges) : null,
        text: parts[0],
      },
    ];
  }

  const target =
    shots.length >= 2 && shots.length <= 6 ? shots.length : Math.min(5, parts.length);
  const groups = chunkEvenly(parts, Math.min(target, parts.length));

  return groups.map((group, index) => ({
    label: positionalLabel(index, groups.length),
    timeLabel:
      usableShots && groups.length === shots.length ? ranges[index] : null,
    text: group.join(blocks.length >= 2 ? "\n\n" : " "),
  }));
}

function chunkEvenly(items: string[], groups: number): string[][] {
  const size = Math.ceil(items.length / groups);
  const out: string[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function shotTimeRanges(shots: BriefShot[]): string[] {
  if (shots.length === 0) return [];
  if (shots.some((s) => s.durationSeconds == null || s.durationSeconds <= 0)) {
    return shots.map(() => "");
  }
  let cursor = 0;
  return shots.map((s) => {
    const start = cursor;
    cursor += s.durationSeconds ?? 0;
    return `${start}–${cursor}s`;
  });
}

function fullRange(ranges: string[]): string | null {
  if (ranges.length === 0 || ranges.some((r) => !r)) return null;
  const start = ranges[0]?.split("–")[0] ?? "0";
  const end = ranges[ranges.length - 1]?.split("–")[1] ?? "";
  return end ? `${start}–${end}` : null;
}

function shotName(shot: BriefShot, index: number, total: number): string {
  if (index === 0) return "Hook";
  if (total > 1 && index === total - 1) return "CTA";
  const text = `${shot.onScreen} ${shot.direction}`.toLowerCase();
  if (/product|unbox|demo|hold|package|in hand/.test(text)) return "Product";
  if (/problem|pain|frustrat|struggle|wrong|annoyed/.test(text)) return "Problem";
  if (/proof|result|review|reaction|before|after|testimonial/.test(text)) {
    return "Reaction / Proof";
  }
  const words = shot.onScreen.trim().split(/\s+/).slice(0, 4).join(" ");
  return words || `Shot ${shot.shotNumber}`;
}

export function shotRows(shots: BriefShot[]): ShotRow[] {
  const ranges = shotTimeRanges(shots);
  return shots.map((shot, index) => {
    const detail = shot.direction?.trim() || null;
    const action = shot.onScreen.trim();
    const same =
      detail &&
      action &&
      detail.toLowerCase() === action.toLowerCase();
    return {
      shotNumber: shot.shotNumber,
      name: shotName(shot, index, shots.length),
      timeLabel: ranges[index] || null,
      action: action || detail || "Film this beat.",
      detail: same ? null : detail,
      overlay: shot.textOverlay?.trim() || null,
    };
  });
}

export function splitLead(text: string, max = 160): { lead: string; rest: string } {
  const trimmed = text.trim();
  if (!trimmed) return { lead: "", rest: "" };
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  const sentence = (match?.[0] ?? trimmed).trim();
  if (sentence.length <= max) {
    return { lead: sentence, rest: trimmed.slice(sentence.length).trim() };
  }
  return { lead: `${sentence.slice(0, max - 1).trimEnd()}…`, rest: trimmed };
}

export function splitProductionNotes(notes: string): {
  items: string[];
  extra: string;
} {
  const trimmed = notes.trim();
  if (!trimmed) return { items: [], extra: "" };

  const bits = trimmed
    .split(/\n+|(?<=[.!])\s+/)
    .map((s) => s.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);

  const short = bits.filter((s) => s.length <= 110);
  const long = bits.filter((s) => s.length > 110);
  return {
    items: short.slice(0, 5),
    extra: [...short.slice(5), ...long].join(" "),
  };
}
