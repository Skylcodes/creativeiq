# Advara Premium UI Redesign Design

## Goal

Redesign the visual system across Advara without changing functionality or product structure. The current information architecture is acceptable, but the execution needs to feel less like a generated Tailwind SaaS template and more like a polished, high-value AI product.

The approved direction is **Premium AI Command Center**: a mix of dimensional AI operating system and high-contrast AI studio. The interface should feel sharp, confident, premium, and high-performance, with enough restraint to remain trustworthy for business users.

## Non-Goals

- Do not change app functionality, routing, data flow, auth behavior, or API behavior.
- Do not introduce random decorative effects, neon gimmicks, crypto-style glow, or gaming UI.
- Do not copy SalesPulseAI, Linear, Vercel, Framer, or any reference directly.
- Do not redesign the product architecture. Improve the visual system and component execution.

## Visual Principles

1. **Dimensional but disciplined.** Use glass, depth, and luminous borders to create hierarchy, not decoration.
2. **High-contrast AI energy.** The product should have stronger violet/indigo presence than a neutral enterprise dashboard, but the base remains light and premium.
3. **Expensive surfaces.** Cards, shells, inputs, modals, and navigation should feel layered, tactile, and intentionally lit.
4. **Serious SaaS trust.** Typography, spacing, and state design should signal reliability and clarity.
5. **System first.** Upgrade shared tokens and global component classes before one-off component edits.

## Palette

Replace the generic purple startup palette with a richer violet, indigo, plum, and ink system.

The light theme should keep a premium white base:

- Background: warm white / pearl, not flat gray.
- Surface: translucent white glass with slight saturation.
- Elevated surface: brighter white with inner highlight.
- Text primary: deep ink, almost black but softer than pure black.
- Text secondary: cool graphite.
- Text muted: controlled slate, still legible.
- Accent primary: rich electric violet.
- Accent secondary: deep indigo or ultraviolet.
- Accent tertiary: small cyan or blue-violet detail only where it adds analytical energy.
- Success/warning/error: keep practical and accessible, less candy-colored.

Avoid large generic purple-to-pink gradients. Use directional violet/indigo/plum gradients for primary CTAs and selected hero elements only.

## Typography

Keep the existing font infrastructure if practical, but make usage more premium:

- Display headings should use tighter tracking, strong weight, and confident line-height.
- Body text should be quieter, readable, and more editorial.
- Eyebrows should be sparse, uppercase, letter-spaced, and used for hierarchy rather than decoration.
- Metrics should feel precise, with strong numeric contrast and restrained labels.
- Buttons and nav labels should be compact, crisp, and slightly denser than the current style.

If changing fonts later, prefer a premium pairing that still works well with Next font loading. The implementation should not add risky font dependencies unless needed.

## Surfaces And Glass

Introduce a more sophisticated surface stack:

- `app-shell`: atmospheric background with controlled radial lighting, not floating blobs.
- `app-canvas`: large glass workspace with blur, inset highlight, and soft outer shadow.
- `premium-card`: default glass card with border, inner top highlight, shadow stack, and subtle grain.
- `premium-card-elevated`: stronger depth for important dashboard modules.
- `premium-card-glass`: translucent panels for overlays, wizards, chat, and modal-like surfaces.
- `premium-card-accent`: restrained violet/indigo wash for strategic callouts.
- `surface-card`: lightweight surface for dense lists.

Cards should use layered shadows: a thin outline, a small contact shadow, and a larger low-opacity violet/ink ambient shadow. Borders should be visible but refined.

## Buttons

Primary buttons should feel premium and interactive:

- Rich violet/indigo gradient.
- Inner highlight and subtle bottom depth.
- Hover: small lift, stronger shadow, slightly brighter surface.
- Active: compress back down.
- Focus: visible, elegant ring.

Secondary buttons should feel like glass controls:

- Translucent white background.
- Fine border and hover lift.
- No heavy gradient.

Ghost buttons should have clear hover and focus states without becoming noisy.

## Inputs

Inputs should feel enterprise-grade:

- Slightly translucent white surface.
- Refined border with clear focus state.
- Focus ring should be violet/indigo, soft, and accessible.
- Placeholder text should be calm and lower-contrast.
- Error states should be direct but not harsh.
- Textareas and upload controls should match the same surface language.

## Navigation

The sidebar and top bar should feel like part of the premium command center:

- Sidebar nav items should use glass hover states and a luminous active indicator.
- Active state should combine text color, subtle gradient wash, and fine inset border.
- Top bar should preserve clarity but feel more substantial: stronger glass, better border, controlled blur.
- Logo mark should move away from generic purple gradient into a more proprietary violet/indigo mark.

## Landing Pages

Landing pages should feel more cinematic and conversion-oriented while staying clean:

- Replace floating blobs with intentional background lighting fields.
- Use fewer but better gradients.
- Hero should have stronger typography and a more confident product promise.
- Feature cards should have meaningful depth and stronger information hierarchy.
- CTAs should clearly stand apart from secondary actions.
- Social proof pills and proof elements should look credible, not decorative.

## Dashboard And App Pages

App pages should feel analytical, premium, and precise:

- Dashboard cards should have deeper hierarchy between primary metrics, secondary modules, and list items.
- Wizard steps should feel like guided professional workflows, not form templates.
- Reports should feel like polished intelligence documents with crisp sections, score treatments, and analysis cards.
- Chat should feel like a premium AI workspace, with refined bubbles, input surface, and assistant cards.
- Loading and empty states should feel designed, not placeholder-like.

## Motion

Use subtle, consistent motion:

- Card hover: lift 1-3px with shadow change.
- Entrance: fade and small y movement.
- Buttons: short lift/compress interaction.
- Tabs and nav active indicators: smooth layout movement.
- Skeletons: understated shimmer.

Avoid constant ambient motion except where already clearly useful. Respect reduced motion.

## Implementation Strategy

Implementation should happen in layers:

1. Update global tokens in `app/globals.css`.
2. Upgrade global utility classes: cards, glass, buttons, nav, tabs, chips, skeletons, chat bubbles, app shell.
3. Update shared primitives such as `PremiumCard`, `PageShell`, `PageHeader`, auth inputs, logo, top bar, sidebar, and toast.
4. Sweep representative app surfaces: dashboard, analyses, reports, chat, wizards, hooks, brand, settings, onboarding, auth, landing pages, and deconstructor.
5. Replace hardcoded old accent colors and legacy gradient classes with token-based styles.
6. Verify linting and visually inspect the running app.

## Acceptance Criteria

- The app keeps the same functionality and navigation.
- Global visual tokens no longer feel like default AI SaaS purple.
- Cards, inputs, buttons, nav, tabs, loading states, and chat surfaces share one cohesive visual language.
- Landing and dashboard pages both feel premium, not like separate themes.
- Glassmorphism is tasteful, legible, and not futuristic-gaming styled.
- Motion is subtle and consistent.
- No known linter errors are introduced in edited files.

