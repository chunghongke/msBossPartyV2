---
name: tailwind-design-system
description: >-
  Expert guide for constructing modern, accessible, and themeable Design Systems using Tailwind CSS,
  Radix UI / shadcn patterns, CSS Variables, and polished micro-interactions for React web apps.
---

# Tailwind Design System & UI Architecture

## 1. CSS Variables & Theme Architecture
Define semantic color tokens in `index.css` / `tailwind.config.js`:
- `bg-surface` / `bg-canvas` / `bg-subtle`
- `border-default` / `border-highlight` / `border-accent`
- `text-primary` / `text-muted` / `text-accent`

## 2. Component Design Principles (shadcn/ui style)
- Composable, unstyled primitive foundation (Radix UI) + Tailwind utility classes
- Full keyboard navigation and accessible ARIA attributes
- Smooth dark mode transition with zero-FOUC (Flash of Unstyled Content)

## 3. Gaming & Dashboard Visual Elements
- Frosted glass cards: `backdrop-blur-md bg-slate-900/80 border border-slate-800/80`
- Glowing active rings: `ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20`
- Pill badges & status indicators with high contrast and legible typography
