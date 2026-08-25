---
name: web-design-guidelines
description: >-
  Comprehensive UI/UX and Web Interface Guidelines from Vercel.
  Use when writing, auditing, or reviewing UI code for accessibility (ARIA/Keyboard), focus states,
  form ergonomics, smooth animations, typography, dark mode, responsive layouts, and performance.
---

# Web Interface Guidelines

Official Vercel Web Interface Guidelines for auditing and building polished, accessible, and high-performance user interfaces.

## 1. Accessibility (a11y)
- **Buttons vs Links**: `<button>` for actions, `<a>`/`<Link>` for navigation (never `<div onClick>`).
- **Icon-only Buttons**: Always provide `aria-label` or visually hidden text.
- **Form Controls**: Every input must have an associated `<label>` (via `htmlFor`) or `aria-label`.
- **Keyboard Navigation**: Interactive elements must support `Enter` / `Space` / `Escape` key handlers.
- **Live Regions**: Asynchronous updates (toast messages, badges) require `aria-live="polite"`.

## 2. Focus States & Interaction
- **Visible Focus**: Interactive elements require clear focus indicators (e.g. `focus-visible:ring-2 focus-visible:ring-amber-500`).
- **Never Bare `outline-none`**: Do not strip outlines without providing `focus-visible` ring replacements.
- **Compound Controls**: Use `:focus-within` on containers with inputs and action buttons.

## 3. Form Ergonomics
- **No Blocking Paste**: Never prevent paste events on password/token/config inputs.
- **Input Types**: Use correct `type` (`number`, `text`, `password`) and `inputMode`.
- **Field Errors**: Render inline error messages next to the input and shift focus on submit.
- **Submit Feedback**: Disable submit button during active network requests and show a loading spinner.

## 4. Animation & Motion
- **Reduced Motion**: Respect `prefers-reduced-motion: reduce`.
- **Compositor Only**: Animate `transform` and `opacity` only (avoid animating `height`/`width`/`top`/`margin` directly).
- **Explicit Transitions**: Avoid `transition: all`; declare exact properties (e.g. `transition: transform 0.2s ease, opacity 0.2s ease`).

## 5. Typography & Numbers
- **Tabular Numbers**: Use `font-variant-numeric: tabular-nums` (or `font-mono` / `tabular-nums`) for currency, timers, and crystal math comparisons.
- **Truncation & Overflow**: Flex children require `min-w-0` to properly allow `truncate` without breaking layouts.
- **Ellipsis**: Use proper unicode ellipsis `…` for loading and placeholder states.

## 6. Layout & Images
- **Explicit Dimensions**: Provide `width` and `height` (or aspect ratio) on `<img>` tags to eliminate Cumulative Layout Shift (CLS).
- **Empty States**: Always gracefully render empty states (e.g. no characters yet, empty boss list).
