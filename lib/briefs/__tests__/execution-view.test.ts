import { describe, expect, it } from "vitest";
import {
  scriptBeats,
  shotRows,
  shotTimeRanges,
  splitProductionNotes,
} from "@/lib/briefs/execution-view";
import type { BriefShot } from "@/lib/types/brief";

const shots: BriefShot[] = [
  { shotNumber: 1, onScreen: "Close-up talking head", durationSeconds: 3, direction: "Start immediately." },
  { shotNumber: 2, onScreen: "Explain the daily mess", durationSeconds: 4, direction: "Stay on the problem." },
  { shotNumber: 3, onScreen: "Hold the product in hand", durationSeconds: 5, direction: "Show the label." },
  { shotNumber: 4, onScreen: "Point to the result", durationSeconds: 4, direction: "React to the result." },
  { shotNumber: 5, onScreen: "Look at camera and ask for the tap", durationSeconds: 3, direction: "Say the CTA." },
];

describe("scriptBeats", () => {
  it("keeps every sentence and does not invent timestamps when counts differ", () => {
    const script = "I kept rebuying the wrong one. Then I found this. It actually stays put. Link is below.";
    const beats = scriptBeats(script, shots);
    const joined = beats.map((b) => b.text).join(" ");
    expect(joined).toContain("I kept rebuying the wrong one.");
    expect(joined).toContain("Link is below.");
    expect(beats[0]?.label).toBe("HOOK");
    expect(beats.at(-1)?.label).toBe("CTA");
  });

  it("pairs times when paragraphs match the shot count", () => {
    const script = ["Open.", "Problem.", "Product.", "Proof.", "Buy it."].join("\n\n");
    const beats = scriptBeats(script, shots);
    expect(beats).toHaveLength(5);
    expect(beats[0]?.timeLabel).toBe("0–3s");
    expect(beats[2]?.timeLabel).toBe("7–12s");
  });
});

describe("shot rows", () => {
  it("builds cumulative ranges and short names from the shot text", () => {
    expect(shotTimeRanges(shots)[2]).toBe("7–12s");
    const rows = shotRows(shots);
    expect(rows[0]?.name).toBe("Hook");
    expect(rows[2]?.name).toBe("Product");
    expect(rows[4]?.name).toBe("CTA");
    expect(rows[0]?.action).toBe("Close-up talking head");
  });
});

describe("splitProductionNotes", () => {
  it("keeps short instructions as checklist items and parks long copy", () => {
    const { items, extra } = splitProductionNotes(
      "Vertical 9:16. Natural window light. " +
        "The creator should walk through an extremely detailed lighting diagram that takes far too long to read on a phone and does not belong in the default checklist because it explains theory instead of the next action."
    );
    expect(items).toEqual(["Vertical 9:16.", "Natural window light."]);
    expect(extra.length).toBeGreaterThan(40);
  });
});
