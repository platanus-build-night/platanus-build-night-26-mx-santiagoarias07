/* ============================================================
   INVARIANT — demo targets
   3 pre-scripted audit targets: ecommerce, saas, banking.
   Each has its own RUN timeline, FINDINGS, TESTS, and frame map.
   The live Claude agent only runs for ecommerce; the other two
   auto-fall back to their scripted demos.
   ============================================================ */

import {
  RUN, FINDINGS, TESTS,
  type RunEvent, type Finding, type FrameId, type TestSpec,
} from "@/lib/data";

export type DemoTarget = {
  id: "ecommerce" | "saas" | "banking";
  name: string;
  category: string;
  url: string;
  liveEnabled: boolean;
  run: RunEvent[];
  findings: Finding[];
  tests: Record<string, TestSpec>;
  frameOrder: FrameId[];
  framePath: Partial<Record<FrameId, string>>;
};

/* ============================================================
   ECOMMERCE — Northwind (reuses existing data verbatim)
   ============================================================ */
const ecommerce: DemoTarget = {
  id: "ecommerce",
  name: "Northwind",
  category: "E-commerce",
  url: "demo-shop.invariant.dev",
  liveEnabled: true,
  run: RUN,
  findings: FINDINGS,
  tests: TESTS,
  frameOrder: ["home","cart","cartQty","cartNeg","coupon1","coupon3","checkout","orderPaid"],
  framePath: {
    home: "/", cart: "/cart", cartQty: "/cart", cartNeg: "/cart",
    coupon1: "/cart", coupon3: "/cart", checkout: "/checkout", orderPaid: "/order/1041",
  },
};

/* ============================================================
   SAAS — Orbit (subscription management)
   ============================================================ */
const RUN_SAAS: RunEvent[] = [
  { k:"sys", phase:"explore", frame:"saas-home", txt:"Audit started — target acquired", sub:"https://saas.invariant.dev", dur:900 },
  { k:"nav", txt:"Launching Chromium via Playwright", sub:"GET /", dur:700 },
  { k:"see", txt:"Captured DOM snapshot", sub:"31 interactive nodes · billing dashboard · team panel", dur:800 },
  { k:"think", txt:"This is a subscription management app. Trial expiry, feature access after downgrade, and seat limits are the trust boundaries.", dur:1700 },
  { k:"nav", txt:"Navigating /billing", frame:"saas-billing", dur:800 },
  { k:"see", txt:"Found trial banner (12 days left), plan selector, API key panel.", sub:"DOM + screenshot captured", dur:900 },
  { k:"think", txt:"Three things a SaaS must never get wrong: when trials expire, what features Free gets, how many seats fit. Stating each.", dur:1700 },

  { k:"inv", phase:"hypothesize", id:"INV-01", txt:"Trial period expires exactly 14 days after signup — plan changes don't reset the clock.", dur:1100 },
  { k:"inv", id:"INV-02", txt:"Downgrading to Free removes access to premium API endpoints within one billing cycle.", dur:1100 },
  { k:"inv", id:"INV-03", txt:"Active team members cannot exceed the plan's seat limit.", dur:1100 },
  { k:"think", txt:"Cheapest attack: change plans mid-trial and see if the expiry counter resets.", dur:1300 },

  { k:"atk", phase:"attack", frame:"saas-planChange", txt:"Change plan: Trial → Pro → Trial", sub:"POST /billing/plan", dur:1000 },
  { k:"see", txt:"Plan selector accepted both changes. Checking trial_ends_at.", dur:900 },
  { k:"atk", txt:"Read trial expiry from /account", frame:"saas-trialReset", dur:900 },
  { k:"viol", finding:"F-01", txt:"trial_ends_at reset to now+14d. Changing plan mid-trial zeroed the counter.", sub:"INV-01 violated — trial can be extended indefinitely", dur:1900 },
  { k:"think", txt:"Confirmed. Next: downgrade to Free and probe whether the API key still returns premium data.", dur:1300 },

  { k:"atk", txt:"Downgrade plan to Free", frame:"saas-downgrade", sub:"POST /billing/plan {plan: 'free'}", dur:900 },
  { k:"chk", txt:"Plan shows Free. Expected.", dur:750 },
  { k:"atk", txt:"GET /api/v1/analytics with existing API key", frame:"saas-apiAccess", dur:950 },
  { k:"viol", finding:"F-02", txt:"Analytics returned 200 with full data on a Free plan.", sub:"INV-02 violated — downgrade doesn't revoke API access", dur:1800 },

  { k:"atk", txt:"Invite 6th member to 5-seat team", frame:"saas-seatOverflow", sub:"POST /team/invite", dur:950 },
  { k:"see", txt:"Invite accepted. No seat cap enforced at invite time.", dur:900 },
  { k:"viol", finding:"F-03", txt:"Team has 6 active members on a 5-seat plan.", sub:"INV-03 violated — seat limit not enforced at invite", dur:1800 },

  { k:"sys", phase:"report", txt:"Attack surface exhausted", sub:"3 contradictions · 0 false positives", dur:1000 },
  { k:"rep", txt:"Generating reproducible Playwright regression tests…", dur:1200 },
  { k:"rep", test:true, txt:"3 regression specs written to repo", sub:"one per finding", dur:900 },
  { k:"sys", txt:"Audit complete", sub:"runtime 00:41 · 3 findings", done:true, dur:500 },
];

