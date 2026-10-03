import { callClaudeJSON } from "@/lib/ai/client";
import type { AnalysisRemixKind, HookVariant } from "@/lib/types/report";

const SYSTEM = `You are a performance creative editor. Rewrite only the piece you are asked to change.

Rules:
- Keep the same product, offer, claims, and spoken facts. Do not add a new promise, price, or statistic.
- Sound like a real ad a creator would film, not marketing commentary.
- Rationales are one plain sentence for the person filming. No jargon.
- Do not explain your choices outside the JSON.
- Return JSON only.`;

function contextLines(headline: string, angle: string): string[] {
  return [
    headline ? `Ad: ${headline}` : "",
    angle ? `Angle: ${angle}` : "",
  ].filter(Boolean);
}

export async function remixReportCreative(input: {
  kind: AnalysisRemixKind;
  headline: string;
  angle: string;
  hooks: HookVariant[];
  script: string;
}): Promise<{ hooks: HookVariant[]; script: string }> {
  const hooks = [...input.hooks].sort((a, b) => a.rank - b.rank);
  const context = contextLines(input.headline, input.angle);

  if (input.kind === "hook_punchier" || input.kind === "hook_natural") {
    const current = hooks[0];
    if (!current?.hook) return { hooks, script: input.script };
    const raw = await callClaudeJSON<{ hook: string; rationale?: string }>({
      system: SYSTEM,
      prompt: [
        input.kind === "hook_punchier"
          ? "Make this hook punchier. Shorter, more specific, same idea."
          : "Make this hook more natural, like something a person would say on camera. Same idea.",
        ...context,
        `Hook: ${current.hook}`,
        'JSON: { "hook": string, "rationale": string }',
      ].join("\n"),
      maxTokens: 500,
      temperature: 0.6,
    });
    const hook = raw.hook?.trim();
    if (!hook) throw new Error("Remix returned an empty hook.");
    const next = [...hooks];
    next[0] = {
      ...current,
      hook,
      rationale: raw.rationale?.trim() || current.rationale,
    };
    return { hooks: next, script: input.script };
  }

  if (input.kind === "hook_alternatives") {
    const current = hooks[0];
    const raw = await callClaudeJSON<{
      hooks: { hook: string; rationale?: string }[];
    }>({
      system: SYSTEM,
      prompt: [
        "Write 3 alternate hooks for the SAME ad. Different openings, same product and claim. Do not repeat the current hook.",
        ...context,
        `Current hook: ${current?.hook ?? ""}`,
        input.script ? `Script for context:\n${input.script.slice(0, 1200)}` : "",
        'JSON: { "hooks": [ { "hook": string, "rationale": string } ] }',
      ]
        .filter(Boolean)
        .join("\n"),
      maxTokens: 900,
      temperature: 0.7,
    });
    const alts = (raw.hooks ?? [])
      .map((h) => ({
        hook: h.hook?.trim() ?? "",
        rationale: h.rationale?.trim() || "",
      }))
      .filter((h) => h.hook && h.hook !== current?.hook)
      .slice(0, 3);
    if (alts.length === 0) throw new Error("Remix returned no alternate hooks.");
    const next: HookVariant[] = [
      ...(current ? [current] : []),
      ...alts.map((h) => ({
        rank: 0,
        hook: h.hook,
        rationale: h.rationale,
        predictedPerformance: "experimental" as const,
      })),
    ].map((h, i) => ({ ...h, rank: i + 1 }));
    return { hooks: next, script: input.script };
  }

  const scriptInstruction =
    input.kind === "script_shorten"
      ? "Shorten the script. Cut filler. Keep the hook, the product moment, and the CTA."
      : input.kind === "script_conversational"
        ? "Make the script more conversational. Same beats and facts, less written-speech."
        : input.kind === "script_direct"
          ? "Make the script more direct. Get to the product and CTA sooner. Same offer."
          : "Rewrite only the closing ask so it is clearer and easier to say. Keep the earlier lines as they are.";

  const raw = await callClaudeJSON<{ script: string }>({
    system: SYSTEM,
    prompt: [
      scriptInstruction,
      ...context,
      hooks[0]?.hook ? `Current hook: ${hooks[0].hook}` : "",
      "",
      input.script,
      "",
      'JSON: { "script": string }',
    ]
      .filter(Boolean)
      .join("\n"),
    maxTokens: 1400,
    temperature: 0.5,
  });
  const script = raw.script?.trim();
  if (!script) throw new Error("Remix returned an empty script.");
  return { hooks, script };
}
