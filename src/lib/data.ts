/* ============================================================
   INVARIANT — demo data
   The scripted autonomous run, findings, and generated tests.
   ============================================================ */

export const TARGET = "https://demo-shop.invariant.dev";

export type PhaseId = "explore" | "hypothesize" | "attack" | "report";

export type Phase = {
  id: PhaseId;
  label: string;
  n: string;
};

export const PHASES: Phase[] = [
  { id: "explore", label: "Explore", n: "01" },
  { id: "hypothesize", label: "Hypothesize", n: "02" },
  { id: "attack", label: "Adversarial", n: "03" },
  { id: "report", label: "Report", n: "04" },
];

export type EventKind =
  | "sys"
  | "nav"
  | "see"
  | "think"
  | "inv"
  | "atk"
  | "chk"
  | "viol"
  | "rep";

export type FrameId =
  | "home"
  | "cart"
  | "cartQty"
  | "cartNeg"
  | "coupon1"
  | "coupon3"
  | "checkout"
  | "orderPaid";

export type RunEvent = {
  k: EventKind;
  txt: string;
  sub?: string;
  id?: string;
  phase?: PhaseId;
  frame?: FrameId;
  finding?: string;
  test?: boolean;
  done?: boolean;
  dur?: number;
};

export type RunEventWithTs = RunEvent & { ts: string };

export const RUN: RunEvent[] = [
  {
    k: "sys",
    phase: "explore",
    frame: "home",
    txt: "Audit started — target acquired",
    sub: TARGET,
    dur: 1100,
  },
  { k: "nav", txt: "Launching Chromium via Playwright", sub: "GET /", dur: 900 },
  {
    k: "see",
    txt: "Captured DOM snapshot",
    sub: "47 interactive nodes · 1 form · 3 routes",
    dur: 850,
  },
  {
    k: "think",
    txt: "This is a checkout flow. I’ll map the surface before I push on it — assumptions are easiest to find at the edges.",
    dur: 1700,
  },
  { k: "nav", txt: "Navigating /cart", frame: "cart", dur: 950 },
  {
    k: "see",
    txt: "Found quantity stepper, coupon field, “Place order”.",
    sub: "DOM + screenshot captured",
    dur: 1100,
  },
  {
    k: "think",
    txt: "Three things a checkout must never get wrong: price, discounts, payment state. I’ll state each as an invariant, then try to break it.",
    dur: 1900,
  },

  {
    k: "inv",
    phase: "hypothesize",
    id: "INV-01",
    txt: "A coupon is redeemable at most once per cart.",
    dur: 1150,
  },
  { k: "inv", id: "INV-02", txt: "Every line quantity is an integer ≥ 1.", dur: 1150 },
  {
    k: "inv",
    id: "INV-03",
    txt: "Order total equals Σ(price × quantity) of validated lines.",
    dur: 1250,
  },
  {
    k: "think",
    txt: "Cheapest attack first: can I make the cart pay me? Probing INV-02.",
    dur: 1500,
  },

  {
    k: "atk",
    phase: "attack",
    frame: "cartQty",
    txt: "Set line quantity → -2 via stepper input",
    sub: "fill('-2') · blur()",
    dur: 1050,
  },
  { k: "see", txt: "Field accepted -2. No client validation fired.", dur: 1000 },
  { k: "atk", txt: "Recompute cart total", frame: "cartNeg", dur: 1100 },
  {
    k: "viol",
    finding: "F-01",
    txt: "Line total = -$359.98 · subtotal fell to -$320.00.",
    sub: "INV-02 violated — the store now owes the customer",
    dur: 2000,
  },
  {
    k: "think",
    txt: "That’s real. Repro captured. I don’t stop at one — back to the surface.",
    dur: 1500,
  },

  {
    k: "atk",
    txt: "Apply coupon SAVE20",
    frame: "coupon1",
    sub: "submit coupon form",
    dur: 950,
  },
  { k: "chk", txt: "−20% applied. Expected.", dur: 850 },
  { k: "atk", txt: "Re-submit SAVE20 ×2", frame: "coupon3", dur: 1000 },
  {
    k: "viol",
    finding: "F-02",
    txt: "Discount stacked to −60%.",
    sub: "INV-01 violated — coupon redeemable repeatedly",
    dur: 1900,
  },

  {
    k: "atk",
    txt: "Begin checkout, hard-refresh mid-submit",
    frame: "checkout",
    dur: 1100,
  },
  {
    k: "see",
    txt: "Cart cleared client-side; server kept the pending order.",
    dur: 1100,
  },
  { k: "atk", txt: "Re-submit order", frame: "orderPaid", dur: 1000 },
  {
    k: "viol",
    finding: "F-03",
    txt: "Order #1041 created in PAID state — $0.00 captured.",
    sub: "INV-03 violated — checkout state desynchronized",
    dur: 1900,
  },

  {
    k: "sys",
    phase: "report",
    txt: "Attack surface exhausted",
    sub: "12 probes · 3 contradictions · 0 false positives",
    dur: 1200,
  },
  { k: "rep", txt: "Generating reproducible Playwright regression tests…", dur: 1400 },
  { k: "rep", test: true, txt: "invariant-02.spec.ts ready", sub: "+ 2 more", dur: 1100 },
  {
    k: "sys",
    txt: "Audit complete",
    sub: "runtime 00:38 · 3 findings",
    done: true,
    dur: 600,
  },
];

