# Deploying p2computing.com

The site is served from the estate, not from GitHub Pages.

| | |
|---|---|
| Web host | **CT151 `p2c-web-h1`** — `10.0.0.151`, nginx, Debian 12 |
| Document root | `/var/www/p2computing` (a clone of this repo) |
| Edge / TLS | CT112 `.45` + CT113 `.46`, behind the VIP `10.0.0.40` |
| Certificate | Let's Encrypt `p2computing.com` + `www`, renewed by `bf-lb-certsync` on p2pmh2 |
| DNS | GoDaddy: apex `A` → home IP (kept current by the DDNS timer's sibling records), `www` `CNAME` → `@` |

`www` 301s to the apex; the apex is canonical.

## Publish a change

Commit and push, then pull on the web host:

```bash
ssh -i ~/.ssh/proxmox_admin root@10.0.0.162 \
  "pct exec 151 -- git -C /var/www/p2computing pull --ff-only"
```

nginx serves from the working tree, so no reload is needed for content changes.
Reload only after editing the vhost:
`pct exec 151 -- bash -c 'nginx -t && systemctl reload nginx'`

## The edge vhost

`ops/p2computing-lb.conf` is the copy of what lives at
`/etc/nginx/conf.d/p2computing.conf` on **both** load balancers. Keep the two in
step — a change applied to only one appears to work until the VIP fails over.