const FINDINGS_SAAS: Finding[] = [
  {
    id:"F-01", sev:"crit", invariant:"INV-01", order:1,
    title:"Plan change resets trial expiry counter",
    rule:"Trial period expires exactly 14 days after signup — plan changes don't reset the clock.",
    where:"/billing · plan selector",
    expected:"trial_ends_at stays at original signup_date + 14 days.",
    actual:"Changing plan mid-trial resets trial_ends_at to now + 14 days. Cycling plans extends the trial indefinitely.",
    impact:"Free trial abuse: any user can extend their trial forever by cycling between plans — zero revenue conversion.",
    steps:[
      "Sign up → trial_ends_at = signup + 14d",
      "Change plan to Pro",
      "Change plan back to Trial",
      "Observe trial_ends_at = now + 14d (reset)",
    ],
    test:"INV-01",
  },
  {
    id:"F-02", sev:"high", invariant:"INV-02", order:2,
    title:"API key retains premium access after downgrade",
    rule:"Downgrading to Free removes access to premium API endpoints within one billing cycle.",
    where:"/api/v1/analytics · API key auth",
    expected:"GET /api/v1/analytics returns 403 on a Free plan.",
    actual:"Existing API key returns 200 with full analytics data even after downgrade to Free.",
    impact:"Customers access premium features indefinitely after cancelling — revenue leak and entitlement drift at scale.",
    steps:[
      "Create API key on Pro plan",
      "Downgrade plan to Free",
      "Call GET /api/v1/analytics with the key",
      "Response: 200 OK with full data",
    ],
    test:"INV-02",
  },
  {
    id:"F-03", sev:"med", invariant:"INV-03", order:3,
    title:"Team seats can exceed plan limit via concurrent invites",
    rule:"Active team members cannot exceed the plan's seat limit.",
    where:"/team · invite form",
    expected:"6th invite on a 5-seat plan returns 422 Seat limit reached.",
    actual:"Invite accepted without seat count validation. Team grows to 6/5 active members.",
    impact:"Customers get more seats than they pay for; billing and access control desync across the org.",
    steps:[
      "5-seat plan with 5 active members",
      "POST /team/invite for a 6th member",
      "Response: 200 — invite sent",
      "Team shows 6/5 seats",
    ],
    test:"INV-03",
  },
];

