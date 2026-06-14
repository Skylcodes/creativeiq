PRODUCT REQUIREMENTS DOCUMENT
CreativeIQ
AI-Powered Ad Creative & Funnel Intelligence for E-commerce/DTC Brands
Version
1.0 — MVP
Date
June 2026


Target Market
E-Commerce / DTC Brands
Status
Pre-Development

1. Executive Summary
CreativeIQ is a multi-agent AI SaaS platform built specifically for E-Commerce and Direct-to-Consumer (DTC) brands. It analyzes ad creatives and landing pages together — as a unified conversion funnel — rather than in isolation, producing actionable intelligence that reduces wasted ad spend and increases conversion rates.
The core insight driving this product: most DTC brands run ad creative analysis and landing page optimization as entirely separate processes. This creates a fundamental blind spot — an ad that performs well in isolation can still fail if it attracts the wrong buyer intent relative to the landing page experience. CreativeIQ closes this loop.
Core Value Proposition
Input: Brand URL + ad creative (image, video, or script)
Output: Full funnel intelligence report — ad analysis, landing page score, ICP simulation, angle recommendations, and a prioritized testing roadmap
Differentiator: Multi-agent adversarial reasoning that evaluates the entire funnel as a system, not individual parts

2. Problem Statement
2.1 The Core Problem
DTC brands operating paid social (Meta, TikTok) face three interconnected problems that current tools fail to solve simultaneously:
Funnel fragmentation: Ad creative feedback tools (Foreplay, MagicBrief, AdCreative.ai) evaluate ads in a vacuum without knowing what landing page the traffic lands on. CRO tools (Hotjar, VWO) evaluate landing pages without knowing what the ad promised.
No adversarial testing pre-launch: Brands have no way to stress-test creative from the perspective of a skeptical buyer, a competing brand, or an unconventional angle — before spending media budget to find out.
ICP-to-funnel disconnect: Brands assume they know who their buyer is, but rarely simulate how different buyer types actually experience the journey from ad to purchase..
3.1 Product Goals
Deliver actionable funnel intelligence in under 3 minutes per analysis
Produce ad creative recommendations specific enough to hand directly to a creative team
Score landing pages with enough granularity that brands can prioritize CRO actions immediately
Simulate ICP buyer journeys with sufficient realism that brands surface conversion blockers before spending on media
4.1 Primary Personas
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
Goal: Use CreativeIQ as a backend engine to produce client-ready reports faster
Behavior: Power user — will use the platform at high volume, values export quality and white-labeling (post-MVP)

4.2 ICP Definition (Primary Target for MVP)
E-Commerce / DTC brand doing $500K–$10M annually in revenue, running paid social ads on Meta and/or TikTok, or organic social media ads with an internal or outsourced media buyer. Has an active landing page or product page. Spends $5K–$100K/month on paid ads.
5. Feature Specifications
5.1 Feature Priority Framework
Priority
Feature


P0 — MVP Core
Brand Context Engine (URL ingestion + analysis)


P0 — MVP Core
Ad Creative Analysis (multi-agent debate)


P0 — MVP Core
Landing Page Analyzer + Conversion Score


P0 — MVP Core
ICP Funnel Simulation Agent


P1 — Phase 2
Competitor Ad Intelligence


P1 — Phase 2
Weekly Creative Testing Roadmap


P2 — Phase 3
Trend Scraping + Full Marketing Plan


P3 — Future
AI Video Prompt Generator



5.2 P0: Brand Context Engine
Overview
The Brand Context Engine is the foundational layer of the platform. Every analysis module depends on it. The user inputs their brand URL (website or specific product/landing page), and the system builds a comprehensive brand knowledge base that all downstream agents reference.
Inputs
Primary brand website URL
Optional: specific product page URL or landing page URL
Optional: manual product description override (for brands with complex catalogs or dynamic pages that are difficult to scrape)
Processing Steps
URL scraping: Full page content extraction including headline copy, body copy, product descriptions, pricing, social proof elements, CTA text, and visual layout description
Visual rendering: Headless browser screenshot to capture above-the-fold layout, CTA placement, image use, and page structure
AI synthesis: Generate structured brand profile — product category, core value propositions, target customer signals, price point, social proof availability, offer structure (trial, guarantee, discount), brand tone
Brand profile stored per workspace and reused across all subsequent analyses (user does not re-input for each session)
Outputs
Structured brand profile card (visible to user for validation)
Internal knowledge object used by all downstream agents
Warning flags if insufficient information was scraped (prompts user to manually supplement)
Technical Consideration
Shopify, WooCommerce, and Webflow pages present dynamic rendering challenges. The system must use a headless browser (Playwright or Puppeteer) rather than static scraping. For Shopify stores, meta tags and JSON-LD product schema provide reliable structured fallback data.
If page scraping fails or returns insufficient content, the UI must gracefully surface this and prompt a manual description input rather than silently producing a low-quality brand profile.

