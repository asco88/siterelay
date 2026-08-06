# SiteRelay — Project Status

_Last updated: 2026-08-06_

---

## Production

| Item | Status |
|------|--------|
| Production URL | https://siterelay.app |
| Vercel project | `omni-state` (auto-deploys from `main`) |
| Upstash KV | Connected, per-user namespaced keys |
| Auth | NextAuth v5, Google OAuth |

---

## Recent Changes (May 2026)

### Branding — OmniState → SiteRelay
- Renamed all user-facing strings, manifest, integration domain
- New logo (`web/public/logo-v2.png`): cream wordmark + teal dot, transparent bg, 480×270px
- Logo referenced via `/logo-v2.png` (cache-busted from old `logo.png`)
- Favicon, PWA icons, and HACS brand assets (`brand/icon.png`, `brand/icon@2x.png`) updated

### UI Redesign
- Rebuilt with shadcn/ui components
- Deeper palette, improved contrast in dark/light modes
- Responsive desktop two-column layout

### Bug Fix — Style Not Persisting After Refresh
- **Root cause:** `set-style` wrote only to `desiredStyle` (agent queue) but `get-style` (browser) read from `styleData`. When the agent was offline, changes were lost on refresh.
- **Fix:** `web/app/api/set-style/route.ts` now writes to both keys atomically via `kv.mset()`.
- **Regression tests added:** `web/tests/api/style.test.ts` — "style round-trip" suite.

### Testing Infrastructure
- **Vitest** unit/integration tests with in-memory KV mock (`web/tests/setup.ts`)
- **Coverage:** v8 provider, thresholds enforced (80% lines/functions/statements, 70% branches)
- **Playwright** E2E + visual snapshots: Desktop Chromium + Pixel 7 mobile
- **Husky pre-commit hook** at repo root: runs `cd web && npm test` before every commit
  - Hook sources NVM (`nvm use 22`) to avoid system Node being too old for Vitest

### Home Assistant — User's Own Installation
- Migrated user's local HA from `omnistate` → `siterelay` component (2026-05-25)
- Stopped HA VM, mounted LVM disk (`/dev/pve/vm-101-disk-1`), copied new component
- Updated `.storage/core.config_entries` domain + title to "SiteRelay"
- Updated `.storage/core.entity_registry` platform for all 8 entities
- Entity IDs kept as `sensor.omnistate_*` to preserve existing dashboards/automations
- HA back online; integration shows `domain: siterelay, title: SiteRelay, state: loaded`

---

## HACS Submission

| PR | Status | Notes |
|----|--------|-------|
| [#7818](https://github.com/hacs/default/pull/7818) | Closed | Submitted as `omni-state`, rejected (wrong domain) |
| [#7824](https://github.com/hacs/default/pull/7824) | Closed | Resubmitted as `siterelay`, bot rejected — missing 2 links in description |
| [#7986](https://github.com/hacs/default/pull/7986) | Closed (stale, unreopenable) | Auto-closed by maintainer for inactivity on 2026-08-01; all checks had passed. Accidentally rendered permanently unreopenable when its branch was force-pushed after close (GitHub blocks reopening once a closed PR's head branch changes, even if restored to the same SHA) — see [[hacs_pr_reopen_blocked]] |
| [#9788](https://github.com/hacs/default/pull/9788) | **Open, all checks passing** | Replacement for #7986, branch rebased onto current `master` (856 commits, no conflicts). Initial run failed `HACS action` — `asco88/siterelay` had no LICENSE file (new/enforced requirement). Fixed by adding MIT `LICENSE` (commit `8e52639`, pushed to `main` 2026-08-06); all checks green after retrigger. Awaiting maintainer merge |

Branch: `asco88:add-siterelay` on fork of `hacs/default`
Entry confirmed in `integration` file: `"asco88/siterelay"`

---

## Infrastructure

| Component | Host | Details |
|-----------|------|---------|
| HA VM | Proxmox VM 101, IP 10.0.0.173 | HAOS, LVM disk `/dev/pve/vm-101-disk-1` |
| Linux server agent | VM 102, IP 10.0.0.182 | `omnistate` systemd service + `real-sensors` service |
| Proxmox host | 10.0.0.30 | node: `assafco`, SSH as root |

---

## Known Issues / Pending

- [ ] Entity IDs in user's HA still say `omnistate_*` — cosmetic only, can rename in HA UI
- [ ] HACS PR #9788 (successor to closed #7986) — all checks passing, awaiting maintainer merge
- [ ] Linux server agent service is still named `omnistate` — could rename to `siterelay` if desired
- [ ] The siterelay.app production URL should replace `omni-state.vercel.app` in HA config entry data (currently stored token still works, just the URL label is old)

---

## Key Files

| File | Purpose |
|------|---------|
| `web/app/api/set-style/route.ts` | Browser style save — writes to both `desiredStyle` + `styleData` |
| `web/app/api/get-style/route.ts` | Browser style read — reads from `styleData` |
| `web/app/api/update-style/route.ts` | Agent style write — agent pushes actual applied style |
| `web/lib/kv-user.ts` | KV key namespacing per user email |
| `web/tests/setup.ts` | In-memory KV mock + NextAuth session mock for tests |
| `web/tests/api/style.test.ts` | Style API tests incl. regression for persist bug |
| `web/vitest.config.ts` | Test config with coverage thresholds |
| `web/playwright.config.ts` | E2E config: Chromium + Pixel 7 mobile |
| `custom_components/siterelay/` | HA integration (domain: `siterelay`) |
| `.husky/pre-commit` | Runs `npm test` before each commit |
