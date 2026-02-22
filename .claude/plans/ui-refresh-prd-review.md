# UI Refresh PRD v1.0 -- Product Manager Review

**Reviewer:** PM Review (Claude)
**Date:** 2026-02-22
**PRD Version:** 1.0
**Overall Assessment:** Strong foundation with notable gaps that would cause implementer confusion and scope ambiguity. Recommend a v1.1 revision before development begins.

---

## Severity Legend

- **BLOCKER** -- Must fix before development starts. Will cause rework or incorrect implementation.
- **HIGH** -- Should fix before development starts. Likely to cause delays or misalignment.
- **MEDIUM** -- Fix during Phase 1. Creates ambiguity but workaround exists.
- **LOW** -- Can be addressed during implementation. Nice-to-have clarification.

---

## 1. Completeness Review

### 1.1 Pages Accounted For

| Page | In PRD? | Notes |
|------|---------|-------|
| LoginPage | Yes (6.1) | Covered well |
| SignUpPage | Yes (6.1) | Covered well |
| ResetPasswordPage | Yes (6.1) | Covered well |
| RequestAccessPage | Yes (6.1) | Covered well |
| BoardList | Yes (6.3) | Covered well |
| BoardView | Yes (6.4) | Covered well |
| DetailPanel | Partial | **MEDIUM** -- Mentioned as "side panel" in 6.4 but no standalone spec. DetailPanel.tsx is a significant component (~250 lines) with its own layout, form inputs, label chips, rich text editor, column move dropdown, delete action, and close animation. Needs its own subsection. |
| SettingsPage | Yes (6.5) | Covered well |
| InvitesPage | Yes (6.6) | Covered |
| RequestsPage | Yes (6.6) | Covered |
| UsersPage | Yes (6.6) | Covered |
| AuthErrorRedirect | No | **LOW** -- Not a visual page, just a redirect. No action needed. |

### 1.2 Missing Flows & States

| Gap | Severity | Details |
|-----|----------|---------|
| **Error states for API failures** | **BLOCKER** | The PRD specifies error messages with "danger color + icon" for auth forms (6.1) but does NOT specify: (a) global API error handling UX (network down, 500 errors), (b) error state for board loading failures (BoardList already has one -- does it get restyled?), (c) error state for DetailPanel save failures, (d) toast vs inline error decision matrix. Currently the codebase uses a mix of inline errors and toast notifications. The PRD needs a clear "error handling patterns" section. |
| **Loading states beyond skeleton** | **HIGH** | Section 5.2 mentions skeleton states for "board list, board view, admin tables, settings" but the current codebase has: a spinner for invite token validation (SignUpPage line 143-157), inline "Signing in..." button text, and loading spinners in auth pages. The PRD should specify whether ALL loading states become skeletons or if button loading text remains. |
| **404 / Not Found page** | **HIGH** | No 404 page specification. Currently `BoardView` has a "Board not found" state but there is no global 404 route. A wildcard catch-all route shows the app shell with no content. With the refresh, what does a missing route look like? |
| **Empty board view (no columns)** | **LOW** | Already handled in `BoardView.tsx` (lines 412-423) with a decent empty state. PRD Section 5.2 mentions "Empty column" but not "Empty board." However, the existing implementation is close to what the PRD wants. Just needs restyling confirmation. |
| **OAuth flow visual updates** | **MEDIUM** | PRD mentions "Google OAuth button: outlined, neutral border, Google icon" but does not address: (a) the redirect waiting state (user clicks Google, gets redirected, comes back), (b) the `/api/auth/error` redirect screen, (c) the "no access" warning on RequestAccessPage when redirected from OAuth failure. The current `fromOAuth` banner (RequestAccessPage line 74-81) needs explicit treatment. |
| **Toast notification design in both themes** | **HIGH** | Section 10.1 says "Migrate Toast to sonner" and the animation catalog (7.2) mentions toast animation. But there is NO visual spec for toasts: (a) what do success/error/info/warning toasts look like? (b) Where do they appear (top-right? bottom-right?)? (c) Do they auto-dismiss? (d) The current `ToastContext.tsx` has custom toast logic -- does it get replaced entirely or wrapped? (e) `UndoToast.tsx` is a separate component -- does it also migrate to sonner? |
| **Form validation visual patterns** | **MEDIUM** | Auth pages have inline validation (password strength checkers, "passwords do not match" text). The PRD says "Error messages: inline below field with danger color + icon" (6.1) but does not define: (a) the visual pattern for real-time validation feedback (green checkmarks vs red x), (b) whether password strength indicators remain as checklist or become the "horizontal bar that fills with color gradient" described for SignUpPage, (c) should ResetPasswordPage also get the gradient bar? Currently both pages use identical checklist UIs. |
| **Loading/disabled button states** | **MEDIUM** | PRD specifies "Button press: Scale(0.97)" animation but says nothing about: (a) disabled button styling (opacity? color shift?), (b) loading button state (spinner inside? text change?), (c) the current implementation uses text changes like "Signing in..." / "Creating..." -- keep or replace with spinner? |
| **Keyboard shortcut help dialog** | **LOW** | `KeyboardShortcutsHelp.tsx` exists as a modal. PRD mentions KeyboardShortcutsHelp in component migration (10.3) but provides no visual spec. Will it become a shadcn Dialog? What does it look like in dark mode? |
| **Rich text editor (Tiptap) theming** | **HIGH** | `index.css` has 90+ lines of Tiptap-specific styles (lines 44-191) using current design tokens (`--surface-2`, `--surface-3`, `--text-secondary`, `--text-tertiary`, `--accent`). The PRD does NOT mention Tiptap at all. These styles will break when tokens change. The dark mode treatment for code blocks, blockquotes, highlights, and task list checkboxes needs explicit specification. |
| **BottomSheet component** | **LOW** | `BottomSheet.tsx` exists in UI components. PRD mentions "Modals -> Bottom sheets" on mobile (8.2) but does not specify whether the existing BottomSheet component is kept or replaced by shadcn Dialog with a mobile variant. |
| **Confirm dialogs** | **MEDIUM** | `UsersPage.tsx` line 79 uses `window.confirm()` for destructive actions. The PRD mentions shadcn Dialog but does not specify whether native confirms get replaced with styled confirm dialogs. They should. |

