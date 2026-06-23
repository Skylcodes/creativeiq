# Advara Premium UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Advara's visual system into a premium AI command center without changing functionality.

**Architecture:** Start with global tokens and CSS primitives in `app/globals.css`, then update shared UI components that every page consumes. Finish by sweeping representative landing, auth, dashboard, chat, report, wizard, and app surfaces for hardcoded legacy styling.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Framer Motion, Next font.

---

### Task 1: Global Tokens And Styling Primitives

**Files:**
- Modify: `app/globals.css`

- [ ] Replace root color, shadow, radius, and typography tokens with the Premium AI Command Center system.
- [ ] Upgrade `.glass`, `.premium-card`, `.surface-card`, `.btn-primary`, `.btn-secondary`, `.btn-premium`, `.btn-ghost`, `.premium-tabs`, `.insight-chip`, `.shimmer-skeleton`, `.sidebar-nav-active`, `.chat-bubble-assistant`, and `.chat-bubble-user`.
- [ ] Replace floating blob visual language with controlled radial lighting and refined grid/noise utilities.
- [ ] Verify no CSS syntax errors are introduced by running `npm run lint`.

### Task 2: Shared Primitive Refresh

**Files:**
- Modify: `components/ui/premium-card.tsx`
- Modify: `components/ui/page-shell.tsx`
- Modify: `components/auth/auth-input.tsx`
- Modify: `components/auth/auth-card.tsx`
- Modify: `components/shared/logo.tsx`
- Modify: `components/shared/toast.tsx`

- [ ] Keep component APIs unchanged.
- [ ] Add richer class composition that uses the upgraded global primitives.
- [ ] Improve typography density, focus states, glass surfaces, and card depth.
- [ ] Verify edited files with `ReadLints`.

### Task 3: App Shell And Navigation

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `components/dashboard/shell/app-sidebar.tsx`
- Modify: `components/dashboard/shell/top-bar.tsx`
- Modify: `components/dashboard/shell/user-menu.tsx`
- Modify: `components/dashboard/workspace-switcher.tsx`

- [ ] Strengthen the shell/canvas glass treatment.
- [ ] Refine active navigation, hover states, top-bar actions, workspace switcher, and user menu surfaces.
- [ ] Preserve routes, state, local storage behavior, and auth guards.

### Task 4: High-Traffic Product Surfaces

**Files:**
- Modify representative files in `components/dashboard/`, `components/analyses/`, `components/report/`, `components/chat/`, `components/analysis-wizard/`, `components/brief-wizard/`, `components/hooks/`, `components/brand/`, `components/settings/`, `components/deconstructor/`, and `components/onboarding/`.

- [ ] Replace legacy generic card/button/input classes with global premium primitives.
- [ ] Normalize hardcoded old purple hex values to token-based classes where practical.
- [ ] Improve empty states, loading states, score treatments, wizard panels, chat input, and report sections.
- [ ] Keep logic and component props unchanged.

### Task 5: Landing And Auth Surface Polish

**Files:**
- Modify representative files in `components/landing/`
- Modify: `app/forgot-password/page.tsx`
- Modify: `app/reset-password/page.tsx`

- [ ] Make hero, feature cards, proof elements, nav, testimonials, comparison, and final CTA feel cohesive with the app shell.
- [ ] Replace excessive blob/gradient language with intentional lighting fields.
- [ ] Preserve links, forms, and auth behavior.

### Task 6: Verification

**Files:**
- No new source files required.

- [ ] Run `npm run lint`.
- [ ] Read lints for edited files.
- [ ] If the dev server is already running, visually inspect the main surfaces manually through the browser when available.
- [ ] Summarize any remaining visual debt or files intentionally left untouched.