const TESTS_SAAS: Record<string, TestSpec> = {
  "INV-01": {
    file:"tests/invariant-01.spec.ts", finding:"F-01",
    code:`import { test, expect } from '@playwright/test';

// INV-01 — trial expiry must not reset on plan change
// Generated by Invariant · finding F-01 · 2026-05-29
test('plan change does not reset trial counter', async ({ page }) => {
  await page.goto('https://saas.invariant.dev/billing');
  const before = await page.getByTestId('trial-ends-at').textContent();

  await page.getByRole('button', { name: 'Change plan' }).click();
  await page.getByRole('option', { name: 'Pro' }).click();
  await page.getByRole('button', { name: 'Change plan' }).click();
  await page.getByRole('option', { name: 'Trial' }).click();

  const after = await page.getByTestId('trial-ends-at').textContent();
  expect(after).toBe(before); // counter must not reset
});`,
  },
  "INV-02": {
    file:"tests/invariant-02.spec.ts", finding:"F-02",
    code:`import { test, expect } from '@playwright/test';

// INV-02 — API key must lose premium access after downgrade
// Generated by Invariant · finding F-02 · 2026-05-29
test('downgrade revokes premium API access', async ({ request }) => {
  await request.post('https://saas.invariant.dev/billing/plan', {
    data: { plan: 'free' },
  });

  const res = await request.get('https://saas.invariant.dev/api/v1/analytics', {
    headers: { Authorization: 'Bearer test-api-key' },
  });
  expect(res.status()).toBe(403);
});`,
  },
  "INV-03": {
    file:"tests/invariant-03.spec.ts", finding:"F-03",
    code:`import { test, expect } from '@playwright/test';

// INV-03 — seat count cannot exceed plan limit
// Generated by Invariant · finding F-03 · 2026-05-29
test('invite rejected when seat limit reached', async ({ page }) => {
  await page.goto('https://saas.invariant.dev/team');
  await page.getByRole('button', { name: 'Invite member' }).click();
  await page.getByPlaceholder('Email').fill('sixth@example.com');
  await page.getByRole('button', { name: 'Send invite' }).click();

  await expect(page.getByRole('alert'))
    .toContainText('Seat limit reached');
});`,
  },
};

const saas: DemoTarget = {
  id: "saas",
  name: "Orbit",
  category: "SaaS / Billing",
  url: "saas.invariant.dev",
  liveEnabled: true,
  run: RUN_SAAS,
  findings: FINDINGS_SAAS,
  tests: TESTS_SAAS,
  frameOrder: ["saas-home","saas-billing","saas-planChange","saas-trialReset","saas-downgrade","saas-apiAccess","saas-seatOverflow"],
  framePath: {
    "saas-home": "/", "saas-billing": "/billing", "saas-planChange": "/billing",
    "saas-trialReset": "/account", "saas-downgrade": "/billing",
    "saas-apiAccess": "/api/v1/analytics", "saas-seatOverflow": "/team",
  },
};

/* ============================================================
   BANKING — Flux (transfer & ledger)
   ============================================================ */