---

## 2. Clarity for Implementers

### 2.1 Where a Developer Would Get Stuck

| Issue | Severity | Details |
|-------|----------|---------|
| **Current token names vs new token names** | **BLOCKER** | The codebase currently uses `--surface-0`, `--surface-1`, `--surface-2`, `--surface-3`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--accent`, `--accent-hover`, `--accent-light`, `--accent-muted`. The PRD defines completely new tokens (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, etc.). There is NO migration mapping table. A developer needs to know: old `--surface-0` = new `--background`, old `--accent` = new `--primary`, etc. Without this, every file touch becomes a guessing game. |
| **Tailwind class migration** | **HIGH** | Current code uses hardcoded Tailwind color classes like `bg-stone-100`, `text-stone-700`, `border-stone-200`, `text-gray-700`, `bg-purple-100`, `text-green-600`, etc. The PRD talks about semantic tokens but never addresses: should ALL hardcoded stone/gray classes be replaced with semantic tokens? What about purple admin badges -- do those use a new semantic token? The mix of stone + gray classes in the current code (App.tsx uses both `text-stone-700` and `text-gray-700`) is already inconsistent. |
| **shadcn component API differences** | **HIGH** | Current `Button` has variants: `primary`, `ghost`, `danger` with sizes `sm`, default. shadcn Button has variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. The PRD does not provide a mapping. Current `Modal` has `isOpen`/`onClose` props; shadcn `Dialog` uses compound components (`Dialog`, `DialogTrigger`, `DialogContent`). A migration guide per component is needed. |
| **File naming decision unresolved** | **MEDIUM** | Open question #5 (shadcn lowercase vs PascalCase) is flagged but not decided. This blocks Phase 1. A developer cannot set up shadcn without knowing whether to rename files. The recommendation (Option 2) is given but not confirmed. |
| **Framer Motion already in use** | **LOW** | PRD references "Motion" throughout but the codebase already uses `framer-motion` extensively. Good -- no library change needed. But the PRD should explicitly note this is an enhancement of existing usage, not a new dependency. |
| **Where does UserMenu live post-refresh?** | **MEDIUM** | `UserMenu` is currently defined inline in `App.tsx` (lines 32-122). The PRD says "User Menu redesign" (6.2) with shadcn DropdownMenu. Should UserMenu be extracted to its own component file? The PRD implies it but does not state it. Given the 700-line architecture limit, this should be explicit. |
| **Data-testid preservation** | **HIGH** | The codebase relies heavily on `data-testid` attributes for both unit and BDD tests. The PRD's testing section (12.2) mentions "Update selectors if markup changes" but does not set a hard rule: "ALL existing data-testid attributes MUST be preserved." This should be a P0 requirement. Without it, test migration becomes a moving target. |

### 2.2 Ambiguous Specifications

| Spec | Severity | Issue |
|------|----------|-------|
| "Full-bleed minimal" auth layout (6.1) | **MEDIUM** | Says "No card container" but current LoginPage HAS a card (`bg-white shadow rounded-lg p-8`). Does "no card container" mean remove the white box entirely? Float form elements directly on the background? This is a significant visual change that needs a mockup or more precise description. What happens to the divider line and the "Don't have an account?" section without a card boundary? |
| Bento grid "Featured/Recent Board" (6.3) | **MEDIUM** | The ASCII diagram shows a "Featured/Recent Board" card that spans 2 rows. How is "featured" determined? Most recent? Most used? User-pinned? This feature does not exist in the current codebase. Is this a P0 or P1 item? It is listed under Section 6 (page specs) but not in acceptance criteria. |
| "Subtle background grain/noise texture" (P2) | **LOW** | Mentioned in acceptance criteria but nowhere else in the document. How would this be implemented? CSS background image? SVG? Needs at least a technical note. |
| Column width: 280px vs current | **LOW** | PRD specifies "Fixed-width columns (280px)" for desktop. Current code uses `w-72` (288px) and `min-w-72`. Close but different. Should this be exactly 280px or can it remain 288px? |

---

## 3. Acceptance Criteria Quality

### 3.1 P0 Criteria Assessment

| Criterion | Testable? | Specific? | Issues |
|-----------|-----------|-----------|--------|
| "Complete color palette swap (indigo -> teal) across all pages" | Partially | No | **HIGH** -- "All pages" is vague. Need a checklist of specific pages. Also, current accent is `#6366f1` (indigo) but there are also purple admin badges, green success states, amber warnings. "Complete color palette swap" could be misinterpreted as changing ALL colors. Should say "primary/accent color swap." |
| "Satoshi + General Sans typography applied" | Yes | Yes | Clear. |
| "Dark mode working with system auto-detection" | Yes | Partially | **MEDIUM** -- "Working" is vague. What constitutes "working"? All pages render without visual bugs? All text is readable? Add: "All pages render correctly in both themes with no hardcoded light-only colors." |
| "Theme toggle in header with animation" | Yes | Yes | Clear. |
| "Theme persisted in localStorage" | Yes | Yes | Clear. |
| "No FOUC on page load" | Yes | Partially | **MEDIUM** -- How to test? "Page loads without visible flash of wrong theme for > 1 frame" -- need to define the test method (manual? automated visual regression?). |
| "All existing functionality preserved (zero regressions)" | No | No | **HIGH** -- Untestable as stated. Should be: "All existing unit tests pass. All existing BDD tests pass. Manual smoke test of: create board, add column, add card, drag card, edit card, delete card, sign in, sign out." |
| "WCAG AA contrast compliance in both themes" | Partially | Partially | **MEDIUM** -- Which tool to verify? Need to specify: "Verified using axe-core or similar automated tool. All text/background pairs listed in Section 3.2 pass 4.5:1 ratio." |
| "Responsive: mobile, tablet, desktop all functional" | No | No | **HIGH** -- "Functional" is subjective. Need specific breakpoints to test and what "functional" means at each. |
| "All tests passing (>=80% coverage maintained)" | Yes | Yes | Clear. |

