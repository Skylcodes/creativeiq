import "server-only";
import { callClaude, CLAUDE_JSON_MODEL, type ImageInput } from "@/lib/ai/client";

const IMAGE_CREATIVE_SYSTEM = `You are analyzing a static image advertisement. Your description will be used by direct-response copywriters and media buyers to evaluate the creative — they will NOT see the image themselves.

Describe in 180–220 words, covering:
1. WHO/WHAT is on screen (person, product, setting)
2. Any TEXT OVERLAYS or on-image copy (quote exactly if visible)
3. VISUAL STYLE: UGC, studio, lifestyle, testimonial, product demo, before/after, etc.
4. PRODUCT shown or implied
5. MOOD and ENERGY
6. HOOK / scroll-stop element in the first visual beat

Be concrete and analytical. No filler.`;

/**
 * One-time vision pass for image ads — downstream agents receive text only,
 * except DR Critic and conversion scorer which may still attach the image.
 */
export async function describeImageCreative(
  image: ImageInput,
  // Intentionally unused for grading: filenames must never influence any
  // score. Kept in the signature so existing callers don't need to change.
  _fileName?: string
): Promise<string> {
  return callClaude({
    system: IMAGE_CREATIVE_SYSTEM,
    prompt: "Describe this ad creative image for analysis.",
    image,
    maxTokens: 500,
    temperature: 0.3,
    model: CLAUDE_JSON_MODEL,
  });
}

export function buildImageCreativeBrief(
  visualDescription: string,
  // Intentionally unused for grading: filenames must never influence any
  // score. Kept in the signature so existing callers don't need to change.
  _fileName?: string
): string {
  return [
    "AD CREATIVE — STATIC IMAGE (not video)",
    "",
    "FORMAT: Single-frame static ad — grade thumb-stop, in-frame copy, and visual hierarchy. Do not apply video watch-time or motion criteria.",
    "",
    "VISUAL ANALYSIS (image analyzed once — use this as the creative source of truth):",
    visualDescription,
  ].join("\n");
}
