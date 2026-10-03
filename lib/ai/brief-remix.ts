import { callClaudeJSON } from "@/lib/ai/client";
import type {
  BriefHookOption,
  BriefRemixKind,
  BriefShot,
  CreativeBriefDocument,
} from "@/lib/types/brief";

const SYSTEM = `You are a performance creative editor. Rewrite only the piece you are asked to change.

Rules:
- Keep the same product, offer, claims, and spoken facts. Do not add a new promise, price, or statistic.
- Sound like a real ad a creator would film, not marketing commentary.
- Do not explain your choices.
- Return JSON only.`;

export async function remixBriefDocument(
  doc: CreativeBriefDocument,
  kind: BriefRemixKind
): Promise<CreativeBriefDocument> {
  if (kind === "hook_punchier" || kind === "hook_natural") {
    const current = doc.hookOptions[0];
    if (!current?.hook) return doc;
    const raw = await callClaudeJSON<{
      hook: string;
      openingVisual?: string;
      rationale?: string;
    }>({
      system: SYSTEM,
      prompt: [
        kind === "hook_punchier"
          ? "Make this hook punchier. Shorter, more specific, same idea."
          : "Make this hook more natural, like something a person would say on camera. Same idea.",
        `Hook: ${current.hook}`,
        current.openingVisual ? `Opening visual: ${current.openingVisual}` : "",
        `Angle: ${doc.angle.name}`,
        'JSON: { "hook": string, "openingVisual": string, "rationale": string }',
      ]
        .filter(Boolean)
        .join("\n"),
      maxTokens: 600,
      temperature: 0.6,
    });
    const hook = raw.hook?.trim();
    if (!hook) throw new Error("Remix returned an empty hook.");
    const next = [...doc.hookOptions];
    next[0] = {
      ...current,
      hook,
      openingVisual: raw.openingVisual?.trim() || current.openingVisual,
      rationale: raw.rationale?.trim() || current.rationale,
    };
    return { ...doc, hookOptions: next };
  }

  if (kind === "hook_alternatives") {
    const current = doc.hookOptions[0];
    const raw = await callClaudeJSON<{
      hooks: { hook: string; openingVisual?: string; rationale?: string }[];
    }>({
      system: SYSTEM,
      prompt: [
        "Write 3 alternate hooks for the SAME ad. Different openings, same product and angle. Do not repeat the current hook.",
        `Current hook: ${current?.hook ?? ""}`,
        `Angle: ${doc.angle.name} — ${doc.angle.explanation}`,
        'JSON: { "hooks": [ { "hook": string, "openingVisual": string, "rationale": string } ] }',
      ].join("\n"),
      maxTokens: 900,
      temperature: 0.7,
    });
    const alts = (raw.hooks ?? [])
      .map((h) => ({
        hook: h.hook?.trim() ?? "",
        openingVisual: h.openingVisual?.trim() || undefined,
        rationale: h.rationale?.trim() || "",
      }))
      .filter((h) => h.hook && h.hook !== current?.hook)
      .slice(0, 3);
    if (alts.length === 0) throw new Error("Remix returned no alternate hooks.");
    const hooks: BriefHookOption[] = [
      ...(current ? [current] : []),
      ...alts.map((h) => ({
        rank: 0,
        hook: h.hook,
        openingVisual: h.openingVisual,
        rationale: h.rationale,
      })),
    ].map((h, i) => ({ ...h, rank: i + 1 }));
    return { ...doc, hookOptions: hooks };
  }

  if (
    kind === "script_shorten" ||
    kind === "script_conversational" ||
    kind === "script_direct"
  ) {
    const instruction =
      kind === "script_shorten"
        ? "Shorten the script. Cut filler. Keep the hook, product moment, and CTA."
        : kind === "script_conversational"
          ? "Make the script more conversational. Same beats and facts, less written-speech."
          : "Make the script more direct. Get to the product and CTA sooner. Same offer.";
    const raw = await callClaudeJSON<{ script: string }>({
      system: SYSTEM,
      prompt: [
        instruction,
        "Keep [on camera] / [cut] style markers if they are already there.",
        "",
        doc.script,
        "",
        'JSON: { "script": string }',
      ].join("\n"),
      maxTokens: 1400,
      temperature: 0.5,
    });
    const script = raw.script?.trim();
    if (!script) throw new Error("Remix returned an empty script.");
    return { ...doc, script };
  }

  const instruction =
    kind === "shots_simplify"
      ? "Simplify the shot list. Fewer setups if possible. Keep the hook open and the product visible. Same story."
      : kind === "shots_broll"
        ? "Add only the B-roll shots that this script actually needs. Keep the existing spoken beats."
        : "Make the shot list easier to film on a phone. Fewer locations, simpler camera moves, same story.";

  const raw = await callClaudeJSON<{ shotList: BriefShot[] }>({
    system: SYSTEM,
    prompt: [
      instruction,
      "Each shot needs shotNumber, onScreen, direction, and durationSeconds when the original had durations.",
      "",
      JSON.stringify(doc.shotList),
      "",
      'JSON: { "shotList": [ { "shotNumber": number, "onScreen": string, "textOverlay": string, "durationSeconds": number, "direction": string } ] }',
    ].join("\n"),
    maxTokens: 1600,
    temperature: 0.5,
  });

  const shotList = (raw.shotList ?? [])
    .filter((s) => s.onScreen?.trim() && s.direction?.trim())
    .map((s, i) => ({
      shotNumber: i + 1,
      onScreen: s.onScreen.trim(),
      textOverlay: s.textOverlay?.trim() || undefined,
      durationSeconds:
        typeof s.durationSeconds === "number" && s.durationSeconds > 0
          ? s.durationSeconds
          : undefined,
      direction: s.direction.trim(),
    }));
  if (shotList.length === 0) throw new Error("Remix returned an empty shot list.");
  return { ...doc, shotList };
}
