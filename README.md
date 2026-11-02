# SiteRelay

Real-time remote dashboard for self-hosters. Monitor your Home Assistant instance and Linux servers from anywhere — no VPN, no port forwarding, no cloud subscription required for the core experience.

**[→ siterelay.app](https://siterelay.app)**

---

## What you get

- Live sensor data (CPU, memory, disk, network, solar, custom metrics)
- Home Assistant entities surfaced as native HA sensors, switches, and buttons
- Service status monitoring with systemd integration
- One-click automations and toggles synced bidirectionally with HA
- Customizable layout: dark/light themes, drag-to-reorder, per-section column control
- Works from any browser — phone, tablet, desktop

## Getting started

### Hosted (easiest)

1. Go to **[siterelay.app](https://siterelay.app)** and sign in with Google
2. Click **Add integration → Home Assistant**
3. Install the SiteRelay integration via HACS (or manually)
4. Generate a token in the wizard and paste it into HA
5. Your dashboard populates automatically

### Home Assistant integration — HACS

SiteRelay is part of the **default HACS catalog** — no custom repository needed.

1. Open **HACS** and search for **SiteRelay**
2. Click **Download**
3. Restart Home Assistant
4. Settings → Integrations → Add → SiteRelay → enter your dashboard URL and token

<details>
<summary>Not seeing SiteRelay in HACS?</summary>

If the default catalog doesn't show it (stale catalog cache, older HACS version), add it
as a custom repository instead:

1. Open HACS → ⋮ → **Custom repositories**
2. Add `https://github.com/asco88/siterelay` — category: **Integration**
3. Search for **SiteRelay** and click Download
4. Restart Home Assistant, then continue with step 4 above

</details>

### Home Assistant integration — Manual

Copy `custom_components/siterelay/` into your HA config directory:

```bash
cp -r custom_components/siterelay/ /config/custom_components/
```

Restart HA and add the integration as above.

### Linux server agent

Run the guided installer on your Ubuntu/Debian server:

```bash
curl -fsSL https://raw.githubusercontent.com/asco88/siterelay/main/setup.sh | bash
```

Or manually:

```bash
git clone https://github.com/asco88/siterelay
cd siterelay
cp config.json.example config.json
# edit config.json with your settings
python3 agent.py
```

See [`config.json.example`](config.json.example) for all available options.

---

## Architecture

```
[Home Assistant]  ──HA integration──▶ ┐
                                       ├─ Vercel API ─▶ Upstash KV ─▶ Dashboard
[Linux server]    ──Python agent────▶ ┘
```

- The HA integration and Python agent both authenticate with a Bearer token
- State is stored in Upstash KV, namespaced per user email
- The dashboard polls every 5 seconds; agents push every 15–30 seconds
- No inbound ports or dynamic DNS required on the home server

## Self-hosting

The full stack is a Next.js app (Vercel) + Upstash KV. To self-host:

1. Fork the repo and deploy `web/` to Vercel
2. Add an Upstash KV store in the Vercel dashboard
3. Set `NEXTAUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` in Vercel env vars
4. Update `vercel_url` in `config.json` on your server to point to your deployment

## Project layout

```
siterelay/
├── web/                        # Next.js app
│   ├── app/                    # Pages and API routes
│   └── lib/                    # Shared utilities (KV keys, auth)
├── custom_components/siterelay/ # Home Assistant integration
├── agent.py                    # Cloud sync agent (Linux server)
├── real_sensors.py             # Hardware sensor collector
├── setup.sh                    # Guided installer
└── config.json.example         # Annotated config template
```

## Contributing

PRs welcome. The most impactful areas:

- New integrations (Proxmox, Synology NAS, Pi-hole, etc.)
- Additional HA entity types (climate, covers, alarm panels)
- Dashboard widgets and visualizations
- Notification rules (offline alerts, threshold triggers)

Open an issue first for anything substantial so we can align on approach.

## License

MIT