5.3 P0: Ad Creative Analysis (Multi-Agent Debate Engine)
Overview
The user uploads an ad creative — static image, video file, or text script. The system runs a structured multi-agent debate where each agent evaluates the creative from a distinct strategic perspective. A synthesis agent aggregates findings into a ranked, actionable report.
Inputs
Ad creative: image upload (JPG/PNG), video upload (MP4), or raw script/copy text
Platform context: Meta Feed, Meta Stories, TikTok, YouTube Pre-roll (affects format evaluation)
Brand context: automatically pulled from Brand Context Engine
The Five Agents
Agent
Role
Evaluation Focus
Agent 01 — The Skeptical Buyer
Critic
Reads the creative as the target ICP. Raises every objection. Questions believability, relevance, emotional resonance, and specificity of claims.
Agent 02 — The Competing Brand
Adversary
Argues why a competitor's angle or offer is stronger. Forces confrontation with what the user is up against in the same ad auction.
Agent 03 — The Direct Response Critic
Technical
Evaluates hook structure, pattern interrupt strength, scroll-stopping power, CTA logic, and offer clarity. Flags weak hooks before they hit the algorithm.
Agent 04 — The Contrarian Strategist
Ideator
Proposes a completely different angle the user has not considered. Identifies the 'negative space' — what competitors are not saying. Often the most valuable output.
Agent 05 — The Verdict Agent
Synthesis
Synthesizes the full debate into a ranked recommendation: which angle to launch first, what to fix before launch, and what to test second.

Outputs
Structured debate transcript (collapsible per agent in the UI)
Ranked angle list (1st launch recommendation, 2nd test, alternatives)
Script rewrite: full revised version of the ad script/copy incorporating top recommendations
Hook variants: 3–5 alternative hook rewrites ranked by predicted scroll-stopping power
Pre-launch brief: exportable document formatted for handoff to a creative team or video editor
Angle tags: categorized by proven frameworks (Pain-Agitation-Solution, Social Proof, Founder Story, Us vs. Them, Transformation, Fear/Risk)
5.4 P0: Landing Page Analyzer + Conversion Score
Overview
The Landing Page Analyzer evaluates the user's landing page against the ad creative being run, producing a Conversion Score and a prioritized list of improvements. The evaluation is bi-modal: semantic analysis of copy and structure, plus visual analysis of layout and UX.
Inputs
Landing page URL (auto-populated from Brand Context Engine, editable per analysis)
Ad creative context (the offer/promise made in the ad, pulled from Ad Creative Analysis)
ICP profile (from brand profile or user-defined)
Evaluation Framework
Category
What Is Evaluated
Max Score
Message Match
Does the headline/hero match the ad's core promise? Is there continuity of language?
20 pts
Hook Strength (Above Fold)
Does the above-fold section communicate the value proposition within 3 seconds?
15 pts
Social Proof Quality
Reviews, UGC, press mentions, trust badges — specificity and placement
15 pts
Offer Clarity
Is the offer, price, and CTA unambiguous? Risk reversal present (guarantee, trial)?
15 pts
Objection Handling
Does the page address the top 3–5 objections a skeptical buyer would have?
15 pts
Visual & UX Quality
Page load signal, image quality, CTA button contrast, mobile layout
10 pts
Funnel Continuity
Does the page deliver on the specific angle of the ad being evaluated?
10 pts
TOTAL


100 pts

