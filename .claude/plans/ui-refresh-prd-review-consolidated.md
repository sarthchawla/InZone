# PRD v1.0 Consolidated Review — All 4 Agents

**Date:** 2026-02-22
**Agents:** Architecture, Testing, UX/Design, PM/Completeness

---

## Critical Findings (Must Fix Before Starting)

### 1. No Token Migration Mapping (PM, Architecture)
The codebase uses `--surface-0`, `--accent`, `--text-primary` etc. The PRD defines `--background`, `--primary`, `--foreground`. **No mapping table exists.** A developer cannot start Phase 2 without knowing old `--surface-0` = new `--background`, old `--accent` = new `--primary`.

**Also:** Hundreds of hardcoded Tailwind classes (`bg-stone-100`, `text-gray-700`, `border-stone-200`) need a migration strategy. If left as-is, dark mode breaks on those elements.

### 2. `accent` Token Semantic Collision (Architecture)
Current `bg-accent` = indigo primary buttons (`#6366f1`). PRD redefines `--accent` to mean `primary-50` (very light teal). Every `bg-accent` button becomes nearly invisible. All current `bg-accent` usages must map to `bg-primary` in the new system.

### 3. PostCSS Pipeline Not Addressed in Tailwind v4 Migration (Architecture)
The PRD mentions adding `@tailwindcss/vite` and deleting `tailwind.config.ts` but doesn't address:
- `postcss.config.js` must be removed
- `autoprefixer` devDep must be removed (built into TW v4)
- `tailwindcss` devDep must be replaced with `@tailwindcss/vite`
- Config file is actually `.js`, not `.ts`

### 4. Custom Animations Not Addressed in Migration (Architecture)
- `tailwind.config.js` defines custom animations (`slide-in`, `slide-in-right`, `slide-up`, `fade-in`, `countdown`) referenced as `animate-*` classes
- `index.css` has ~200 lines of custom CSS (DnD transitions, keyframes, Tiptap styles) that must be preserved
- None of this is mentioned in the migration plan

### 5. Phase 2/3 Circular Dependency (PM)
Phase 2 (apply tokens) requires components. Phase 3 (migrate to shadcn) changes components. Working on either without the other causes double-work. Merge or resequence.

### 6. No Rollback Plan (PM)
If the refresh breaks mid-implementation or post-ship, there is no revert strategy. Need phase-level PR strategy, optional feature flags, and token aliasing approach.

### 7. No Error Handling Patterns Section (PM)
Global API failures, network errors, 404 pages, inline form errors, error vs empty distinction — none specified for the new design system.

---

## Major Findings

### Design/UX Issues

