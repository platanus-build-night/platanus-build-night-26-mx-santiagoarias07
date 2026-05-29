# Santiago Arias Paul — Platanus Build Night — Ciudad de México Project

**Current project logo:** project-logo.png

<img src="./project-logo.png" alt="Project Logo" width="200" />

Hacker:

- Santiago Arias Paul ([@SantiagoArias07](https://github.com/SantiagoArias07))

Before submitting:

- ✅ Set a project name, oneliner and description in build-night-project.json
- ✅ Provide a 1000x1000 png project logo, max 500kb (project-logo.png)
- ✅ Provide a concise and to the point readme

---

## Invariant — autonomous adversarial QA

Point Invariant at a running web app. It explores the interface, infers the
**business-logic invariants** that must always hold ("a coupon applies once",
"quantity ≥ 1", "no PAID order without payment"), then relentlessly tries to
break each one — and writes a Playwright regression test the moment it succeeds.

### How it actually works

- **`/dashboard`** — the product. Two run modes:
  - **Live agent** — real Claude (`claude-sonnet-4-6`) drives a stateful shop
    through tools, reasons out loud, and reports each invariant it breaks. Streamed
    live over SSE from `POST /api/audit`.
  - **Demo run** — a deterministic, offline replay of a known-good run. The
    dashboard **auto-falls back** to this if the live agent is unavailable, so the
    demo never breaks on stage.
- **`/demo-shop`** — the target under audit: a Northwind store with three real
  business-logic bugs seeded into the *logic* (`src/lib/shop-engine.ts`), not the UI.
- **`/architecture`** — the technical write-up.

The seeded invariant violations:

| Code | Invariant | Bug |
|------|-----------|-----|
| `NEGATIVE_TOTAL` | quantity ≥ 1 | the cart accepts negative quantities → negative totals |
| `COUPON_STACK`   | coupon redeemable once | the same coupon stacks every submit |
| `UNPAID_ORDER`   | no PAID order without capture | a mid-checkout refresh confirms an order with $0 captured |

### Run locally

```bash
npm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000/dashboard
```

Without `ANTHROPIC_API_KEY` the app still runs — the dashboard plays the
deterministic demo run.

### Deploy

- **Vercel** — zero-config Next.js. Set `ANTHROPIC_API_KEY` in the project env.
  The live audit route declares `maxDuration = 60`.
- **Render** — a `render.yaml` blueprint is included (persistent Node server, no
  request timeout — ideal for the streaming agent). Set `ANTHROPIC_API_KEY` as a
  secret in the dashboard.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Anthropic SDK (tool use +
prompt caching) · SSE streaming.

## ⚠️ Deploying (Vercel, Render, etc.)

Deploy platforms like **Vercel**, **Render** or **Netlify** can only connect to
repositories **you own** — they can't be granted access to this organization repo.
To deploy while keeping your commits here, mirror your code to a personal repo:

1. Create a **personal** repository on your own GitHub account.
2. Point your local `origin` at **both** repos, so a single `git push` updates each one:

   ```bash
   # this org repo (keep it as a push target)...
   git remote set-url --add --push origin https://github.com/platanus-build-night/platanus-build-night-26-mx-SantiagoArias07.git
   # ...and your personal repo
   git remote set-url --add --push origin https://github.com/<your-user>/<your-repo>.git
   ```

   From now on `git push` sends every commit to **both** repositories.
3. Connect your deploy service (Vercel, Render, …) to your **personal** repo and deploy from there.

Your commits stay mirrored here for judging, while the deploy runs from the repo you control.

Have fun! 🚀