const RUN_BANKING: RunEvent[] = [
  { k:"sys", phase:"explore", frame:"bank-home", txt:"Audit started — target acquired", sub:"https://banking.invariant.dev", dur:900 },
  { k:"nav", txt:"Launching Chromium via Playwright", sub:"GET /", dur:700 },
  { k:"see", txt:"Captured DOM snapshot", sub:"24 interactive nodes · account overview · transfer form", dur:800 },
  { k:"think", txt:"Banking transfer flow. Amount integrity, idempotency, and overdraft prevention are the invariants with the highest blast radius.", dur:1700 },
  { k:"nav", txt:"Navigating /transfer", frame:"bank-transfer", dur:800 },
  { k:"see", txt:"Found amount field, recipient selector, reference field, submit button.", sub:"DOM + screenshot captured", dur:900 },
  { k:"think", txt:"Three invariants: positive amounts only, idempotent submissions, no overdraft. Cheapest first — negative amount.", dur:1700 },

  { k:"inv", phase:"hypothesize", id:"INV-01", txt:"Transfer amount must be a positive number greater than zero.", dur:1100 },
  { k:"inv", id:"INV-02", txt:"Re-submitting the same transfer reference must be rejected as a duplicate.", dur:1100 },
  { k:"inv", id:"INV-03", txt:"Account balance must never go below $0 after a transfer including transaction fees.", dur:1100 },
  { k:"think", txt:"If a negative transfer is accepted, money flows the wrong direction. Testing now.", dur:1300 },

  { k:"atk", phase:"attack", frame:"bank-transfer", txt:"Enter amount = -500 in transfer form", sub:"fill amount='-500' · blur()", dur:1000 },
  { k:"see", txt:"Field accepted -500. No client-side validation.", dur:900 },
  { k:"atk", txt:"Submit transfer", frame:"bank-negTransfer", dur:900 },
  { k:"viol", finding:"F-01", txt:"Transfer of -$500 processed. Recipient balance decreased by $500.", sub:"INV-01 violated — negative transfer reversed money flow", dur:1900 },
  { k:"think", txt:"Confirmed. Idempotency next — can I double-debit with the same reference?", dur:1300 },

  { k:"atk", txt:"Submit transfer $200 (ref: T-0041)", frame:"bank-transfer1", sub:"POST /transfers {amount:200, ref:'T-0041'}", dur:950 },
  { k:"chk", txt:"Transfer #T-0041 created. Expected.", dur:750 },
  { k:"atk", txt:"Re-submit identical payload", frame:"bank-transfer2", dur:950 },
  { k:"viol", finding:"F-02", txt:"Transfer #T-0042 created. Same reference accepted twice — $200 debited twice.", sub:"INV-02 violated — no idempotency on transfer endpoint", dur:1800 },

  { k:"atk", txt:"Transfer exact balance $1,200 (fee $4.99 applied post-check)", frame:"bank-overdraft", sub:"POST /transfers {amount:1200}", dur:950 },
  { k:"see", txt:"Transfer accepted. Fee deducted after balance check.", dur:900 },
  { k:"viol", finding:"F-03", txt:"Balance: -$4.99. Fee applied after the zero-balance guard.", sub:"INV-03 violated — fee bypasses overdraft protection", dur:1800 },

  { k:"sys", phase:"report", txt:"Attack surface exhausted", sub:"3 contradictions · 0 false positives", dur:1000 },
  { k:"rep", txt:"Generating reproducible Playwright regression tests…", dur:1200 },
  { k:"rep", test:true, txt:"3 regression specs written to repo", sub:"one per finding", dur:900 },
  { k:"sys", txt:"Audit complete", sub:"runtime 00:43 · 3 findings", done:true, dur:500 },
];

const FINDINGS_BANKING: Finding[] = [
  {
    id:"F-01", sev:"crit", invariant:"INV-01", order:1,
    title:"Negative transfer amount reverses money flow",
    rule:"Transfer amount must be a positive number greater than zero.",
    where:"/transfer · amount field",
    expected:"Amount field rejects values ≤ 0; transfer rejected with 422.",
    actual:"Field accepts -500. Transfer processed — recipient balance decreases by $500 instead of increasing.",
    impact:"Direct theft vector. Attacker can drain any recipient account by sending negative transfers.",
    steps:[
      "Open /transfer",
      "Enter amount = -500 in the amount field",
      "Blur — no validation fires",
      "Submit — transfer processed, recipient balance -$500",
    ],
    test:"INV-01",
  },
  {
    id:"F-02", sev:"high", invariant:"INV-02", order:2,
    title:"Duplicate transfer reference creates double debit",
    rule:"Re-submitting the same transfer reference must be rejected as a duplicate.",
    where:"/transfer · submit button",
    expected:"Second POST with same ref returns 409 Duplicate transfer.",
    actual:"Transfer #T-0042 created with identical payload. Sender debited $200 twice.",
    impact:"Double charges on any transfer — user error or network retry causes duplicate debits. Severe reconciliation risk.",
    steps:[
      "POST /transfers {amount:200, ref:'T-0041'} → 201 T-0041 created",
      "POST /transfers {amount:200, ref:'T-0041'} again",
      "Response: 201 T-0042 created",
      "Balance shows -$400 (double debit)",
    ],
    test:"INV-02",
  },
  {
    id:"F-03", sev:"med", invariant:"INV-03", order:3,
    title:"Transaction fee bypasses overdraft guard",
    rule:"Account balance must never go below $0 after a transfer including fees.",
    where:"/transfer · fee calculation",
    expected:"Transfer rejected if amount + fee > balance.",
    actual:"Balance check runs before fee application. Transfer for exact balance ($1,200) succeeds; $4.99 fee then drives balance to -$4.99.",
    impact:"Unintended overdrafts silently created. Regulatory risk and reconciliation drift at scale.",
    steps:[
      "Account balance = $1,200.00",
      "Submit transfer for $1,200 (all funds)",
      "Balance check passes (1200 ≤ 1200)",
      "Fee $4.99 applied → balance = -$4.99",
    ],
    test:"INV-03",
  },
];