### 3.2 P1 Criteria Assessment

| Criterion | Issues |
|-----------|--------|
| "shadcn/ui component migration" | **MEDIUM** -- Lists specific components but does not define "done." Is it done when the import changes? When old component files are deleted? When all call sites are updated? |
| "Board header toolbar with search and filters" | Good -- Section 5.3 provides detail. |
| "Collapsible columns with persisted state" | Good -- Well specified. |
| "Card density toggle" | Good -- Well specified. |
| "Bento grid layouts for settings + admin pages" | **MEDIUM** -- Bento grid for settings is specified (6.5) but admin pages just say "bento-style stats bar at top" (6.6). The stats bar content is not defined -- what stats? Total users? Active users? Recent signups? |
| "Skeleton loading states for all pages" | **MEDIUM** -- "All pages" is undefined. Some pages (BoardList, BoardView) already have skeletons. Does this mean auth pages too? Auth pages have no loading state currently except SignUpPage's token validation spinner. |
| "Improved empty states with illustrations/icons" | **LOW** -- Section 5.2 lists 5 empty states but the codebase has more: empty board (no columns), empty column (no cards), empty search results (future), empty description field. Need comprehensive list. |

### 3.3 P2 Criteria Overlap Concern

**MEDIUM** -- P2 item "Board column collapse animation with card count badge" overlaps P1 item "Collapsible columns with persisted state." The animation IS the feature. If P1 ships without animation, it is a worse experience than not shipping it. Recommendation: merge this into P1 or clarify that P1 is the behavior and P2 is the animation polish.

