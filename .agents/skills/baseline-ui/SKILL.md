---
name: baseline-ui
description: >-
  Design engineering standards from ibelick/ui-skills to eliminate UI slop.
  Enforces strict spacing, visual hierarchy, typography, accessible primitives (Radix/Base UI),
  motion/react animations, and polished micro-interactions.
---

# Baseline UI (Design Engineering Standards)

Enforces opinionated UI baseline constraints to prevent AI-generated interface slop and ensure premium design engineering quality.

## 1. Stack & Utilities
- **Tailwind CSS**: Use consistent spacing tokens (`gap-2`, `gap-3`, `gap-4`, `p-4`, `p-6`) and standard design tokens.
- **Class Merging**: MUST use `cn()` utility (`clsx` + `tailwind-merge`) for dynamic and variant class logic.
- **Animations**: Prefer `motion/react` (Framer Motion) or `tailwindcss-animate` for entrance and interaction effects.

## 2. Component Primitives
- **Accessible Primitives**: Use Radix UI / Base UI for dropdowns, tooltips, dialogs, popovers, and accordions.
- **Icon Buttons**: Always include `aria-label` on icon-only interactive elements.
- **No Reinventing Primitives**: Do not hand-roll complex focus trap or keyboard navigation when primitives exist.

## 3. Visual Hierarchy & Spacing
- **Typography Contrast**: Establish clear font weight (`font-semibold`, `font-medium`, `font-normal`) and color hierarchy (`text-slate-100`, `text-slate-400`, `text-slate-500`).
- **No Layout Clutter**: Keep padding generous and consistent; avoid cramming elements without proper breathing room.
- **Interactive Feedback**: All clickable elements must have distinct `:hover`, `:active`, and `:focus-visible` states.
