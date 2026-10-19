import "server-only";

/**
 * Single source of truth for Advara's ad-evaluation philosophy.
 *
 * SHARED (every feature that judges or reasons about ad quality must import from here):
 * - CORE_ACCURACY_RULES — what counts as a real weakness vs optional polish
 * - SCORE_BAND_CALIBRATION — numeric meaning of 90/80/70/below-70 (scoring paths only)
 * - CREATIVE_JUDGMENT_FOR_GENERATION — same philosophy adapted for generative features
 *
 * FEATURE-SPECIFIC (stay in their own prompt modules):
 * - Analysis: viewer/expert roles, landing-page category weights, retention contract
 * - Compare: ranking/tie-break narrative over already-scored variants
 * - Briefs: angle generation, shot lists, creator-facing voice
 * - Deconstructor: competitor framework extraction + brand translation
 */

// ---------------------------------------------------------------------------
// Core accuracy — shared verbatim by Analysis evaluators/scoring, Compare
// synthesis, and Deconstructor. Do not fork this text into other files.
// ---------------------------------------------------------------------------

export const CORE_ACCURACY_RULES = `CORE ACCURACY RULES (non-negotiable):

1. NO HALLUCINATIONS. Never invent visual elements, dialogue, claims, offers, product features, audience reactions, competitor behavior, landing-page content, performance data, market trends, or viewer behavior. If you don't have evidence for it, don't claim it happened.

2. NO MANUFACTURED CRITICISM. A finding is valid only if: (a) it is supported by something actually present in the ad/page, (b) it is relevant to the category being evaluated, (c) it has a plausible mechanism through which it could hurt performance, (d) its severity justifies any deduction. "Could theoretically be improved" is NOT enough to count as a finding. Zero findings is a valid, complete result — never invent a weakness because you feel obligated to name one. Your job is to accurately size how well this ad would actually perform — not to maximize the number of criticisms you can produce. A genuinely strong ad deserves a genuinely high score (90-100) with few or zero findings; do not manufacture balance by inventing a flaw just so the report looks thorough or the score looks "reasonable." You are not being graded on how much you can find wrong — you are being graded on how accurately you predict real-world performance. Looking for reasons to deduct points is a failure mode, not thoroughness.

3. NO SUBJECTIVE STYLE BIAS. Raw UGC, cinematic, minimalist, comedic, direct-response, product-focused, story-driven — all can be effective. Judge execution and mechanism, not personal taste or preferred style.

4. FUNNEL ALIGNMENT RULE. A landing-page mismatch exists ONLY when the ad creates a specific, concrete expectation the page contradicts or fails to fulfill (a specific discount, feature, guarantee, or offer that is advertised but absent). Different wording, emotional tone, hook, or angle — or curiosity intentionally resolved after the click — is NEVER a mismatch.

5. PRICE RULE (ABSOLUTE — zero exceptions unless stated below). Whether this ad shows price is NEVER a finding, NEVER a deduction, and NEVER mentioned in feedback. The ONLY exception: the ad explicitly promised a specific price ("only $X", "starting at $X", a named discount amount) and then failed to show or confirm that exact price. Generic purchase CTAs without price are NOT exceptions — "link in bio", "shop now", "check it out", and silence on price are all normal and must never appear as weaknesses.

6. COMMON HOOK RULE. A common/familiar hook format is not inherently weak — judge THIS execution, not the format's novelty. A UGC-style opening (phone camera, direct address, casual setting) is a legitimate, high-performing format on its own terms, not a lesser version of a "unique" hook — if the words/claim in that familiar visual format actually earn attention, score the hook on that basis, not on how many other creators use a similar visual style.

7. FEATURE SPECIFICITY RULE (ABSOLUTE). This ad is ONE ad with ONE angle and ONE job — not the brand's entire product catalog. An ad focused on one benefit, emotion, or outcome is correctly scoped, not incomplete. NEVER dock points because the ad "doesn't explain" other features, doesn't demonstrate all capabilities, or doesn't mention the full value stack. The ad's job is to make the viewer want to click — answering every post-click question is the landing page's job.

8. VOICE / AUDIO PRODUCTION RULE (ABSOLUTE for UGC and creator-format ads). Natural voice, slight background noise, and casual delivery are features of UGC format, not flaws. NEVER dock points for audio quality, lack of professional voiceover, or non-broadcast sound in UGC/creator ads unless audio is genuinely unintelligible (viewer cannot understand the words).

9. SPECIFICITY RULE. Every finding, action, and recommendation must quote or reference the actual ad/page. Generic feedback that could apply to any brand's ad is invalid — rewrite it or drop it.

10. SEVERITY MATTERS. Distinguish minor optimization from meaningful performance problem from fundamental failure. A major failure must carry materially more weight than a cosmetic nit.

11. GEMINI AUTHORITY RULE. When a VISUAL INTELLIGENCE section (from watching the actual video, or the full-image analysis) is present, it is the authoritative source for observable facts — motion, cuts, pacing, on-screen text, timing, product visibility. You may disagree about whether those facts are effective, but you may never contradict what was observed.

12. FUNNEL-WIDE INFORMATION RULE. Before treating "the ad/page didn't explicitly say X" as a weakness, check whether X is already reasonably communicated through the COMBINATION of ad visuals, on-screen text, demonstrations, spoken claims, AND the landing page — not the ad script in isolation. There is a real difference between an actual information gap (a viewer genuinely would not understand what is being sold) and redundant explicitness (the viewer can already reasonably infer it, but one specific word or phrase was never literally spoken). The first can be a meaningful weakness. The second is a negligible nit at most — never score it as a material clarity, message-match, or above-fold problem.

13. MARKETING-ONLY RECOMMENDATIONS RULE. Every "improvement", priority action, and strategic fix must be a marketing change: positioning, messaging, copy, CTA, information sequencing, persuasion, use of assets that already exist. Never recommend building a new feature, demo, capability, or product change that doesn't currently exist ("add a voice demo," "build an interactive calculator," "create a new onboarding flow") — this tool grades marketing and conversion, not product roadmap. If a real problem's only fix would require a product change, name the marketing-level workaround instead (e.g., reference or surface an existing asset more clearly) — do not prescribe product development.

14. BEST-PRACTICE-IS-NOT-LAW RULE. "Mention price," "show the product," "add a demo," "add social proof," "explain the exact mechanism," "repeat the brand name," "put the CTA at the end" — these are heuristics that work in some funnels, not universal requirements. Before treating an absence as a weakness, ask why that practice normally helps and whether that reasoning actually applies to THIS specific funnel. If skipping it creates no real confusion or friction here, it is not a deduction — do not deduct points just because a common checklist item is missing.

15. INTENTIONAL SEQUENCING RULE. Withholding a detail in the ad on purpose — to create curiosity, earn the click, or let the landing page complete the story — is a valid, deliberate strategy, not a flaw. Judge information sequencing by: "does this gap cause real confusion or a misleading expectation the funnel never resolves?" — not "did the ad tell the viewer everything?" Ecommerce ads don't need to state price; SaaS ads don't need to explain every mechanism; this is normal, not evidence of weak marketing.

16. IMPACT-TEST / SEVERITY RULE. For every candidate weakness, before it affects any score, ask: "If this were fixed tomorrow, would that realistically produce a meaningful improvement in conversion or performance?" Classify honestly: CRITICAL (genuine blocker — viewer can't understand the offer, fundamental trust break, serious CTA friction, misleading promise), MAJOR (meaningfully reduces performance but doesn't break the funnel), MODERATE (a real weakness that plausibly costs some conversions), MINOR (legitimate optimization, limited expected impact), NEGLIGIBLE (technically improvable, unlikely to matter in the real world). Only Critical/Major/Moderate findings should materially move a numeric score. Negligible and most Minor findings must not move the score — they are commentary, not scoring evidence, and should not appear in topFindings/priorityActions at all (those are reserved for issues that clear at least Moderate). Before finalizing severity, also run the CONVERSION IMPACT GATE (rule 21).

17. NO DOUBLE-PENALTY RULE. If one underlying problem (e.g., unclear positioning) already lowers one category's score, do not deduct again for that SAME root cause in a different category unless it produces a genuinely separate, distinct consequence there. Multiple symptoms of one problem are not multiple problems — identify the root cause once and score its real, non-duplicated impact.

18. RELATIVE-WEIGHT RULE. Never evaluate a weakness in isolation. Weigh it against everything the ad/page does well, and against how many real viewers would actually notice or care, before it affects a score. A single small issue in an otherwise strong ad should barely move the score at all — the mere presence of *a* finding is never itself a reason for a default deduction; the finding's real-world weight is.

19. CREATIVE-FORMAT AWARENESS RULE. Before judging hook, pacing, or product presentation, identify what TYPE of creative this is from VISUAL INTELLIGENCE — UGC testimonial/review, product demo, founder story, talking-head direct-to-camera, cinematic/produced, problem-solution skit, meme/trend format, etc. Apply expectations appropriate to THAT format, not a generic checklist applied to every ad equally. A UGC testimonial's job is a credible person delivering a relatable claim — it does not need a product demo to succeed, and a familiar UGC visual opening (phone camera, casual setting, direct address) is the CORRECT, expected execution of that format, not a weak or lazy hook, provided the words/claim actually earn attention. A product-demo ad's job is showing the product working clearly. A founder-story ad's job is credibility and authenticity, not production polish. Never deduct for an ad correctly executing the normal conventions of its own format — only deduct for a genuine execution failure within that format (e.g., a UGC testimonial with an unconvincing or non-specific claim, a demo ad whose demo is confusing).

20. BEST-REALISTIC-VERSION COMPARISON RULE. Score against the best realistic version of THIS SAME creative and strategy — never against an imaginary ad that applies every best practice at once. The governing question is: "Why would this ad convert worse than the best realistic version of itself?" Find the specific, evidenced answers — those are your findings, and their combined real-world weight is your deduction. If the ad is already close to the best realistic form of its own concept, the score should be high with few or zero findings, even if a completely different creative concept might also work. Do not deduct for the ad not being a different ad.

21. CONVERSION IMPACT GATE (mandatory self-check before outputting JSON). For EACH candidate finding in topFindings or priorityActions and for EACH point deduction, you must complete this sentence with a specific, honest answer: "A viewer who would have converted without this issue will not convert because of this issue because [specific mechanism]." If you cannot complete it — if the best you can say is "it could be stronger," "best practices suggest," or "it would be better if" — remove the finding and do not deduct. PASSES the gate: "The hook takes 4 seconds before establishing what the product does — cold TikTok traffic has already scrolled." / "The CTA says 'check it out' but the landing page goes straight to a purchase form — viewers expecting a low-friction browse will bounce at the price reveal." FAILS the gate (must be removed): "The ad doesn't show the price." / "The ad doesn't demonstrate product features in detail." / "The hook uses a format many creators use." / "The audio could be more professional." / "The ad doesn't explain all product capabilities."

22. GOOD AD PROTECTION RULE. If scrollStopScore + watchThroughScore is tracking toward 80+ (creative strength GOOD or better), the output must reflect that a good ad was found. Findings at this level read as "how to make this already-good ad even better" — not "what is wrong with this ad." Maximum 2 findings in topFindings for 80+ ads. Tone, finding count, and script rewrite scope must all reflect that this ad is good. A good ad getting a good score with minimal findings is correct output, not lazy output.

23. DEDUCTION-SIZE CALIBRATION. The SIZE of a deduction must match its severity tier (rule 16), not just whether a deduction applies at all. On a 0-50 component (scrollStopScore, watchThroughScore): NEGLIGIBLE/MINOR issues combined should cost roughly 0-3 points, MODERATE issues roughly 4-10 points, MAJOR issues roughly 10-20 points, and only a CRITICAL, fundamental failure justifies 20+ points off. On a 0-100 component (retentionScore), scale those ranges ×2. On a landing-page category (max 8-20), a MINOR issue should rarely cost more than ~10-15% of that category's max. A "common/familiar hook format" or "no product demo," evaluated alone, are frequently NEGLIGIBLE or MINOR under rule 19 — they only escalate to MODERATE or above when there is specific evidence THIS viewer would actually be confused, unconvinced, or bored by it, not because the category exists as a checklist item. For UGC hooks specifically: never dock more than 3-4 points total on scrollStopScore for "common UGC visual format" alone — visual framing only significantly hurts when it actively looks fake, clearly scripted, or breaks the authenticity contract ("ad smell").`;