---

## 4. Phase Plan Assessment

### 4.1 Phase Realism

| Phase | Estimated Effort | Realistic? | Concerns |
|-------|-----------------|------------|----------|
| Phase 1: Foundation | 2-3 days | Yes | Well-scoped. But needs the token migration mapping table (see 2.1) to be efficient. |
| Phase 2: Design System | 3-5 days | Risky | **HIGH** -- This is where the bulk of file changes happen. Every page, every component. "Apply new color tokens across all pages" means touching 15+ files. Dark mode for all existing components is a massive surface area. This phase should be split into 2a (tokens + light mode) and 2b (dark mode) to allow incremental testing. |
| Phase 3: Component Migration | 3-4 days | Yes | Well-scoped if migration guide exists. |
| Phase 4: New Features | 5-7 days | Risky | **HIGH** -- This phase bundles 8 new features. Command palette alone is 2-3 days. Board toolbar with search + filters is 2-3 days. Collapsible columns is 1-2 days. This should be split into 4a (board UX: toolbar, collapse, density) and 4b (app UX: command palette, breadcrumbs, empty states, skeletons). |
| Phase 5: Polish | 2-3 days | Yes | But underestimated if Phase 2-4 leave debt. |

### 4.2 Dependencies Between Phases

| Dependency | Explicit in PRD? |
|------------|-----------------|
| Phase 2 depends on Phase 1 (tokens must exist) | Implied, not explicit |
| Phase 3 depends on Phase 1 (shadcn setup) | Implied, not explicit |
| Phase 3 partially depends on Phase 2 (tokens used in component styling) | **Not mentioned** -- HIGH risk. If components are migrated to shadcn in Phase 3 before Phase 2's dark mode work, they may need to be re-touched. |
| Phase 4 depends on Phase 3 (new features use shadcn components) | Implied |
| Phase 5 depends on all previous | Obvious |

**BLOCKER** -- The PRD should include an explicit dependency diagram and note which phases can be parallelized. Phases 2 and 3 have a circular dependency that needs resolution: you need shadcn components (Phase 3) to properly apply design tokens (Phase 2), but you need tokens (Phase 2) to style shadcn components (Phase 3). Recommendation: merge Phase 2 and 3, or do Phase 3 first with temporary styling then Phase 2 as the token application pass.

### 4.3 Parallelization Opportunities

- Phase 1 tasks are all foundational and sequential.
- Within Phase 2, different developers could work on different pages in parallel IF the token system is finalized first.
- Phase 4 features are mostly independent (command palette, breadcrumbs, board toolbar, skeletons, empty states) and could be parallelized across developers.

---

## 5. Scope Boundaries

### 5.1 "Out of Scope" Assessment

The out-of-scope list (Section 13) is reasonable but has gray areas:

