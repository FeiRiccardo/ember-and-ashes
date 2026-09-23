# 12: Release Infra: PWA + GitHub Pages Deploy

**What to build:** PWA installability (manifest + service worker) and a GitHub Actions workflow that builds the project and publishes it to GitHub Pages.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] A web app manifest and service worker are present so the game can be installed via "Add to Home Screen" on iOS/Android
- [x] A GitHub Actions workflow builds the project with Vite and publishes the static output to GitHub Pages on push to the main branch
- [x] The deployed Pages build loads and is playable at its published URL

**Update**: git initialized, repo created at `github.com/FeiRiccardo/ember-and-ashes` (public), Pages enabled with `build_type: workflow`, pushed to `main`. The `Deploy to GitHub Pages` workflow ran successfully (build + deploy jobs both green) and the site is live at https://feiriccardo.github.io/ember-and-ashes/. Verified in a real browser: all assets (JS bundle, manifest, icons) resolve correctly under the `/ember-and-ashes/` project subpath (confirming `vite.config.ts`'s `base: './'` choice was correct), the service worker registers and reaches `activated` state, and the game is fully interactive (End Turn, AI raid, resource/score updates all fired correctly) on the live deployment. No console errors.

## Comments

Implemented via:
- `public/manifest.json` — web app manifest (`name`, `short_name`, `start_url: "./"`, `scope: "./"`, `display: standalone`, dark `background_color`/`theme_color` matching the app shell, two icon entries). Paths are relative throughout, matching `vite.config.ts`'s `base: './'`, so it keeps working when served from a GitHub Pages project subpath.
- `public/sw.js` — a minimal service worker: precaches the app shell (`index.html`, `manifest.json`, icons) on install, uses a network-first/cache-fallback strategy for same-origin GET requests (so it also opportunistically caches the hashed Vite build assets after first load), and falls back to the cached shell for navigations when offline. Old cache versions are cleaned up on activate.
- `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/apple-touch-icon.png` — small flat "ember" glyph icons (dark shell background + orange ember, matching the game's existing dark palette), generated locally as plain PNGs (no external art dependency).
- `index.html` — added `<link rel="manifest">`, `<link rel="icon">`, `<link rel="apple-touch-icon">`, and a `theme-color` meta tag.
- `src/main.ts` — registers `./sw.js` on window `load` when `serviceWorker` is supported, with a `.catch` that logs registration failures. No other game-logic files touched.
- `.github/workflows/deploy.yml` — on push to `main` (plus manual `workflow_dispatch`), installs with `npm ci`, runs `npm run build`, uploads `dist/` via `actions/upload-pages-artifact@v3`, and deploys via `actions/deploy-pages@v4`. Correct `permissions: contents: read, pages: write, id-token: write`, and a `pages` concurrency group so overlapping runs don't race.

**Verification performed:**
- `npm run build` succeeds; inspected `dist/` output directly and confirmed `manifest.json`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`, and `apple-touch-icon.png` are all copied to the dist root (via Vite's `public/` convention), and that `dist/index.html`'s manifest/icon links and script `src` are all relative (`./...`), not absolute.
- Ran `npm run dev -- --port 5175 --strictPort` and used `curl` against the dev server to confirm `manifest.json` (200, `application/json`, correct content), `sw.js` (200, `text/javascript`), and all three icon files (200, `image/png`) are served with no 404s, and that `index.html` and the transformed `src/main.ts` both come back with the expected manifest/link tags and service-worker registration code intact.
- `node --check public/sw.js` passes (valid JS syntax).
- Attempted full interactive browser verification (chrome-devtools MCP: open page, check console messages/network requests for the manifest/SW, confirm the grid + End Turn button still render) but could not get an isolated browser instance — the shared `chrome-devtools-mcp` Chrome profile was already locked by another live automation session in this environment (confirmed via `Get-CimInstance Win32_Process`, a Chrome process with `--enable-automation --remote-debugging-pipe` on the same default profile dir, almost certainly the concurrent GameBoardScene/TurnManager work happening in parallel). Did not kill or otherwise touch that process. Fell back to the `curl`/build-output verification above instead, which covers the same "no 404s, correct wiring" checks minus live console-error observation. Recommend a quick manual browser check (or a re-run of the browser-based verification once the environment is free) before/at the time of the first live Pages deploy.
- Stopped the background dev server after testing (killed the process bound to port 5175) — no background processes left running.
- Did **not** touch git, GitHub, or any repo initialization — none exists yet for this project, per the ticket's explicit constraint. The Pages-deploy acceptance criterion is left unchecked above and explained rather than marked done.
