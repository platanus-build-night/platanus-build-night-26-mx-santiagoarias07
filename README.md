# Santiago Arias Paul — Platanus Build Night — Ciudad de México Project

<img src="./project-logo.png" alt="Invariant logo" width="120" />

**Hacker:** Santiago Arias Paul ([@SantiagoArias07](https://github.com/SantiagoArias07))

Before submitting:

- ✅ Set a project name, oneliner and description in `build-night-project.json`
- ✅ Provide a 1000x1000 png project logo, max 500kb (`project-logo.png`)
- ✅ Provide a concise and to the point readme
- ⚠️ Deploying (see section below)

---

<p align="center">
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="#f5a04a" stroke-width="1.8" stroke-dasharray="34 8"/>
    <circle cx="20" cy="4" r="3.2" fill="#fb5a52"/>
  </svg>
</p>

# Invariant

**Autonomous adversarial QA agent that finds business-logic bugs — and writes the regression test.**

> Your tests check what you remembered. Invariant attacks what you forgot.

---

## What it does

Traditional QA verifies that the *happy path* works. Invariant does the opposite — it tries to prove that your app's hidden assumptions are **false**.

It explores the interface, infers the business rules that must always hold:

- *"A coupon is redeemable at most once per cart."*
- *"Every line quantity is an integer ≥ 1."*
- *"No order reaches PAID without a captured payment."*

Then it attacks each rule until something contradicts itself. When a contradiction is found, it automatically generates a **Playwright regression test** — so the bug is locked shut forever.

---

## Demo

**Live:** [invariant-mx.vercel.app](https://invariant-mx.vercel.app)

| Page | Description |
|------|-------------|
| `/` | Landing page |
| `/dashboard` | The product — launch an audit, watch the agent work |
| `/demo-shop` | Target under audit: Northwind store with 3 seeded bugs |
| `/architecture` | Technical design doc |

---

## How it works

### Two run modes

**Live agent** — real `claude-sonnet-4-6` drives a stateful shop engine through tool use, reasons out loud, and reports each invariant it breaks. Streamed live over SSE from `POST /api/audit`. Includes prompt caching.

**Demo run** — a deterministic, offline replay of a known-good run. The dashboard auto-falls back to this if the live agent is unavailable (no API key, timeout, etc.) — so the demo never breaks on stage.

### Three auditable targets

| Target | Category | Live agent |
|--------|----------|-----------|
| **Northwind** | E-commerce checkout | ✅ |
| **Orbit** | SaaS / Billing | ✅ |
| **Flux** | Banking / Fintech | ✅ |

Each target has its own stateful engine with seeded invariant violations. Claude audits all three through tool use — no browser, no external network.

### Seeded bugs (per target)

**Northwind (e-commerce)**

| Code | Invariant | Bug |
|------|-----------|-----|
| `NEGATIVE_TOTAL` | quantity ≥ 1 | Cart accepts negative quantities → negative subtotal |
| `COUPON_STACK` | coupon redeemable once | Same coupon stacks on every submit |
| `UNPAID_ORDER` | no PAID order without capture | Mid-checkout refresh confirms order with $0 captured |

**Orbit (SaaS billing)**

| Code | Invariant | Bug |
|------|-----------|-----|
| `TRIAL_RESET` | trial expiry never resets | Changing plan mid-trial resets `trial_ends_at` to now+14d |
| `API_NOT_REVOKED` | downgrade revokes premium access | API key returns 200 on premium endpoints after downgrade to Free |
| `SEAT_OVERFLOW` | seats ≤ plan limit | 6th invite accepted on a 5-seat plan |

**Flux (banking)**

| Code | Invariant | Bug |
|------|-----------|-----|
| `NEGATIVE_TRANSFER` | amount > 0 | Negative transfer accepted — money flows in wrong direction |
| `DUPLICATE_TRANSFER` | duplicate ref rejected | Same reference accepted twice → double debit |
| `OVERDRAFT_FEE` | balance never < $0 | Fee applied after balance check → overdraft |

### Dual output: security findings + UX recommendations

Every audit produces two classes of output, color-coded in the live feed:

🔴 **Invariant violations** (red/amber) — confirmed business-logic bugs with expected vs. actual, reproduction steps, and a generated Playwright regression test.

💡 **UX suggestions** (blue) — friction points Claude observes while exploring the interface: missing loading states, disabled buttons that invite duplicate clicks, undisclosed fees. These don't break invariants but hurt conversion.

Each audit emits up to 3 UX suggestions alongside the security findings — a dual report that protects both revenue integrity and conversion rate.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 App Router · React 19 · TypeScript |
| AI | Anthropic SDK · tool use · prompt caching · SSE streaming |
| Model | `claude-sonnet-4-6` |
| Shop engine | Stateful in-memory engine (`src/lib/shop-engine.ts`) |
| Styling | Custom CSS design system (Geist + Geist Mono) |

---

## Run locally

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # → http://localhost:3000/dashboard
```

Without `ANTHROPIC_API_KEY` the app still runs fully — it plays the deterministic demo.

---

## Deploy

**Vercel** — zero-config Next.js. Set `ANTHROPIC_API_KEY` in project environment variables. The live audit route uses `maxDuration = 60`.

**Render** — a `render.yaml` blueprint is included (persistent Node server, no request timeout — better for streaming). Set `ANTHROPIC_API_KEY` as a secret.

---

## ⚠️ Deploying (Vercel, Render, etc.)

Deploy platforms like Vercel, Render or Netlify can only connect to repositories you own — they can't be granted access to this organization repo. To deploy while keeping your commits here, mirror your code to a personal repo:

1. Create a personal repository on your own GitHub account.
2. Point your local `origin` at both repos, so a single `git push` updates each one:

```bash
# this org repo (keep it as a push target)
git remote set-url --add --push origin https://github.com/platanus-build-night/platanus-build-night-26-mx-SantiagoArias07.git
# your personal repo
git remote set-url --add --push origin https://github.com/<your-user>/<your-repo>.git
```

From now on `git push` sends every commit to both repositories.

3. Connect your deploy service to your personal repo and deploy from there.

Your commits stay mirrored here for judging, while the deploy runs from the repo you control.

Have fun! 🚀