| Gray Area | Severity | Issue |
|-----------|----------|-------|
| **Board toolbar search** | **HIGH** | The PRD says "no new API endpoints" in out-of-scope, but board toolbar search (Section 5.3) says "Searches title and description." Is this client-side filtering only? If there are 500 cards across 20 columns, client-side search may be insufficient. The PRD should explicitly state "client-side search only, no API search endpoint." |
| **Command palette "search across boards, tasks"** | **HIGH** | Open question #2 asks whether command palette searches backend data. But this is listed as P2. If it is client-side only, it can only search loaded data (current board). This significantly limits utility. The open question needs resolution BEFORE prioritization. |
| **Filter toolbar "Assignee (future-proofing, disabled for now)"** | **MEDIUM** | Including a disabled assignee filter adds UI complexity and test surface for zero value. Recommendation: remove entirely from P1, add as P2 "future-proof filter extension point" without UI. |
| **Board rename** | **LOW** | `BoardList.tsx` line 253-256 has a TODO for inline rename. The PRD does not mention board rename from the list view. Is this in scope or out? |
| **Existing animations** | **MEDIUM** | `index.css` has ~100 lines of existing animations (card-enter, success-flash, error-shake, checkbox-pop, etc.). The PRD defines new animation presets (Section 7) but does not address whether existing CSS animations are kept, replaced with Framer Motion equivalents, or updated to match new tokens. |

### 5.2 Scope Creep Risks

1. **shadcn component library expansion** -- Once shadcn is installed, the temptation to add more components (Tabs, Accordion, Select, etc.) is high. The PRD lists specific components (Button, Input, Card, Dialog, DropdownMenu, Command) but should explicitly say "only these components in this refresh."
2. **Dark mode perfection** -- Dark mode is notoriously finicky. Chasing every edge case (third-party library styling, browser chrome, scrollbar colors) can consume unbounded time. Define a "good enough" threshold.
3. **Animation creep** -- The animation catalog has 13 entries. Each needs implementation, testing, and reduced-motion handling. This is more work than it looks.

---

## 6. Missing Specs (Detailed)

### 6.1 Error State Designs

**Severity: BLOCKER**

The PRD needs a dedicated section for error handling patterns. Currently missing:

1. **Global network error banner** -- What happens when the API is unreachable? A toast? A full-page overlay? A banner below the header?
2. **Inline form errors** -- Specified for auth (6.1) but not for board creation, column creation, card editing, or admin actions.
3. **Error recovery** -- The "Failed to load boards" screen (BoardList.tsx lines 286-298) already has a retry button. Does this pattern generalize?
4. **Error vs empty distinction** -- "No users found" could mean error OR genuinely empty. The visual treatment should differ.

### 6.2 Tiptap / Rich Text Editor Theming

**Severity: HIGH**

The Tiptap editor is used in BoardView (description editing) and DetailPanel (card description). It has extensive custom CSS in `index.css` lines 44-191 including:

- Placeholder text color (`--text-tertiary`)
- Heading sizes and weights
- Blockquote border color (`--surface-3`)
- Inline code background (`--surface-2`)
- Code block dark background (hardcoded `#1f2937` / `#e5e7eb`)
- Highlight/mark color (hardcoded `#fef08a`)
- Link color (`--accent`)
- Task list checkbox styling with animations
- The checkbox uses `--surface-3` for borders and `--accent` for checked state

All of these need dark mode treatment. Code blocks are already dark -- should they invert in light mode? Highlights need a dark mode color. Task list checkboxes need border/background updates.

### 6.3 Toast Notification Design

**Severity: HIGH**

Need specification for:
- Toast position (top-right, bottom-right, bottom-center?)
- Toast variants (success, error, info, warning) with colors in both themes
- Auto-dismiss timing (current implementation varies)
- Whether `UndoToast` (a separate component with undo action + timer) migrates to sonner or stays custom
- Stacking behavior when multiple toasts appear

### 6.4 Confirm Dialog Design

**Severity: MEDIUM**

`UsersPage.tsx` uses `window.confirm()`. This should become a styled dialog. Need:
- Destructive confirm dialog layout
- Button arrangement (Cancel left, Confirm right? Or opposite?)
- Danger confirmation pattern (type username to confirm?)

---

## 7. Consistency Check

### 7.1 Contradictions Found