export type Severity = "crit" | "high" | "med" | "low";

export type Finding = {
  id: string;
  sev: Severity;
  invariant: string;
  order: number;
  title: string;
  rule: string;
  where: string;
  expected: string;
  actual: string;
  impact: string;
  steps: string[];
  test: string;
};

export const FINDINGS: Finding[] = [
  {
    id: "F-01",
    sev: "crit",
    invariant: "INV-02",
    order: 1,
    title: "Negative quantity manipulates order total",
    rule: "Every line quantity is an integer ≥ 1.",
    where: "/cart · quantity stepper",
    expected:
      "Quantity field rejects values < 1; subtotal never decreases below the validated line floor.",
    actual:
      "Field accepts -2. The line total becomes -$359.98 and the subtotal falls to -$320.00 — the store now owes the customer money for taking goods.",
    impact:
      "Direct revenue loss / theft. An attacker self-issues arbitrary discounts, or makes the store owe them money.",
    steps: [
      "Add “Aero Mechanical Keyboard” ($179.99) to cart",
      "Focus the quantity input and enter -2",
      "Blur the field — no validation fires",
      "Observe subtotal = -$320.00 (was $219.97)",
    ],
    test: "INV-02",
  },
  {
    id: "F-02",
    sev: "high",
    invariant: "INV-01",
    order: 2,
    title: "Coupon can be redeemed repeatedly",
    rule: "A coupon is redeemable at most once per cart.",
    where: "/cart · coupon form",
    expected:
      "Second submission of the same code is rejected with “already applied”.",
    actual:
      "SAVE20 stacks on every submit. Three submissions = −60%. No idempotency on the coupon endpoint.",
    impact:
      "Margin erosion at scale; trivially scriptable to drive any order to ~$0.",
    steps: [
      "Apply coupon SAVE20 → −20%",
      "Submit SAVE20 again → −40%",
      "Submit once more → −60%",
    ],
    test: "INV-01",
  },
  {
    id: "F-03",
    sev: "med",
    invariant: "INV-03",
    order: 3,
    title: "Checkout state desync creates unpaid PAID orders",
    rule: "Order total equals Σ(price × quantity) of validated lines.",
    where: "/checkout",
    expected:
      "A refresh mid-submit either resumes or voids the pending order; no order reaches PAID without capture.",
    actual:
      "Hard-refresh during submit clears the client cart while the server keeps the pending order. Re-submitting marks order #1041 PAID with $0.00 captured.",
    impact:
      "Fulfilment of unpaid orders; reconciliation drift between cart, order, and payment.",
    steps: [
      "Begin checkout with items in cart",
      "Hard-refresh the page during “Place order”",
      "Re-submit — order is created in PAID state",
    ],
    test: "INV-03",
  },
];

