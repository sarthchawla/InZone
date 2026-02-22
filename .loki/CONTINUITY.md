# Loki Mode — InZone UI/UX Refresh

## Current State
- **Phase:** DEVELOPMENT — Phase 2a (Design System — Light Mode)
- **PRD:** `.claude/plans/ui-refresh-prd.md` (v1.1, fully reviewed)
- **Branch:** `improve-ui-ux`
- **Phase 1:** COMPLETE ✓

## Phase 1 Completed Tasks
1. ✅ Tailwind v3 → v4 migration (PostCSS removal, @tailwindcss/vite, @theme inline)
2. ✅ Self-hosted fonts (Satoshi + General Sans WOFF2 from Fontshare)
3. ✅ ThemeProvider + FOUC prevention (8 tests passing)
4. ✅ shadcn/ui foundation (button, input, card, label + components.json)
5. ✅ Token aliasing (new semantic tokens + backward-compatible aliases + dark mode)
6. ✅ Architecture test update (shadcn naming exception)
7. ✅ Gate check: 941 tests passing, 84.84% coverage, build OK, arch tests OK

## Mistakes & Learnings
- matchMedia mock needed in vitest.setup.ts for ThemeProvider (jsdom doesn't have it)
- macOS case-insensitive FS means button.tsx = Button.tsx — shadcn files named shadcn-button.tsx/shadcn-input.tsx
- Arch tests use separate vitest config (vitest.arch.config.ts), not the default run
- Need to clean up .dark class and localStorage between tests to prevent leakage

## Key Files Modified (Phase 1)
- apps/web/package.json (deps)
- apps/web/vite.config.ts (@tailwindcss/vite)
- apps/web/src/index.css (TW v4 + tokens + dark mode)
- apps/web/src/fonts.css (new — @font-face declarations)
- apps/web/index.html (FOUC script, removed Google Fonts)
- apps/web/src/contexts/ThemeContext.tsx (new)
- apps/web/src/contexts/ThemeContext.test.tsx (new)
- apps/web/src/App.tsx (ThemeProvider wrapper)
- apps/web/src/test/utils.tsx (ThemeProvider + renderDark)
- apps/web/vitest.setup.ts (matchMedia mock + dark class cleanup)
- apps/web/src/architecture/naming.arch.test.ts (shadcn regex)
- apps/web/components.json (new — shadcn config)
- apps/web/src/components/ui/card.tsx (new — shadcn)
- apps/web/src/components/ui/label.tsx (new — shadcn)
- apps/web/src/components/ui/shadcn-button.tsx (new — shadcn)
- apps/web/src/components/ui/shadcn-input.tsx (new — shadcn)
- apps/web/public/fonts/*.woff2 (new — font files)
- DELETED: tailwind.config.js, postcss.config.js