| Issue | Severity | Details |
|-------|----------|---------|
| Auth layout contradiction | **MEDIUM** | Section 6.1 says "No card container. Form floats on clean background." But the Login page spec then says "Max width: 380px for form" which implies SOME container. The current implementation HAS a white card. If removing the card, what provides visual grouping? A very light border? Drop shadow on the form area? The spec contradicts itself. |
| Button padding inconsistency | **LOW** | Section 3.4 says button padding is "8px x 16px" (`py-2 px-4`). But the auth spec (6.1) says "Primary button: full-width, teal primary" with Input height at 44px. If button padding is py-2 (8px top+bottom = 16px) and text is ~16px, total height is ~32px. But 44px inputs next to 32px buttons looks mismatched. Should buttons also be 44px in auth forms? |
| Theme toggle states | **LOW** | Section 4.4 says "3 states accessible via long-press or context menu: Light, Dark, System" and "Quick tap cycles: current -> opposite." But what does "opposite" mean when current is "System"? If system resolves to light, does tapping go to dark? And then what -- the setting becomes "dark" (manual) not "system"? This edge case needs clarification. |
| shadcn migration scope | **MEDIUM** | Section 5.1 says "Migrate custom components one-by-one" but Section 10.3 says `Modal.test.tsx` needs "Migration to shadcn Dialog. Update or replace test file." However, Modal is not listed in Phase 3 component migration ("Button, Input, Card, Modal to shadcn equivalents" -- ok, it IS listed there but NOT in the P1 acceptance criteria which says "Button, Input, Card, Dialog, Dropdown"). The acceptance criteria should match the phase plan. |

---

## 8. Open Questions Assessment

### 8.1 Existing Questions Evaluation

| # | Question | Right Question? | Recommendation |
|---|----------|----------------|----------------|
| 1 | Self-host fonts or CDN? | Yes | **Decide now:** Self-host. CDN adds external dependency, GDPR concern (Fontshare is analytics-free but still external), and is a single point of failure. Self-hosting via `@fontsource` or manual WOFF2 files is a one-time setup. |
| 2 | Command palette local vs backend search? | Yes | **Decide now:** Client-side only for v1 (P2). Explicitly document this as a future API extension. Avoids scope creep. |
| 3 | Filter state in URL query params? | Yes | **Decide now:** Not for v1. Adds complexity to routing, bookmark handling, and SSR (if ever). Local state is sufficient. Note as future enhancement. |
| 4 | Collapsed column state sync across devices? | Yes | **Decide now:** Device-local only. Server sync requires new API endpoint (out of scope). |
| 5 | shadcn file naming convention | Yes | **Decide now:** Option 2 (exception for `src/components/ui/`). Update arch tests before Phase 1. |
| 6 | BoardView complexity extraction | Yes | **Decide now:** Yes, pre-plan extraction. Define the component boundaries (`BoardToolbar.tsx`, `useBoardFilters.ts`, `useColumnCollapse.ts`) in the PRD. |

### 8.2 Missing Questions That Should Be Added

| # | Missing Question | Severity | Why It Matters |
|---|-----------------|----------|---------------|
| 7 | **What happens to the existing `ToastContext`?** | **HIGH** | If migrating to sonner, the entire ToastContext + Toast component + UndoToast may be replaced. This affects every file that calls `useToast()`. Need to know: replace entirely, or wrap sonner in existing context API for minimal migration? |
| 8 | **How are existing CSS animations in index.css handled?** | **HIGH** | ~100 lines of CSS animations (`card-enter`, `success-flash`, `error-shake`, `checkbox-pop`, etc.) plus `will-change` and transition properties on `data-testid` elements. Are these kept as-is, migrated to Framer Motion, or updated with new tokens? |
| 9 | **What is the token migration strategy?** | **BLOCKER** | Old tokens (`--surface-0`, `--accent`, etc.) to new tokens (`--background`, `--primary`, etc.) -- find-and-replace? Alias old to new during transition? This affects every phase. |
| 10 | **Should Tailwind hardcoded colors (`bg-stone-100`, `text-gray-700`) be replaced with semantic tokens?** | **HIGH** | The codebase has hundreds of hardcoded Tailwind color classes. If they all become `bg-muted`, `text-muted-foreground`, etc., that is a massive refactor. If some stay hardcoded, dark mode breaks on those elements. |
| 11 | **What is the font loading strategy for tests?** | **MEDIUM** | Vitest/jsdom does not load fonts. Will tests that check computed styles break? Do we need font mocking? |
| 12 | **How does the theme interact with Vercel Analytics and SpeedInsights?** | **LOW** | `App.tsx` includes `<SpeedInsights />` and `<Analytics />`. These inject UI elements. Do they respect dark mode? |

---

## 9. Risk Assessment

### 9.1 Existing Risks Evaluation

All 6 identified risks are valid. No issues with their mitigations.