/** Canonical 0–100 bands used by Analysis scoring and any feature that references scores. */
export const SCORE_BAND_CALIBRATION = `SCORE BAND CALIBRATION — hard calibration targets, not suggestions:

90-100 VERY GOOD: strong across essentially all important dimensions. Would realistically perform strongly with real budget. Minor optimizations may exist, but nothing meaningfully undermines the ad.

80-89 GOOD: solid fundamentals, likely capable of performing with real budget. Has identifiable improvement opportunities, but no major fundamental problem prevents launch.

70-79 MEDIOCRE: functional but meaningfully flawed. May work with motivated/warm/highly relevant traffic but loses meaningful performance with colder audiences. At least one meaningful weakness materially limits performance.

BELOW 70 BAD: fundamental problems exist that would make spending significant budget risky or inefficient. Not ready to launch in its current form.

Do not cluster every ad into the 70s-80s. Many professionally produced DTC ads in-market land around 75-85 as a rough calibration reference — but this is not a forced distribution. A genuinely poor ad can and should score below 70. A genuinely exceptional ad can and should score 90+. Score where the evidence honestly points — not where it's comfortable, not where it sounds sophisticated, not where it sounds encouraging.

When interpreting an already-assigned score from the Analysis pipeline, use THESE bands — not a separate legend. Do not invent alternate labels (e.g. "EXCEPTIONAL" vs "VERY GOOD") that conflict with this scale.`;

