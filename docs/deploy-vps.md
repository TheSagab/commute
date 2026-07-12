# Deploying OSRM on a VPS

Provider-agnostic guide for running the OSRM container on a small
VPS. Pairs with ADR-0003 (frontend on Cloudflare, OSRM on a VPS).

> Pick a VPS first. The container runs the same `docker compose up`
> locally or in production — no code changes. Differences are
> infra-only: firewall, SSH, automatic updates, HTTPS in front of
> the container.

## What you need

- 4 GB RAM VPS (2 GB is tight), 10 GB disk, Ubuntu 22.04 or 24.04.
- A public IPv4 address.
- A domain you control (used for the OSRM hostname
  `osrm.yourdomain.com`).
- A Cloudflare account (for DNS + the frontend). The OSRM
  container doesn't need Cloudflare to run, but proxying through
  Cloudflare gives us free HTTPS, DDoS protection, and a stable
  hostname if the VPS IP ever changes.

Estimated cost: **$5–10/month**.

## 1. First-boot VPS setup

SSH in as `root`, create a non-root user, install Docker.

```sh
# On the VPS, as root
adduser --disabled-password deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

# Disable password auth (after confirming SSH key works)
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Firewall: SSH + nothing else. OSRM is exposed via Cloudflare
# proxy (and Caddy below); the raw port should not be public.
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw enable

# Automatic security updates
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

Log out, log back in as `deploy`.

```sh
# Docker (official install script)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
newgrp docker
docker --version
docker compose version
```

## 2. Deploy the OSRM container

Clone the repo (or rsync the docker-compose + scripts). The OSRM
container only needs `docker-compose.yml` and `scripts/osrm-init.sh`
on the server — the rest of the app (TanStack Start source,
`src/data/`, etc.) doesn't need to be there.

```sh
mkdir -p ~/commute
cd ~/commute

# Copy just the bits OSRM needs
scp docker-compose.yml deploy@your-vps:~/commute/
scp scripts/osrm-init.sh deploy@your-vps:~/commute/scripts/

chmod +x scripts/osrm-init.sh
```

Create a production override file that publishes the container's
port 5000 to localhost only (Cloudflare's proxy reaches it over
127.0.0.1):

```sh
cat > docker-compose.override.yml <<'EOF'
services:
  osrm:
    ports:
      # Bind to localhost only — Caddy reverse-proxies this
      # over 127.0.0.1. Don't expose 5000 to the public internet.
      - "127.0.0.1:5000:5000"
    restart: unless-stopped
EOF
```

Start the container. First start downloads the Java OSM extract
(~853 MB) and runs the preprocess pipeline (~10–15 min on a typical
VPS). Subsequent starts are seconds.

```sh
docker compose up -d osrm
docker compose logs -f osrm
```

Watch for the line `[osrm-init] Preprocessing complete` followed by
`[osrm-init] Starting OSRM router on :5000 ...`. Hit Ctrl-C, the
container keeps running.

Verify locally:

```sh
curl -s "http://127.0.0.1:5000/route/v1/foot/106.8210,-6.3037;106.8200,-6.3040" | head -c 200
```

You should get a JSON response with a `route` key.

## 3. HTTPS in front of the container (Caddy)

Caddy auto-provisions Let's Encrypt certs and is the simplest
option. We bind it to the public interface on 80/443, and it
reverse-proxies to OSRM on 127.0.0.1:5000. Cloudflare proxies DNS
to the VPS's public IP.

```sh
# On the VPS
sudo apt-get install -y caddy
```

`/etc/caddy/Caddyfile`:

```
osrm.yourdomain.com {
    reverse_proxy 127.0.0.1:5000
}
```

```sh
sudo systemctl enable --now caddy
sudo systemctl reload caddy   # after editing the Caddyfile
```

Verify from your laptop:

```sh
curl -s "https://osrm.yourdomain.com/route/v1/foot/106.8210,-6.3037;106.8200,-6.3040" | head -c 200
```

## 4. Cloudflare DNS

In the Cloudflare dashboard for `yourdomain.com`:

- Add an `A` record: `osrm` → VPS public IP, **proxied** (orange
  cloud). The proxy gives you free HTTPS termination, DDoS
  protection, and the freedom to change the VPS IP later without
  touching DNS.
- If you don't use Cloudflare for DNS, point an `A` record at the
  VPS IP without the proxy and let Caddy terminate HTTPS.

## 5. Wire the TanStack Start app

In the Cloudflare Pages project settings (or whichever platform
you deploy the TanStack Start app to), set:

| Variable         | Value                            |
|------------------|----------------------------------|
| `OSRM_BASE_URL`  | `https://osrm.yourdomain.com`    |

