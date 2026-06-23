PRODUCT REQUIREMENTS DOCUMENT
Advara
AI-Powered Ad Creative & Funnel Intelligence for E-commerce/DTC Brands
Version
1.1 — As Built
Date
June 2026


Target Market
E-Commerce / DTC Brands
Status
Built — MVP in active development


1. Executive Summary
Advara is a multi-agent AI SaaS platform built specifically for E-Commerce and Direct-to-Consumer (DTC) brands. It analyzes ad creatives and landing pages together — as a unified conversion funnel — rather than in isolation, producing actionable intelligence that reduces wasted ad spend and increases conversion rates.
The core insight driving this product: most DTC brands run ad creative analysis and landing page optimization as entirely separate processes. This creates a fundamental blind spot — an ad that performs well in isolation can still fail if it attracts the wrong buyer intent relative to the landing page experience. Advara closes this loop.

Core Value Proposition
Input: Brand URL + ad creative (image, video, or script) + creative goal + platform context
Output: Full funnel intelligence report — ad analysis, landing page score, ICP simulation, angle recommendations, hook variants, script rewrite, criteria checklist, and a prioritized action plan
Differentiator: Goal-aware funnel grading, performance criteria checklists, market intelligence enrichment (Tavily + Meta Ad Library), and a full creative workflow beyond analysis — briefs, hook library, variant comparison, competitor deconstruction, and an always-on Creative Director chat

2. Problem Statement
2.1 The Core Problem
DTC brands operating paid social (Meta, TikTok) face three interconnected problems that current tools fail to solve simultaneously:
Funnel fragmentation: Ad creative feedback tools (Foreplay, MagicBrief, AdCreative.ai) evaluate ads in a vacuum without knowing what landing page the traffic lands on. CRO tools (Hotjar, VWO) evaluate landing pages without knowing what the ad promised.
No adversarial testing pre-launch: Brands have no way to stress-test creative from the perspective of a skeptical buyer before spending media budget to find out.
ICP-to-funnel disconnect: Brands assume they know who their buyer is, but rarely simulate how different buyer types actually experience the journey from ad to purchase.

3. Product Goals
Deliver actionable funnel intelligence in under 3 minutes per analysis
Produce ad creative recommendations specific enough to hand directly to a creative team
Score landing pages with enough granularity that brands can prioritize CRO actions immediately
Simulate ICP buyer journeys with sufficient realism that brands surface conversion blockers before spending on media
Support the full creative workflow — from pre-launch briefs and hook libraries to variant testing and performance tracking over time

4. Primary Personas
Persona A — The Performance Marketer
Role: Media buyer or performance marketing manager at a DTC brand (7–8 figure revenue)
Pain: Spends thousands weekly on ad spend with unreliable creative feedback loops
Goal: Reduce creative iteration cycles, improve ROAS, test more angles faster
Behavior: Already using Meta Ads Manager, TikTok Ads, Klaviyo — comfortable with tools

Persona B — The DTC Founder / CMO
Role: Founder or CMO of a DTC brand doing $1M–$20M annually
Pain: No in-house creative strategist — relies on agencies or freelancers with slow feedback loops
Goal: Get the strategic clarity of a senior creative strategist without the cost ($5K–$15K/month retainer)
Behavior: Involved in creative decisions, time-poor, wants synthesis not raw data

Persona C — The Creative Strategist / Agency
Role: Freelance creative strategist or boutique performance agency managing 5–15 DTC clients
Pain: Analysis work is time-intensive and difficult to productize for clients
Goal: Use Advara as a backend engine to produce client-ready reports faster
Behavior: Power user — will use the platform at high volume, values export quality

4.1 ICP Definition (Primary Target)
E-Commerce / DTC brand doing $500K–$10M annually in revenue, running paid social ads on Meta and/or TikTok, or organic social media ads with an internal or outsourced media buyer. Has an active landing page or product page. Spends $5K–$100K/month on paid ads.