/**
 * Same philosophy for generative features (Briefs) that do not assign numeric
 * scores — prevents "checklist theater" from sneaking into recommended creatives.
 */
export const CREATIVE_JUDGMENT_FOR_GENERATION = `CREATIVE JUDGMENT PRINCIPLES (shared with Advara Analysis — apply when deciding what to write or recommend):

These are the same standards used when we SCORE ads. Generation must not quietly reverse them.

1. ABSENCE ≠ WEAKNESS. Do not "fix" missing price, social proof, product demos, feature lists, or hard CTAs in the brief unless THIS goal and format actually need them for conversion. Omitting them is often correct.
2. ONE AD = ONE JOB. Do not stack every benefit, feature, and objection into one script. The landing page completes the story.
3. FORMAT AWARENESS. UGC authenticity (phone camera, casual voice, familiar opening) is a strength to preserve — not something to "upgrade" into studio polish unless the user asked for that production level.
4. INTENTIONAL SEQUENCING. Curiosity gaps and delayed product reveals are valid strategies. Do not force the ad to explain everything up front.
5. BEST-PRACTICE-IS-NOT-LAW. Only encode a must-do in hooks, whatToAvoid, or production notes when skipping it would create real confusion, friction, or a broken promise for THIS funnel.
6. CONVERSION IMPACT TEST. Before listing something as a weakness to avoid or a required fix, ask: would fixing it realistically improve conversion for this goal/audience? If not, leave it out.
7. PRESERVE STRENGTHS. When adapting a strong pattern (competitor framework, winning angle), keep what makes it work — do not dilute it with generic best-practice additions.`;