This is the only env var the app needs for production — see
`AGENTS.md` §"Environment variables". The app's server functions
call `OSRM_BASE_URL/table/v1/foot/...` to get walking times, exactly
as in local dev.

## 6. Monitoring + maintenance

A 5-minute "is it up" check is enough for a hobby app:

- UptimeRobot (free) or BetterStack — ping
  `https://osrm.yourdomain.com/route/v1/foot/0,0;0,0`. A
  non-200 means OSRM is down.
- Watch the `commute-osrm-data` volume size: if it grows past
  ~5 GB something is wrong. Normal size is ~3.5 GB.

When the bundled transit data gets stale (the CI scraper updates
`src/data/_meta.json` weekly), nothing changes on the VPS — the
OSRM container is just the routing engine. The frontend reads
`src/data/*.json` which is rebuilt on each deploy. To update the
road graph on the VPS, you only need to re-extract when the
underlying OSM data materially changes (a new highway, a renamed
street). Geofabrik's Java extract refreshes daily; rerun
`docker compose down && docker compose up -d` to pick it up, and
the script will re-extract if the .osm.pbf changed.

## 7. Security checklist

- [x] SSH key-only auth (no passwords) — done in step 1.
- [x] Firewall closed except 22, 80, 443 — done in step 1.
- [x] OSRM port bound to 127.0.0.1 only — done in step 2.
- [x] Unattended security updates enabled — done in step 1.
- [ ] Don't run a Docker socket listener publicly. (We don't.)
- [ ] Rotate SSH keys yearly. (Calendar reminder.)
- [ ] Backup the `commute-osrm-data` volume if you care about
      avoiding a 15-min re-extract on VPS loss. (The data is
      reproducible; skip if the rebuild is fine.)
- [ ] Enable Cloudflare "Under Attack Mode" or "Bot Fight Mode"
      if you see scraping.

## 8. Cost summary

| Item                        | Approx. monthly  |
|-----------------------------|------------------|
| VPS (4 GB, SG region)       | $5–10            |
| Cloudflare Pages            | $0 (free tier)   |
| Cloudflare DNS              | $0 (free tier)   |
| Domain registration         | ~$1 amortized    |
| **Total**                   | **~$6–11/month** |

## 9. Tear-down / VPS migration

The OSRM container is fully reproducible from
`docker-compose.yml` + `scripts/osrm-init.sh`. To move to a new
VPS:

1. Stand up a new VPS, repeat steps 1–3.
2. Once `curl http://127.0.0.1:5000/...` returns a route, switch
   the Cloudflare `A` record to the new IP.
3. Decommission the old VPS.

Total downtime: a single DNS TTL (Cloudflare's default is 5 min,
auto).

## 10. When to revisit

- **If the app gets serious traffic** (>1000 RPM) the 4 GB VPS
  will be CPU-bound on `/table` calls. Vertical scale to 8 GB or
  move to a dedicated instance.
- **If you want a regional /table for Jakarta users** (lower
  latency), host OSRM in the same region as the frontend
  (Cloudflare's edge doesn't help here — `/table` is a
  compute-bound query, not a cacheable one).
- **If you decide Cloudflare Containers is the right call after
  all** (R2-backed preprocessed graph, warm pool), the
  `docker-compose.yml` and `scripts/osrm-init.sh` transfer
  unchanged — only the runtime moves.