### 9.2 Missing Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Token migration breaks visual consistency mid-phase** | High -- Some pages look new, some look old, nothing looks right | High | Define a "migration mode" where old tokens alias to new values. Apply globally in Phase 1 so everything shifts together, even if not perfectly styled yet. |
| **BoardView.tsx exceeds 700-line architecture limit during Phase 4** | Medium -- Arch tests fail, blocks merge | High | The file is already 637 lines. Adding toolbar, filters, and collapse will push it well over. Pre-extract before adding features (Phase 3.5). |
| **Test coverage drops below 80% during migration** | High -- CI blocks all merges | Medium | New files without tests, deleted files losing coverage. Track coverage per-phase with a coverage checkpoint after each phase. |
| **Tiptap editor breaks in dark mode** | Medium -- Editor is core to card editing | High | Tiptap uses its own DOM and CSS. Dark mode class on `<html>` may not propagate correctly into editor content. Requires specific testing. |
| **framer-motion bundle size increase** | Low -- Performance regression | Low | Already in use, but adding `AnimatePresence` to more components increases JS parse time. Monitor bundle size. |
| **Fontshare font download failure** | Medium -- Fallback font looks very different | Low | If self-hosting: bundle in build. If CDN: ensure fallback fonts are visually similar enough. |
| **Browser-specific dark mode issues** | Medium -- Safari dark mode scrollbar, Firefox dark mode form controls | Medium | Add cross-browser testing to Phase 5 checklist with specific browsers/versions. |

---

## 10. Rollback Plan

**Severity: BLOCKER** -- The PRD has NO rollback plan.

### 10.1 Recommended Rollback Strategy

1. **Phase-level rollback**: Each phase should be merged as a single PR (or a small set of PRs). If a phase causes regressions, revert the entire PR set.

2. **Feature flag consideration**: For dark mode specifically, the ThemeProvider could include a kill switch (`VITE_ENABLE_DARK_MODE=false`) that forces light mode and hides the toggle. This allows shipping Phase 1-3 without dark mode risk.

3. **Token aliasing for gradual rollback**: If new tokens are implemented as aliases over old tokens in Phase 1, reverting the alias file restores old appearance without touching component files.

4. **Mid-implementation rollback**: If the refresh needs to be abandoned mid-Phase 4, the app should still be functional (just with a mix of old/new UI). This requires:
   - Never delete old components until new ones are verified
   - Keep old component files as `*.old.tsx` backups through Phase 3
   - Run full test suite after every phase before proceeding

5. **User-facing rollback**: If the refresh ships and users report issues, a "classic theme" toggle could be added that reverts to old token values. This is only feasible if the new architecture uses CSS variables consistently.

---

## 11. Summary of Recommendations

### Must Fix Before Development (BLOCKER)

1. Add a **token migration mapping table** (old token -> new token) to Section 3 or 10.
2. Add an **error handling patterns** section covering all error states.
3. Add an **explicit phase dependency diagram** and resolve the Phase 2/3 circular dependency.
4. Add a **rollback plan** section.
5. Resolve open question #9 (token migration strategy) -- this is not even listed as an open question.

### Should Fix Before Development (HIGH)

6. Add a **Tiptap/RichTextEditor theming** subsection to Section 6.4 or 3.
7. Add a **toast notification design spec** (position, variants, behavior, UndoToast fate).
8. Add a **component API migration guide** (current Button variants -> shadcn Button variants, etc.).
9. Add a `data-testid` preservation rule as a P0 requirement.
10. Split Phase 2 into 2a (light mode tokens) and 2b (dark mode).
11. Split Phase 4 into 4a (board UX) and 4b (app-wide UX).
12. Add the missing DetailPanel component spec.
13. Resolve "full-bleed minimal" vs card container contradiction for auth pages.
14. Clarify P0 criterion "all existing functionality preserved" with specific testable checkpoints.
15. Decide all 6 open questions + add questions #7-10 from Section 8.2.

### Should Fix During Phase 1 (MEDIUM)

16. Clarify bento grid "Featured/Recent Board" selection logic or remove it.
17. Specify confirm dialog replacement for `window.confirm()`.
18. Clarify handling of existing CSS animations in `index.css`.
19. Specify OAuth redirect flow visual treatment.
20. Merge P2 "column collapse animation" into P1 "collapsible columns."
21. Define the hardcoded Tailwind color class strategy (replace all, or selective?).

---

*End of review.*