export type TestSpec = { file: string; finding: string; code: string };

export const TESTS: Record<string, TestSpec> = {
  "INV-02": {
    file: "tests/invariant-02.spec.ts",
    finding: "F-01",
    code: `import { test, expect } from '@playwright/test';

// INV-02 — line quantity must be an integer >= 1
// Generated by Invariant · finding F-01 · 2026-05-29
test('cart rejects negative quantity', async ({ page }) => {
  await page.goto('${TARGET}/cart');

  const qty = page.getByTestId('qty-input');
  await qty.fill('-2');
  await qty.blur();

  // the field must refuse values below the floor
  await expect(qty).toHaveValue('1');

  // and the total can never fall below the validated line
  const total = parseMoney(
    await page.getByTestId('cart-total').innerText()
  );
  expect(total).toBeGreaterThan(0);
});

function parseMoney(s: string): number {
  return Number(s.replace(/[^0-9.-]/g, ''));
}`,
  },
  "INV-01": {
    file: "tests/invariant-01.spec.ts",
    finding: "F-02",
    code: `import { test, expect } from '@playwright/test';

// INV-01 — a coupon is redeemable at most once per cart
// Generated by Invariant · finding F-02 · 2026-05-29
test('coupon cannot stack', async ({ page }) => {
  await page.goto('${TARGET}/cart');
  const code = page.getByTestId('coupon-input');
  const apply = page.getByRole('button', { name: 'Apply' });

  await code.fill('SAVE20');
  await apply.click();
  await apply.click(); // second attempt must be rejected

  await expect(page.getByTestId('coupon-error'))
    .toHaveText(/already applied/i);
  await expect(page.getByTestId('discount'))
    .toHaveText('-20%');
});`,
  },
  "INV-03": {
    file: "tests/invariant-03.spec.ts",
    finding: "F-03",
    code: `import { test, expect } from '@playwright/test';

// INV-03 — no order reaches PAID without a captured payment
// Generated by Invariant · finding F-03 · 2026-05-29
test('refresh during checkout cannot create unpaid order', async ({ page }) => {
  await page.goto('${TARGET}/checkout');
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.reload();                 // hard-refresh mid-submit
  await page.getByRole('button', { name: 'Place order' }).click();

  const status = await page.getByTestId('order-status').innerText();
  const captured = await page.getByTestId('amount-captured').innerText();
  expect(status === 'PAID' && captured === '$0.00').toBeFalsy();
});`,
  },
};

export type RunStatus = "running" | "done" | "clean";

export type HistoryRow = {
  id: string;
  target: string;
  when: string;
  runtime: string;
  crit: number;
  high: number;
  med: number;
  status: RunStatus;
};

export const HISTORY: HistoryRow[] = [
  {
    id: "#A-1042",
    target: "demo-shop.invariant.dev",
    when: "now",
    runtime: "00:38",
    crit: 1,
    high: 1,
    med: 1,
    status: "running",
  },
  {
    id: "#A-1039",
    target: "app.northwind.io",
    when: "2h ago",
    runtime: "01:12",
    crit: 0,
    high: 2,
    med: 1,
    status: "done",
  },
  {
    id: "#A-1031",
    target: "staging.fern.app",
    when: "yesterday",
    runtime: "00:51",
    crit: 0,
    high: 0,
    med: 2,
    status: "done",
  },
  {
    id: "#A-1024",
    target: "checkout.lumen.shop",
    when: "2 days ago",
    runtime: "02:03",
    crit: 2,
    high: 1,
    med: 0,
    status: "done",
  },
  {
    id: "#A-1018",
    target: "app.northwind.io",
    when: "3 days ago",
    runtime: "00:44",
    crit: 0,
    high: 0,
    med: 0,
    status: "clean",
  },
];