| # | Finding | Agent |
|---|---------|-------|
| 8 | **neutral-500 (#64766e) fails WCAG AA** on white (~3.9:1, needs 4.5:1). Darken to ~`#576861` or use neutral-600 for muted text. | UX |
| 9 | **Card/border contrast too low in dark mode.** `--border` (neutral-800) on `--card` (neutral-900) is ~1.4:1. Borders will be invisible. Use neutral-700 for borders or rely on shadows. | UX |
| 10 | **Dark mode code blocks blend into dark cards.** Tiptap code block bg (`#1f2937`) on card bg (`#172524`) has almost no contrast. Lighten to neutral-800 or add border. | UX |
| 11 | **Priority bar colors may "glow" on dark backgrounds.** Saturated colors look different on dark vs light. Consider 400-level variants in dark mode. | UX |
| 12 | **Bento grid over-designed for Settings.** Settings is a linear read-edit-save task. Bento creates awkward height mismatches. Keep single-column with selective two-column sections. | UX |
| 13 | **Full-bleed auth feels empty on ultrawide screens.** 380px form on 2560px screen = too much emptiness. Add subtle visual anchoring or constrain background gradient. | UX |
| 14 | **Board list "featured board" has no logic defined.** The bento layout shows a large featured card but no selection criteria. | PM, UX |
| 15 | **Background grain/noise texture is "AI slop" signal.** Remove from PRD entirely. | UX |

### Architecture Issues

| # | Finding | Agent |
|---|---------|-------|
| 16 | **BoardView.tsx at 637/700 lines.** Adding toolbar/filters pushes it over the arch test limit. Must pre-extract `BoardToolbar`, `useBoardFilters`, `useColumnCollapse` before adding features. | Architecture |
| 17 | **shadcn Button variant API mismatch.** Current `variant="primary"` must become `variant="default"`. Current `variant="danger"` → `variant="destructive"`. No mapping table in PRD. | Architecture |
| 18 | **`tailwind-merge` may not recognize custom tokens.** Verify `cn('bg-primary-600', 'bg-primary-400')` resolves correctly with new `@theme` tokens. | Architecture |
| 19 | **ThemeProvider position in provider tree unspecified.** Should be outermost (before QueryClientProvider). | Architecture |
| 20 | **CommandPalette and Breadcrumbs have no folder.** Create `src/components/app/` for app-shell feature components. | Architecture |
| 21 | **Font loading: 3x payload increase** (~80KB Inter → ~250KB Satoshi + General Sans + JetBrains Mono). Self-host and subset to Latin. Use `font-display: optional` for body font. | Architecture, UX |

### Testing Issues

| # | Finding | Agent |
|---|---------|-------|
| 22 | **17 test files PRD missed** that need updates: `ResetPasswordPage.test.tsx`, `RequestAccessPage.test.tsx`, `BottomSheet.test.tsx`, `UndoToast.test.tsx`, `ContextMenu.test.tsx`, `DetailPanel.test.tsx`, `RichTextEditor.test.tsx`, `Badge.test.tsx`, `ProgressBar.test.tsx`, `LabelManager.test.tsx`, + 7 more. | Testing |
| 23 | **shadcn naming CONFIRMED to break arch tests.** Regex `^[A-Z][a-zA-Z]+` fails for `button.tsx`, `dropdown-menu.tsx`. Hyphenated names fail on two counts. | Testing |
| 24 | **3 BDD component tests not mentioned** (`BoardList.bdd.test.tsx`, `BoardColumn.bdd.test.tsx`, `KeyboardShortcutsHelp.bdd.test.tsx`). | Testing |
| 25 | **12 BDD feature files not listed for updates** (column CRUD, todo CRUD, labels, search). | Testing |
| 26 | **6 missing BDD page objects** (settings, admin, request-access, reset-password, command-palette, todo-modal rework). | Testing |
| 27 | **Hardcoded CSS selectors in page objects** (`.animate-spin`, `.bg-red-50`) will break with design changes. | Testing |
| 28 | **Branches threshold is 75%, not 80%.** PRD overstates the coverage requirement. | Testing |
| 29 | **ToastProvider in test wrapper** means sonner migration affects every test file, not just toast tests. | Testing |
| 30 | **Coverage exclusion: `App.tsx` is excluded** from coverage. ThemeProvider changes there won't affect coverage metrics. | Testing |
| 31 | **ThemeToggle in `src/components/ui/` + `useTheme` hook = arch test violation** (UI components cannot import hooks). Place toggle in `src/components/app/` or export `useTheme` from context directly. | Testing |

### PM/Completeness Issues

| # | Finding | Agent |
|---|---------|-------|
| 32 | **Tiptap editor theming completely absent.** 90+ lines of Tiptap CSS not mentioned anywhere in PRD. Will break in dark mode. | PM |
| 33 | **Toast migration unspecified.** No visual spec, no position, no UndoToast fate, no sonner config details. | PM |
| 34 | **data-testid preservation not mandated.** Should be a P0 rule: all existing `data-testid` attrs must be preserved. | PM |
| 35 | **Phase 4 overloaded** with 8 features. Split into 4a (board UX) and 4b (app UX). | PM |
| 36 | **P0 criterion "zero regressions" is untestable.** Replace with specific smoke test checklist. | PM |
| 37 | **DetailPanel has no standalone spec.** It's ~250 lines with forms, rich text, label chips, column dropdown — needs its own subsection. | PM |
| 38 | **P2 "column collapse animation" overlaps P1 "collapsible columns."** Merge into P1 — shipping collapse without animation is worse than not shipping it. | PM |

---

## Open Questions — Answered

### Q1: Self-host fonts or CDN?
**Answer: Self-host.** Fontshare CDN is less battle-tested than Google Fonts, adds external dependency, and creates a single point of failure. Self-host via WOFF2 files in the build. Subset to Latin characters to reduce payload (~40-50KB per font instead of 100KB). Use `font-display: swap` for display (Satoshi), `font-display: optional` for body (General Sans) to prevent layout shift.

### Q2: Command palette — local or backend search?
**Answer: Client-side only for v1.** The command palette (P2) should search loaded navigation data (boards, recent items, settings) and provide quick actions (create board, toggle theme). Backend search across all tasks would require a new API endpoint, which is explicitly out of scope. Document as a future enhancement.

### Q3: Filter state in URL query params?
**Answer: No, not for v1.** Use a `useBoardFilters` hook with local state. URL params add complexity to routing, bookmark handling, and the back button. Note as a future enhancement for shareable filtered views.

### Q4: Collapsed column state — server sync or device-local?
**Answer: Device-local only.** Store in localStorage keyed by board ID (`inzone-board-{boardId}-collapsed-columns`). Server sync requires a new API endpoint (out of scope). Users rarely switch devices mid-task for a kanban board.

### Q5: shadcn file naming convention?
**Answer: Option 2 — add exception for `src/components/ui/`.** Update the naming arch test regex to allow lowercase with hyphens for UI component files:
```ts
/^[A-Z][a-zA-Z]+(\.(test|spec))?\.tsx$|^[a-z][a-z-]+\.tsx$|^index\.ts$/
```
This matches shadcn's well-known convention and avoids fighting it on every install.

### Q6: BoardView extraction pre-planning?
**Answer: Yes, mandatory before Phase 4.** BoardView.tsx is already at 637/700 lines. Extract before adding features:
- `BoardToolbar.tsx` → `src/components/board/BoardToolbar.tsx`
- `BoardHeader.tsx` → `src/components/board/BoardHeader.tsx` (existing header block, lines 319-396)
- `useBoardFilters.ts` → `src/hooks/useBoardFilters.ts`
- `useColumnCollapse.ts` → `src/hooks/useColumnCollapse.ts`
- `useCardDensity.ts` → `src/hooks/useCardDensity.ts`

### Additional Questions Surfaced by Review

### Q7: What happens to existing ToastContext?
**Answer:** Replace entirely with sonner. Create a thin `useToast` compatibility wrapper that calls `toast()` from sonner with the same API signature. This minimizes migration across callsites. The `UndoToast` becomes a custom sonner toast with action button — sonner supports this natively.

### Q8: How are existing CSS animations handled?
**Answer:** Keep all existing CSS animations in `index.css`. They use `data-testid` selectors and keyframes that are independent of Tailwind. Update any token references (`--accent` → `--primary`, `--surface-3` → `--border`) but don't migrate to Framer Motion — the CSS approach is more performant for these cases.

### Q9: Token migration strategy?
**Answer:** Phase 1 creates new tokens AND creates aliases from old names to new values. This means the entire app shifts appearance in one step without touching component files. Phase 2-3 then updates component files to use new token names directly, removing aliases afterward. This prevents the "half old, half new" visual state.

### Q10: Hardcoded Tailwind color strategy?
**Answer:** Replace ALL hardcoded stone/gray classes with semantic tokens during Phase 2. This is the only way dark mode works correctly. Use a codemod or find-and-replace pass:
- `stone-50/100` → `bg-secondary` or `bg-muted`
- `stone-200` → `border`
- `stone-500/600/700` → `text-muted-foreground` / `text-secondary-foreground`
- `stone-900` → `text-foreground`
- `gray-*` classes → same mapping (the codebase mixes stone and gray inconsistently)

---

## Revised Phase Plan (Based on Review)

**Phase 1: Foundation** (unchanged but expanded)
- Tailwind v4 migration (including PostCSS removal, config porting)
- Font installation (self-hosted WOFF2)
- ThemeProvider + FOUC prevention
- shadcn/ui foundation setup + `components.json`
- Token aliasing (old names → new values)
- Arch test updates (naming exception, ThemeToggle placement)

**Phase 2a: Design System — Light Mode**
- Apply new tokens to all pages (using find-and-replace pass)
- Update typography
- Update spacing, border radius, shadows
- Tiptap editor theme update
- data-testid preservation check

**Phase 2b: Design System — Dark Mode**
- Dark mode token values
- Dark mode testing for all pages
- Code block contrast fix
- Priority color dark variants
- Border visibility fix

**Phase 3: Component Migration**
- shadcn Button, Input, Card, Dialog, DropdownMenu migration (with variant mapping)
- Toast → sonner migration (with useToast wrapper)
- Confirm dialog component (replace window.confirm)
- Update barrel exports incrementally
- Test updates for each migrated component

**Phase 4a: Board UX**
- Extract BoardToolbar, BoardHeader from BoardView
- Extract useBoardFilters, useColumnCollapse, useCardDensity hooks
- Board header toolbar (search + filters)
- Collapsible columns with animation
- Card density toggle

**Phase 4b: App-wide UX**
- Theme toggle (animated sun/moon)
- Breadcrumbs
- Skeleton loading states
- Improved empty states
- Error boundary component

**Phase 5: Polish + P2**
- Command palette (Cmd+K)
- Animation refinement
- Accessibility audit
- Cross-browser/device testing
- Performance audit (CLS, LCP, bundle size)

---

## Summary Scorecard

| Area | Rating |
|------|--------|
| Color palette | Needs Work (neutral-500 contrast, accent collision) |
| Typography | Strong (minor line-height note for 4xl/5xl) |
| Visual hierarchy | Adequate (needs text color usage table) |
| Dark mode | Needs Work (border contrast, code blocks, priority colors) |
| Animations | Strong (keep CSS button press, simplify theme toggle) |
| Layout | Adequate (reconsider bento for settings, fix auth large-screen) |
| Component design | Needs Work (missing confirm dialog, undo, error boundary, toast spec) |
| Mobile UX | Adequate (specify hamburger menu, add swipe gestures P2) |
| Accessibility | Needs Work (board keyboard nav, focus management, DnD announcements) |
| Anti-patterns | Adequate (remove grain texture, simplify theme toggle) |
| Testing strategy | Needs Work (17 missed test files, naming conflict, coverage threshold) |
| Architecture | Needs Work (token collision, PostCSS, BoardView extraction) |
| PM completeness | Needs Work (5 blockers, rollback plan, phase dependencies) |

**Verdict:** Strong PRD with the right design direction. Needs a v1.1 addressing the critical findings before implementation starts. The biggest gaps are: token migration strategy, Tiptap theming, rollback plan, and phase dependency resolution.
