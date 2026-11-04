# ADR 0004: Anti-AI-Slop Dark Mode Design System

## Status
Accepted

## Context
Crucible is a high-stakes developer tool used by engineering leaders and software candidates during 60-minute technical evaluations. Generic AI-generated templates (pastel gradients, floating bubbly cards, rounded-3xl pills, emojis in navigation, purple hero glows) erode user trust and reduce information density.

Requirements:
1. High information density, quiet aesthetic, high legibility.
2. Immediate technical utility over marketing decorations.
3. Strict adherence to Section 13 design tokens.
4. WCAG AA compliance with visible focus states and semantic HTML.

## Decision
We engineered a bespoke, dark-mode-first component system built with Tailwind CSS and Radix UI primitives.

### Strict Color Palette & Design Tokens:
- **Base Background:** `#1E2019` (Carbon Black) — low fatigue during hour-long sessions.
- **Surface / Card Background:** `#393E41` (Gunmetal) — subtle separation without glaring borders.
- **Primary Typography:** `#D3D0CB` (Dust Grey) — soft, high-contrast, non-glaring text.
- **Primary Accent:** `#E2C044` (Old Gold) — high-visibility deliberate highlights.
- **Secondary Accent:** `#587B7F` (Pine Blue) — timeline pins, secondary metadata.
- **Semantic Badges:**
  - Success / Pass: `#4E7A5A` (Muted Forest)
  - Danger / Fail: `#A84B4B` (Muted Crimson)
  - Warning / Alert: `#C48B3F` (Muted Amber)

### Layout & Sizing Rules:
- **Spacing:** Strict 4px base scale (`gap-1` = 4px, `gap-2` = 8px, `gap-3` = 12px, `gap-4` = 16px).
- **Corner Radii:** Strict `rounded-control` (6px) for inputs/buttons, `rounded-panel` (10px) for modals and panels.
- **Typography:** Inter for prose, JetBrains Mono for code, timestamps, and test inputs.
- **No Floating AI Gimmicks:** Zero floating sparkles, gradient text, or decorative emojis.

## Consequences
- Every view is crisp, professional, and visually coherent across room, dashboard, and review replay.
- Accessible focus rings (`focus-visible:ring-1 focus-visible:ring-accent`) provide full keyboard navigability.