Score Interpretation
85–100: High-converting page. Minor optimizations only.
70–84: Good foundation. 2–3 targeted fixes recommended.
50–69: Meaningful conversion leakage. Priority improvements required before scaling ad spend.
Below 50: Fundamental page issues. Scaling ads will amplify losses, not revenue.
Outputs
Conversion Score (0–100) with category breakdown
Priority-ranked improvement list with specific copy rewrites, structural changes, or element additions
Elements to add / remove / replace with exact suggestions (not vague guidance)
Funnel continuity flag: explicit callout if the landing page does not match the ad creative's angle
5.5 P0: ICP Funnel Simulation Agent
Overview
The ICP Funnel Simulation Agent is the most differentiated feature of the platform. A dedicated AI agent roleplays as the brand's Ideal Customer Profile and navigates the complete sales funnel — from first exposure to the ad through the landing page — surfacing friction points, emotional responses, and conversion blockers with first-person narrative realism.
How It Works
ICP profile is constructed from the brand's scraped content, product positioning, and any user-provided customer data
3 distinct buyer types are simulated per analysis: (1) Highly Aware — knows the problem, comparing solutions; (2) Problem Aware — feels the pain, hasn't committed to a solution category; (3) Skeptical / Cold — exposed to the ad with low intent, evaluates quickly
Each buyer type narrates their experience of the ad, then the landing page, flagging moments of interest, doubt, confusion, and decision
Synthesis agent identifies the most common drop-off moments and conversion blockers across all three simulations
Outputs
3 first-person buyer journey narratives (ad reaction + landing page experience)
Conversion likelihood rating per buyer type (High / Medium / Low / Will not convert)
Top 5 conversion blockers ranked by frequency across simulations
Specific recommendations to address each blocker
5.6 P1: Competitor Ad Intelligence
Overview
Using the Meta Ad Library (public API) and TikTok Creative Center, the platform identifies competitors in the user's product category and analyzes their active ad creative strategies. This informs the Contrarian Strategist agent and surfaces untapped angles.
Scope & Constraints
Competitor identification: keyword-based search in ad libraries matching the user's product category
Analysis limited to publicly available ad data (Meta Ad Library API, TikTok Creative Center) — no scraping of non-public data
Output: top 5–10 competitor ads by activity level, with angle categorization and gap analysis
Legal & Technical Note
Competitor ad analysis must rely exclusively on public APIs and publicly visible ad library data. The Meta Ad Library API is available to registered developers and covers active political and non-political ads. TikTok Creative Center provides public top ad data. Web scraping of competitor landing pages for commercial intelligence purposes may carry legal risk depending on jurisdiction — this scope must be reviewed with legal counsel prior to implementation.