const TESTS_BANKING: Record<string, TestSpec> = {
  "INV-01": {
    file:"tests/invariant-01.spec.ts", finding:"F-01",
    code:`import { test, expect } from '@playwright/test';

// INV-01 — transfer amount must be positive
// Generated by Invariant · finding F-01 · 2026-05-29
test('negative transfer amount is rejected', async ({ page }) => {
  await page.goto('https://banking.invariant.dev/transfer');
  const amount = page.getByTestId('transfer-amount');
  await amount.fill('-500');
  await amount.blur();

  // field must clamp or reject
  const val = await amount.inputValue();
  expect(Number(val)).toBeGreaterThan(0);

  // or submit and expect rejection
  await page.getByRole('button', { name: 'Transfer' }).click();
  await expect(page.getByTestId('transfer-error'))
    .toContainText(/invalid.*amount|must be positive/i);
});`,
  },
  "INV-02": {
    file:"tests/invariant-02.spec.ts", finding:"F-02",
    code:`import { test, expect } from '@playwright/test';

// INV-02 — duplicate transfer reference must be rejected
// Generated by Invariant · finding F-02 · 2026-05-29
test('duplicate transfer reference returns 409', async ({ request }) => {
  const payload = { amount: 200, recipient: 'acc_123', ref: 'T-TEST-001' };

  const first = await request.post('https://banking.invariant.dev/transfers', {
    data: payload,
  });
  expect(first.status()).toBe(201);

  const second = await request.post('https://banking.invariant.dev/transfers', {
    data: payload, // identical ref
  });
  expect(second.status()).toBe(409); // must reject duplicate
});`,
  },
  "INV-03": {
    file:"tests/invariant-03.spec.ts", finding:"F-03",
    code:`import { test, expect } from '@playwright/test';

// INV-03 — fee must be included in overdraft check
// Generated by Invariant · finding F-03 · 2026-05-29
test('transfer including fee cannot overdraft account', async ({ request }) => {
  // assumes account balance = $1200 and fee = $4.99
  const res = await request.post('https://banking.invariant.dev/transfers', {
    data: { amount: 1200, recipient: 'acc_456' },
  });

  if (res.status() === 201) {
    // if accepted, balance must not go negative
    const account = await request.get('https://banking.invariant.dev/account');
    const { balance } = await account.json();
    expect(balance).toBeGreaterThanOrEqual(0);
  }
  // otherwise 422 is also acceptable — transfer + fee > balance
  expect([201, 422]).toContain(res.status());
});`,
  },
};

const banking: DemoTarget = {
  id: "banking",
  name: "Flux",
  category: "Banking / Fintech",
  url: "banking.invariant.dev",
  liveEnabled: true,
  run: RUN_BANKING,
  findings: FINDINGS_BANKING,
  tests: TESTS_BANKING,
  frameOrder: ["bank-home","bank-transfer","bank-negTransfer","bank-transfer1","bank-transfer2","bank-overdraft"],
  framePath: {
    "bank-home": "/", "bank-transfer": "/transfer", "bank-negTransfer": "/transfer",
    "bank-transfer1": "/transfers/T-0041", "bank-transfer2": "/transfers/T-0042",
    "bank-overdraft": "/account",
  },
};

export const DEMO_TARGETS: Record<string, DemoTarget> = { ecommerce, saas, banking };
export const DEMO_TARGET_LIST = [ecommerce, saas, banking];