5. Feature Specifications
5.1 Product Modules (As Built)

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/dashboard` | Workspace home — recent analyses, performance snapshot, test queue widget |
| Funnel Analysis | `/analyses` | Core ad + landing page funnel intelligence report |
| Variant Comparison | `/analyses/compare` | Head-to-head comparison of 2–4 creative variants |
| Ad Deconstructor | `/deconstructor` | Reverse-engineer competitor/reference ads with evidence verification |
| Creative Briefs | `/brief` | Pre-launch production-ready briefs (script, shot list, hooks) |
| Hook Library | `/hooks` | Saved hooks from analyses/briefs with favorites, tags, and test queue |
| Creative Director | `/chat` | Open-ended AI strategist chat with workspace or analysis context |
| Performance | `/performance` | Score trends and creative evolution across completed analyses |
| Brand Profile | `/brand` | Workspace brand knowledge base — view, edit, regenerate |
| Settings | `/settings` | Account, workspaces, avatar |

5.2 Brand Context Engine
Overview
The Brand Context Engine is the foundational layer of the platform. Every analysis module depends on it. The user inputs their brand URL during workspace creation, and the system builds a structured brand profile reused across all downstream features.

Inputs
Primary brand website URL (set at workspace creation)
Optional: manual brand description when scraping returns insufficient content

Processing Steps
URL scraping: HTTP fetch with HTML parsing — extracts title, meta tags, headings, CTAs, body copy, and JSON-LD structured data fallback
AI synthesis: Claude generates a structured brand profile — product category, value propositions, target customer, price signals, offer structure, tone, differentiators
Brand profile stored per workspace and reused across all subsequent analyses
Progress UI during generation with step-by-step status updates
Manual override flow when scrape confidence is low

Outputs
Structured brand profile card (visible and editable on `/brand`)
Internal knowledge object injected into all AI pipelines
Warning flags when profile was derived from limited data

5.3 Funnel Analysis (Ad Creative + Landing Page + ICP)
Overview
The primary analysis flow. User selects a creative goal, platform(s), uploads or pastes ad creative, confirms landing page URL, and receives a tabbed funnel intelligence report.

Inputs
Creative goal: Drive purchases, Generate leads, Build brand awareness, Promote a sale, Launch a new product, Retarget warm audiences
Platform context: Meta Feed, Meta Stories, TikTok, YouTube, Instagram, Other
Ad creative: image upload (JPG/PNG), video upload (MP4), or raw script/copy text
Landing page URL (pre-populated from brand profile, editable per analysis)

Analysis Pipeline
Market intelligence brief gathered in parallel (Tavily web search + Meta Ad Library when API keys configured; cached 7 days per workspace)
Landing page scraped and evaluated against ad creative context
Performance criteria checklist loaded (static universal criteria + AI-distilled dynamic criteria cached per workspace)
Two specialist agents run in parallel:
  - Agent 01 — The Skeptical Buyer: simulates purchase hesitation, objections, believability
  - Agent 02 — The Direct Response Critic: evaluates hook structure, scroll-stopping power, CTA logic, offer clarity
Synthesis agent (Verdict / Funnel Report) produces structured JSON: conversion score, creative strength score, ICP simulation, angle recommendations, hook variants, script rewrite, priority actions, criteria checklist
Hook variants auto-captured into Hook Library after completion

Note: Legacy reports may include transcripts from The Competing Brand and The Contrarian Strategist agents. The current cost-optimized pipeline uses the two-agent + synthesis architecture above.

Outputs
Overall funnel score (average of conversion score + creative strength score)
Conversion score (0–100) with category breakdown
Creative strength score (0–100), calibrated to the selected creative goal
Agent findings with key findings per agent
Ranked angle recommendations with angle tags (Pain-Agitation-Solution, Social Proof, Founder Story, Us vs. Them, Transformation, Fear/Risk)
Hook variants (3–5 ranked alternatives)
Full script rewrite incorporating top recommendations
ICP simulation: 3 first-person buyer journey narratives with conversion likelihood ratings
Top conversion blockers with severity and strategic breakdown
Priority action plan sorted by impact and effort
Criteria checklist: pass/fail/N/A per performance criterion with evidence notes
Data-quality flags (partial landing page, limited brand profile, video processing notes)

Report UI Tabs
Tab 1 — Creative Intelligence: agent findings, ranked angles, hook variants, script rewrite, criteria checklist
Tab 2 — Landing Page Report: conversion score breakdown, funnel continuity flag, category cards with fix instructions
Tab 3 — ICP Simulation: buyer journey narratives and likelihood ratings
Tab 4 — Action Plan: combined priority actions from all analyses
Report chat panel: contextual Creative Director chat scoped to the current report

5.4 Landing Page Analyzer + Conversion Score
Overview
Embedded in funnel analysis. Evaluates the landing page against the ad creative being run, producing a Conversion Score and prioritized improvements. Semantic analysis of scraped copy and structure — no visual screenshot capture or annotation overlay.

Evaluation Categories (goal-aware weighting)
| Category | What Is Evaluated |
|----------|-------------------|
| Message Match | Does the page deliver on this ad's specific promise? |
| Hook Strength | Above-fold value proposition clarity |
| Social Proof | Reviews, UGC, trust signals — specificity and placement |
| Offer Clarity | Offer, price, CTA clarity; risk reversal |
| Objection Handling | Top buyer objections addressed on page |
| Visual & UX | Layout, CTA contrast, mobile readability (from scraped structure, not screenshot) |
| Funnel Continuity | Page delivers on the specific angle of the ad being evaluated |

Score Interpretation
85–100: High-converting page. Minor optimizations only.
70–84: Good foundation. 2–3 targeted fixes recommended.
50–69: Meaningful conversion leakage. Priority improvements required before scaling ad spend.
Below 50: Fundamental page issues. Scaling ads will amplify losses, not revenue.

5.5 ICP Funnel Simulation
Overview
Generated as part of the funnel analysis synthesis. Three distinct buyer personas simulate the complete journey from ad exposure through landing page, surfacing friction points with first-person narrative realism.

How It Works
ICP profile constructed from brand profile and scraped landing page content
Three buyer types simulated: Highly Aware, Problem Aware, Skeptical / Cold
Each persona narrates ad reaction + landing page experience with phase labels
Conversion likelihood rating per persona (High / Medium / Low)
Top conversion blockers ranked with severity and strategic recommendations

5.6 Performance Criteria Checklist
Overview
Binary pass/fail evaluation framework applied to every funnel analysis and deconstruction. Combines hardcoded universal criteria with AI-distilled dynamic criteria specific to the brand's niche (cached 7 days per workspace).

Categories
Creative criteria (C1–C7+): hook clarity, proof, CTA timing, scroll-stopping energy, believability, retention
Landing page criteria (L1–L7+): message match, hero clarity, social proof, offer clarity, objection handling, CTA visibility, mobile UX
Dynamic criteria: niche-specific checks distilled from market intelligence brief

Display
Rendered in Creative Intelligence tab and deconstruction reports
Each item shows pass / fail / N/A with evidence note
N/A used when criterion doesn't apply to the ad's creative goal or format

5.7 Market Intelligence Enrichment
Overview
Background enrichment layer (not a standalone user-facing module). Runs automatically before funnel analysis and brief generation when API keys are configured.

Sources
Tavily web search: platform trends, competitor angles, winning script patterns, audience psychology, customer frustrations, category conversion patterns
Meta Ad Library API: active competitor ads with advertiser name, copy snippet, CTA, running duration

Behavior
Results cached 7 days per workspace/category
Injected into agent context — informs skeptical buyer, DR critic, and synthesis agents
Gracefully skipped when API keys not configured (analysis proceeds without enrichment)
Competitor ad data also used by Ad Deconstructor evidence verification

5.8 Variant Comparison
Overview
Head-to-head analysis comparing 2–4 creative variants on a single test dimension (hook, script/copy, visual style, CTA, or full creative).

Inputs
Platform and creative goal (same as funnel analysis)
Test dimension selection
2–4 variants: each can be image, video, or script

Outputs
Per-variant creative evaluation scores
Ranked winner with rationale
Dimension-specific breakdown
Comparison synthesis report with launch recommendation
Winning hooks captured to Hook Library

5.9 Ad Deconstructor
Overview
Reverse-engineers competitor or reference ads to extract strategic frameworks and translate them for the user's brand. Includes evidence verification to distinguish proven winners from unverified uploads.

Inputs
Competitor/reference landing page URL
Ad creative: image or video upload
Optional user notes

Evidence Verification
Meta Ad Library lookup for advertiser and ad longevity signals
Tavily search for public performance mentions
Confidence scoring: high / medium / low
High/medium confidence → full deconstruction mode
Low confidence → honest analysis mode (strengths, weaknesses, lessons — not treated as proven winner)

Outputs (Deconstruction Mode)
Psychological trigger analysis
Structural framework (beat-by-beat breakdown)
Offer mechanics and visual production notes
Brand translation: adapted hook, structural outline, offer translation for user's brand
Evidence report with confidence badges and signal details

Outputs (Honest Analysis Mode)
Headline assessment
Strengths and weaknesses lists
Lessons extracted
Creative criteria checklist evaluation

5.10 Creative Brief Generator
Overview
Produces production-ready creative briefs before any ad exists. Wizard collects campaign inputs; AI proposes angle options; user selects angle; full brief generated.

Wizard Inputs
Campaign goal, platform, audience temperature (cold/warm/hot)
Audience notes, angle mode (user idea or surprise me)
Production resources (full production, in-house, UGC creator, phone only)
Ad budget tier, creative format/duration, landing page URL

Outputs
Structured brief document:
  - Header: campaign goal, target audience, platform, strategic rationale
  - Angle: name, explanation, emotion, belief
  - Hook options (ranked with rationale and opening visual direction)
  - Full script
  - Shot list (on-screen, text overlay, duration, direction)
  - Production notes and CTA guidance
  - What to avoid list
PDF export (jsPDF)
Hooks from brief auto-captured to Hook Library

5.11 Hook Library
Overview
Central repository of hooks extracted from analyses, briefs, and comparisons — plus manually added hooks.

Features
Auto-capture from funnel analyses, variant comparisons, and creative briefs
Manual hook creation
Favorites, custom tags, angle tag presets
Filter by platform, source type, favorites, test queue
Sort options
Bulk actions: delete, tag, export
Export: CSV download, clipboard copy
Test queue: mark hooks flagged for upcoming creative tests (dashboard widget shows count)
Browse hooks modal when starting new analysis (prefill inspiration)

5.12 Creative Director (Chat)
Overview
Always-on AI strategist for open-ended creative conversations. Two context modes:

Workspace mode: full workspace context across all completed analyses
Analysis mode: deep context on a specific analysis report

Capabilities
Generate hook variants, rewrite scripts, explain report findings
Produce on-the-spot creative briefs for new angles
Compare analyses using actual scores and findings
Push back on weak assumptions with report evidence
Streaming responses via SSE

Report-scoped chat also available as a slide-out panel on any funnel or comparison report page.

5.13 Performance Analytics
Overview
Tracks creative score evolution across completed funnel analyses in a workspace.

Requires 2+ completed analyses to display.

Metrics
Average funnel score, creative strength score, conversion score
Score trend chart over time
Category breakdown trends (message match, hook strength, etc.)
Automated insight callouts based on score patterns
Performance timeline of individual analyses

5.14 Workspaces & Auth
Workspaces
Multi-workspace support with workspace switcher
Each workspace has its own brand profile, analyses, briefs, hooks, and deconstructions
Create additional workspaces from settings

Auth
Email/password sign-up and sign-in
Google OAuth
Password reset flow
Onboarding: welcome → create workspace (name + brand URL) → brand profile generation → ready
Supabase Auth with RLS on all data tables

6. User Experience & Core Flows
6.1 Onboarding Flow
User signs up (email or Google auth)
Creates workspace with name and brand website URL
Brand Context Engine runs automatically with progress UI
If scrape insufficient → manual brand description step
User lands on dashboard — workspace ready

6.2 Primary Funnel Analysis Flow
User clicks New Analysis from dashboard or `/analyses/new`
Step 1: Select creative goal
Step 2: Select platform(s)
Step 3: Upload ad creative (image, video, or paste script)
Step 4: Confirm landing page URL (pre-populated from brand profile)
Step 5: Review and submit
Progress UI shows pipeline stages during processing
Full report loads — tabbed interface: Creative Intelligence | Landing Page | ICP Simulation | Action Plan
User can open report chat, save hooks to library, copy sections
Export button present (disabled — coming soon)

6.3 Variant Comparison Flow
User navigates to `/analyses/compare`
Selects platform, creative goal, test dimension
Uploads 2–4 variants
Submits → progress UI → comparison report with winner ranking

6.4 Ad Deconstructor Flow
User navigates to `/deconstructor/new`
Enters competitor landing page URL
Uploads reference ad (image or video)
Evidence verification runs → deconstruction or honest analysis report

6.5 Creative Brief Flow
User navigates to `/brief/new`
Completes 5-step wizard (goal, audience, angle, production, review)
AI generates 3 angle options → user selects one
Full brief generated → view document → download PDF

7. Technical Architecture
7.1 System Overview

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS 4, Framer Motion |
| Backend | Next.js API routes + server actions (Node.js) |
| AI Models | Anthropic Claude (primary — reasoning, agents, synthesis, JSON extraction); OpenAI Whisper (video transcription) |
| Web Scraping | HTTP fetch + HTML parsing + JSON-LD extraction (no headless browser) |
| File Storage | Supabase Storage (`analysis-creatives` bucket) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Background Jobs | Fire-and-forget worker routes (`triggerBackgroundWorker`) — separate serverless invocations for long-running pipelines |
| Market Intelligence | Tavily API + Meta Ad Library API (optional, env-configured) |
| Auth | Supabase Auth (email + Google OAuth) |
| Brief Export | jsPDF client-side PDF generation |
| Video Processing | fluent-ffmpeg + @ffmpeg-installer/ffmpeg for audio extraction; Whisper transcription |

7.2 Agent Orchestration (Funnel Analysis)
Specialist agents (Skeptical Buyer, Direct Response Critic) run in parallel with shared context: brand profile, creative content, landing page text, platform context, intelligence brief, criteria checklist.
Synthesis agent (Funnel Report) runs after both complete — produces structured JSON including conversion scoring, ICP simulation, angles, hooks, script rewrite, and action plan.
Target analysis time: under 3 minutes including scraping and intelligence gathering.
Analysis watchdog expires stuck jobs after timeout.

7.3 Key Technical Considerations
Dynamic page scraping: HTTP-based extraction with JSON-LD fallback + mandatory manual brand override UX when confidence is low. No Playwright/Puppeteer rendering.
Video analysis: Whisper transcription for audio; thumbnail frame for visual description via Claude vision. Video files validated on upload.
API cost management: Two-agent pipeline (down from original five-agent design) with prompt caching via `cachedContext`. Intelligence brief and criteria cached 7 days per workspace.
Analysis consistency: Agent prompts versioned in `lib/ai/prompts.ts` — treated as code with structured output schemas.
Creative goal calibration: Scoring frameworks adjust per goal (purchases, leads, awareness, sale, launch, retarget) — prevents false negatives on non-conversion ads.

8. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI output quality inconsistency | High | Structured output schemas, goal-aware scoring, criteria checklists, extensive prompt rules (anti-slop, single-ad grading law) |
| Landing page scraping failures on dynamic pages | High | JSON-LD fallback + manual brand override UX + partial-data flags on reports |
| API costs at scale | Medium | Two-agent pipeline, 7-day caching on intelligence + criteria, watchdog timeouts |
| Low first-analysis quality | Medium | Creative goal selection, intelligence enrichment, criteria checklist grounding |
| Scope creep | High | Modular feature set with clear separation — analysis, briefs, deconstructor, hooks each independent |

Advara — Product Requirements Document v1.1 — As Built