5.7 P1: Weekly Creative Testing Roadmap
Overview
Based on the ad creative analysis, landing page score, ICP simulation findings, and competitor intelligence, the system generates a priority-ranked weekly testing plan. This gives brands a structured experimentation agenda rather than ad hoc creative decisions.
Inputs
All previous analysis outputs for the brand workspace
User-defined testing cadence (weekly, biweekly)
Current ad spend level (used to prioritize highest-leverage tests first)
Output Structure
Priority-ranked test list (Test #1 through Test #N)
Per test: hypothesis, angle to test, suggested creative format, expected signal timeframe, success metric
Reasoning: why this test is ranked above others (which finding from analysis it addresses)
5.8 P2: Trend Intelligence + Marketing Plan (Phase 3)
This feature represents a significant scope expansion and should not be built until P0/P1 features are validated with paying customers. It involves scraping communities (Reddit, TikTok comments, Amazon reviews) and trend platforms to identify emerging pain points and desires in the brand's market, then generating a full marketing plan incorporating those signals.
Strategic Recommendation
Do not build this for MVP. The core value proposition (ad creative + landing page intelligence) is strong enough to acquire and retain paying customers. Trend scraping and full marketing plans push the product into a different category (market research) and significantly increase development complexity, cost, and maintenance burden.
Validate revenue from core features first. Add this in Phase 3 as a premium upsell.

5.9 P3: AI Video Prompt Generator (Future)
The system analyzes the winning ad creative angle and generates an optimized prompt for AI video generation tools (Sora, Runway, Kling). This does not generate video directly — it produces a production-ready prompt. This feature is low-priority for MVP and should be scoped post-revenue validation.
6. User Experience & Core Flows
6.1 Onboarding Flow
User signs up (email or Google auth)
Prompted to enter brand website URL — Brand Context Engine runs automatically
Brand profile card displayed for validation — user confirms or edits
User is taken to the main dashboard — workspace is ready
6.2 Primary Analysis Flow
User uploads ad creative (image, video, or pastes script)
Selects platform context (Meta / TikTok / YouTube)
Confirms landing page URL (pre-populated from brand profile, editable)
Clicks 'Analyze' — system runs all agents in parallel
Progress UI shows which agents are running (creates perceived intelligence and engagement during wait)
Full report loads — tabbed interface: Ad Analysis | Landing Page | ICP Simulation | Recommendations
User can export report as PDF or copy specific sections
6.3 Report UI Structure
Tab 1 — Creative Intelligence: Agent debate transcript (collapsible), ranked angle list, hook variants, script rewrite
Tab 2 — Landing Page Report: Conversion Score with category breakdown, visual screenshot with annotations, prioritized improvement list
Tab 3 — ICP Simulation: 3 buyer journey narratives, conversion likelihood ratings, top 5 blockers
Tab 4 — Action Plan: Combined priority action list pulling from all three analyses, sorted by estimated revenue impact
7. Technical Architecture
7.1 System Overview
Component
Technology / Approach
Frontend
React / Next.js — responsive web app, mobile-accessible
Backend
Node.js or Python (FastAPI) — API layer orchestrating agent calls
AI Models
Claude (primary reasoning, agent personas, synthesis) + GPT-4o Vision (image/visual analysis)
Web Scraping
Playwright (headless browser) for dynamic page rendering; Cheerio for static fallback
File Handling
Cloudflare R2 or AWS S3 for ad creative file uploads or supabase storage or google storage, we can choose when the time to build the required feature happens
Database
supabase
Job Queue
Whichever works with the rest of the techstack
Auth
Supabase Auth
Payments
Stripe (subscription billing)
Export
PDF report generation via Puppeteer or React-PDF

7.2 Agent Orchestration
All five analysis agents (Skeptical Buyer, Competing Brand, Direct Response Critic, Contrarian Strategist, Verdict Agent) must run with access to a shared context object containing: brand profile, ad creative content, landing page content, and platform context. Agents 01–04 run in parallel. Agent 05 (Verdict) runs after all four have completed, consuming their outputs as input.
Target total analysis time: under 90 seconds for Agents 01–04 in parallel. Under 30 additional seconds for Agent 05 synthesis. Total under 3 minutes including scraping.
7.3 Key Technical Risks
Dynamic page scraping failures: Addressed via Playwright + JSON-LD fallback + manual override UI.
Video analysis: Transcription via Whisper API for audio; frame sampling for visual content. Video files capped at 500MB for MVP.
API cost management: Multi-agent calls are expensive at scale. Implement usage-based token tracking per workspace and enforce monthly analysis limits per pricing tier.
Analysis consistency: Agent prompts must be highly structured and versioned. A change to an agent prompt changes output quality — treat prompts as code with version control.
8. Pricing & Monetization Strategy
8.1 Pricing Philosophy
CreativeIQ competes on value displacement, not feature count. The relevant benchmark for DTC buyers is the cost of a creative strategist ($3,000–$8,000/month retainer) or a CRO consultant ($2,000–$5,000/month). Pricing must be credible relative to that value — not priced as a commodity SaaS tool.
8.3 GTM Pricing Recommendation
Launch with a 14-day free trial (no credit card required) limited to 2 full analyses. This lets the product prove value before asking for payment. The Starter tier at $97/month should be the default landing — low enough for solo founders, high enough to signal the product is a professional tool and not a commodity.
9. MVP Scope & Build Sequence
9.3 Recommended Build Sequence
Sprint
Duration
Deliverable
Sprint 1
2 weeks
Brand Context Engine + basic UI shell + auth
Sprint 2
2 weeks
Ad Creative Analysis — text/script input + all 5 agents + report UI
Sprint 3
2 weeks
Landing Page Analyzer + Conversion Score + visual screenshot
Sprint 4
2 weeks
ICP Funnel Simulation + full combined report + PDF export
Sprint 5
1 week
Stripe integration + pricing tiers + polish
Sprint 6
1 week
Beta testing with 5–10 DTC brands + iteration

10. Risks & Mitigations
Risk
Severity
Mitigation
AI output quality inconsistency — reports vary in usefulness across product types
High
Strict agent prompt versioning, structured output schemas, human-reviewed prompt library, test suite of diverse product types
Landing page scraping failures on dynamic Shopify/Webflow pages
High
Playwright headless rendering + JSON-LD fallback + mandatory manual override UX when confidence is low
API costs at scale making unit economics unsustainable
Medium
Token budgets per analysis, caching brand profiles, usage limits per tier, monitor cost-per-analysis from day one
Low willingness to pay if first analysis underwhelms
Medium
Free trial gives users a real output before payment. First analysis experience is the product's sales pitch — it must be exceptional
Competitor replication by established players (AdCreative.ai, Foreplay)
Medium
Speed of execution and brand trust within DTC communities is the moat. Build in public, get testimonials fast, go deep on niche before going broad
Scope creep delaying MVP launch
High
Enforce strict P0 boundary. Video generation, trend scraping, and marketing plans are explicitly post-revenue features

11. Go-To-Market Strategy
12. Open Questions & Decisions Required
Question
Decision Needed By
Which AI model handles video frame analysis — Claude Vision, GPT-4o Vision, or Gemini?
Sprint 1 planning
What is the legal review status of competitor ad library scraping via Meta API?
Before Sprint 4
Will the product be built in-house or with a development partner?
Immediately













CreativeIQ — Product Requirements Document v1.0 — Confidential

