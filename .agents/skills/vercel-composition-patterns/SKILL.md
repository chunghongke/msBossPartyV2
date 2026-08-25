---
name: vercel-composition-patterns
description: >-
  React composition patterns that scale from Vercel Engineering.
  Use when designing flexible component APIs, refactoring components with boolean prop proliferation,
  building compound components, context providers, or scalable component libraries.
---

# React Composition Patterns

Composition patterns for building flexible, maintainable, and scalable React components. Avoid boolean prop proliferation by using compound components, lifting state, and composing internals.

## Rule Categories by Priority

| Priority | Category | Impact | Description |
|:---|:---|:---|:---|
| 1 | Component Architecture | HIGH | Compound components over boolean flags |
| 2 | State Management | MEDIUM | Lifting state into providers; avoiding prop drilling |
| 3 | Implementation Patterns | MEDIUM | `children` over render props; explicit variants |
| 4 | React 19 APIs | MEDIUM | Modern hook patterns (`use()` context API) |

---

## 1. Avoid Boolean Prop Proliferation
- **Problem**: Adding props like `isLoading`, `isCompact`, `withHeader`, `showFooter`, `hasBadge` leads to rigid, unmaintainable mega-components.
- **Solution**: Compose subcomponents instead:
  ```tsx
  // ❌ Anti-pattern (Rigid mega-component)
  <PlayerCard name="Rumi" isPrimary isCollapsed showProgress withAvatar />

  // ✅ Good (Compound composition)
  <PlayerCard value={player}>
    <PlayerCard.Header>
      <PlayerCard.Avatar />
      <PlayerCard.Title />
      <PlayerCard.Badges />
    </PlayerCard.Header>
    <PlayerCard.Content>
      <CharacterList />
    </PlayerCard.Content>
  </PlayerCard>
  ```

---

## 2. Compound Components Pattern
- Expose sub-components attached to the parent namespace or exported together.
- Share implicit state (e.g. `isCollapsed`, `onToggle`) via a dedicated lightweight React Context.
- Let consumers reorder, omit, or wrap sub-elements without rewriting internal component logic.

---

## 3. Explicit Variants over Complex Prop Logic
- Create distinct, dedicated variant components (e.g. `PrimaryPlayerCard`, `GuestCard`, `BossCellCompact`) rather than one component with dozens of `if-else` branches.
- Keep shared behavior in a custom hook (e.g. `usePlayerCardLogic`).

---

## 4. Flexible Slot & Children Composition
- Prefer `children` or named slots (`leading`, `trailing`, `header`, `footer`) over complex callback render props.
- Keep components open for extension by passing standard HTML element props (`...props`) to the root container.
