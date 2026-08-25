---
name: vercel-react-best-practices
description: >-
  React performance optimization and architectural guidelines from Vercel Engineering.
  Use when writing, reviewing, or refactoring React components, state management, hooks, data fetching,
  bundle optimization, or re-render prevention.
---

# Vercel React Best Practices

Comprehensive React performance optimization guide maintained by Vercel Engineering. Prioritized by impact to guide clean, fast, and scalable React application design.

## Rule Categories by Priority

| Priority | Category | Impact | Description |
|:---|:---|:---|:---|
| 1 | Eliminating Waterfalls | CRITICAL | Prevent blocking async cascades with parallel execution |
| 2 | Bundle Size Optimization | CRITICAL | Avoid heavy dependencies, barrel imports, and bloat |
| 3 | Client Data Fetching & Sync | HIGH | Optimistic updates, deduplication, caching |
| 4 | Re-render Optimization | HIGH | Stable callbacks, primitive state slices, avoiding unnecessary context re-renders |
| 5 | Rendering Performance | MEDIUM | Virtualization, deferred state transitions (`useDeferredValue`), lightweight DOM trees |
| 6 | JavaScript Execution Performance | MEDIUM | Map/Set lookups, memoized complex computations (`useMemo`), avoiding inline function creation in tight loops |

---

## 1. Eliminating Waterfalls & Async Patterns
- **Parallelize independent requests**: Use `Promise.all()` / `Promise.allSettled()` instead of sequential `await`.
- **Early Fetch, Late Await**: Start async calls as early as possible in lifecycle/effects.
- **Optimistic UI with Fallback**: Apply local UI updates immediately; roll back gracefully on error.

---

## 2. Component Architecture & Re-render Optimization
- **State Colocation**: Keep state as close as possible to the components that actually use it. Avoid lifting state to top-level if only a leaf node needs it.
- **Context Splitting**: Split high-frequency state (e.g. active item, drag position) from low-frequency state (e.g. auth user, theme) into separate Contexts.
- **Stable Callback References**: Use `useCallback` for functions passed down to memoized child components or used as effect dependencies.
- **Composition over Prop Drilling**: Pass child JSX elements (`children`) to avoid intermediate wrapper re-renders.

---

## 3. Bundle & Dependency Best Practices
- **Direct Modular Imports**: Import directly from subpaths (e.g. `lucide-react/dist/esm/icons/...` or clean tree-shakeable packages) rather than huge barrel files.
- **Code-Splitting via Dynamic Imports**: Lazy-load heavy modals, audio decoders, and admin settings with `React.lazy()` and `Suspense`.

---

## 4. Modern React Hooks Best Practices
- **`useMemo` for Expensive Calculations**: Memoize heavy aggregation, sorting, and pricing arithmetic.
- **Cleanup in `useEffect`**: Always return cleanup handlers for event listeners, timers, and Web Audio contexts to prevent memory leaks.
- **Custom Hook Encapsulation**: Encapsulate reusable domain logic (e.g. `useWeeklyReset`, `useCalculator`, `useDragOrder`) in clean, testable hooks.
