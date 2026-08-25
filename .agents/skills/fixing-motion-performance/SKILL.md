---
name: fixing-motion-performance
description: >-
  Animation and motion performance guidelines from ibelick/ui-skills.
  Use when designing or debugging CSS transitions, FLIP animations, Framer Motion (motion/react),
  and 60fps GPU-accelerated UI interactions.
---

# Motion & Animation Performance

Guidelines for 60fps smooth UI animations and fluid micro-interactions.

## Rules
1. **Composited Properties Only**: Only animate `transform` (`translate`, `scale`, `rotate`) and `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`, or `padding`.
2. **Hardware Acceleration**: Use `will-change: transform` or `transform: translateZ(0)` sparingly on animating layers to trigger GPU acceleration.
3. **Interruptible Transitions**: Ensure animations smoothly transition when interrupted by user clicks or gestures.
4. **Spring Physics**: Use natural spring curves (`stiffness: 300, damping: 30` or `cubic-bezier(0.2, 0, 0, 1)`) for UI feedback rather than linear timing.
