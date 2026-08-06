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

### Home Assistant Cleanup — Entity IDs, Config URL, Orphaned Device (2026-08-06)
- Took a Proxmox snapshot (`pre-siterelay-entity-rename-20260806`) before making changes
- Stopped HA VM, mounted `/dev/pve/vm-101-disk-1` via `losetup -fP` (partition 8, `hassos-data`, ext4) — `kpartx`/`partx` failed on this LV, `losetup -fP` worked
- Backed up full `.storage/` to `/root/ha-storage-backup-20260806` on the Proxmox host before editing
- Renamed all 8 entity_ids: `sensor.omnistate_last_seen/cpu_usage/memory/disk/network_rx/solar_power/solar_battery` and `binary_sensor.omnistate_server` → `siterelay_*` equivalents, in `core.entity_registry`
- Updated `core.config_entries` for the `siterelay` domain: `data.url` and `unique_id` from `https://omni-state.vercel.app` → `https://siterelay.app` (token untouched)
- Deleted an orphaned leftover "OmniState" device from `core.device_registry` (0 entities referenced it — the May migration had left both an old and new device record)
- Confirmed no dashboards/automations (`automations.yaml`, lovelace configs) referenced the old entity_ids — nothing else to fix there
- Verified post-restart: HA `state: RUNNING`, `siterelay` in loaded components, `omnistate` not present, all 8 entities reporting live under new names
- **Found + fixed a related bug this surfaced:** the deployed `real_sensors.py` on the Linux server (10.0.0.182) still hardcoded `sensor.omnistate_status` and filtered `_SENSOR_SKIP_PREFIXES = ("sensor.omnistate_",)` — after the entity rename this would have caused the collector to re-ingest its own pushed sensors as if external (feedback loop). The local repo already had this fixed (`siterelay_status` / `siterelay_` prefix) but it had never been deployed. Rsynced `agent.py` + `real_sensors.py` to the server and restarted `siterelay.service` + `real-sensors.service` — both confirmed healthy, `sensor.siterelay_status` now live, old `sensor.omnistate_status` frozen/stale
- Renamed the Linux server systemd unit `omnistate.service` → `siterelay.service` (same file content, `Description=SiteRelay Agent` was already correct); old unit file removed
- Note: `real-sensors.service`'s own systemd `Description=` still reads "OmniState Real Sensor Collector" — not renamed (out of scope, unit filename was never omnistate-based)
- Minor leftover: the old `sensor.omnistate_status` state entry is now stale/frozen in HA (nothing pushes to it anymore) — safe to manually delete via Settings → Devices & Services → Entities if desired, purely cosmetic

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
| Linux server agent | VM 102, IP 10.0.0.182 | `siterelay` systemd service (renamed from `omnistate` 2026-08-06) + `real-sensors` service |
| Proxmox host | 10.0.0.30 | node: `assafco`, SSH as root |

---

## Known Issues / Pending

- [x] ~~Entity IDs in user's HA still say `omnistate_*`~~ — renamed to `siterelay_*` 2026-08-06
- [ ] HACS PR #9788 (successor to closed #7986) — all checks passing, awaiting maintainer merge
- [x] ~~Linux server agent service is still named `omnistate`~~ — renamed to `siterelay.service` 2026-08-06
- [x] ~~The siterelay.app production URL should replace `omni-state.vercel.app` in HA config entry data~~ — updated 2026-08-06
- [ ] Old `sensor.omnistate_status` entity is now stale in HA (nothing pushes to it anymore) — cosmetic, safe to delete manually via HA UI
- [ ] `real-sensors.service`'s systemd Description still says "OmniState Real Sensor Collector" — cosmetic only

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
