# Deploy — hermes-vps (13.143.65.45)

The VPS dir `~/career-brain` is **not** a git repo — code ships via rsync, then
deps install and the web app rebuilds on the server. Both processes run as
systemd **user** services so they survive reboots and SSH disconnects
(`loginctl enable-linger ssuvorin` was run once).

## Layout

| Process | Port | Unit |
|---|---|---|
| Next.js web (`apps/web`) | 3000 | `career-brain-web.service` |
| Slack channel listener (`apps/channel`) | 3001 | `career-brain-slack.service` |

`WEB_BASE_URL=http://127.0.0.1:3000` is required — `show_graph` fetches
`/api/graph-image` from the web app, and its default is `:3100` (local dev).
`PORT=3001` keeps the listener's CopilotRuntime endpoint off the web port.

## Pitch deck

`deck/` is static — no build, no unit. Caddy serves it directly:

```sh
rsync -az --delete deck/ hermes-vps:~/career-brain/deck/
```

Caddyfile block (already in place):

```
deck.13.143.65.45.sslip.io {
	root * /home/ssuvorin/career-brain/deck
	file_server
}
```

Live at https://deck.13.143.65.45.sslip.io — independent of the cloudflared
quick-tunnel (which only fronts :3000 and rotates its URL on restart).
Requires `chmod o+x /home/ssuvorin` so the `caddy` user can traverse the path.

## Ship an update

```sh
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .env \
  --exclude 'public/data' --exclude '*.tsbuildinfo' \
  apps/channel/ hermes-vps:~/career-brain/apps/channel/
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .env \
  --exclude 'public/data' --exclude '*.tsbuildinfo' \
  apps/web/ hermes-vps:~/career-brain/apps/web/
rsync -az --delete --exclude node_modules \
  packages/agent-core/ hermes-vps:~/career-brain/packages/agent-core/
rsync -az package.json package-lock.json hermes-vps:~/career-brain/

ssh hermes-vps 'cd ~/career-brain && npm install --no-audit --no-fund \
  && cd apps/web && node --env-file-if-exists=../../.env \
    ../../node_modules/next/dist/bin/next build \
  && systemctl --user restart career-brain-web career-brain-slack'
```

**Never run `next build` while the old server is live** — it rewrites `.next/`
under the running process, hashed CSS/JS chunks 404, and the site renders
unstyled until restart. Build first, then `systemctl --user restart`.

## First-time setup

```sh
sudo loginctl enable-linger ssuvorin
mkdir -p ~/.config/systemd/user
cp deploy/*.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now career-brain-web career-brain-slack
```

## Debug

```sh
journalctl --user -u career-brain-slack -n 50 --no-pager
journalctl --user -u career-brain-web -n 50 --no-pager
systemctl --user status career-brain-web career-brain-slack
```

Slack silence checklist: listener process alive → `Channel "career-brain"
online` in the journal → web on :3000 answers `/api/graph-image` with a PNG.
