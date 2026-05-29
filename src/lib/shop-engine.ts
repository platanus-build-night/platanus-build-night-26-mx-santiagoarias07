/* ============================================================
   INVARIANT — server-side shop under test
   A real, stateful e-commerce engine with three business-logic
   bugs seeded into the LOGIC (not the UI). The adversarial agent
   drives this through tools; every number the agent reports is
   computed here from real state, not hardcoded.

   Seeded invariant violations:
     INV-01  a coupon is redeemable at most once per cart   (stacks)
     INV-02  every line quantity is an integer >= 1          (accepts < 1)
     INV-03  no order reaches PAID without a captured payment (desync)
   ============================================================ */

import type { FrameId } from "@/lib/data";

export type Product = { id: string; name: string; price: number };

export type CartLine = {
  lineId: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
};

export type CouponApplication = { code: string; pct: number };

export type OrderStatus = "NONE" | "PENDING" | "PAID";

export type ToolResult = {
  /** Machine-readable observation handed back to Claude. */
  observation: Record<string, unknown>;
  /** Which browser frame this action lands on (drives the preview). */
  frame: FrameId;
  /** Feed event kind for the resulting observation. */
  kind: "see" | "chk" | "atk" | "nav";
  /** One-line human summary of the outcome (real numbers). */
  summary: string;
  /** Set when this action made the cart/order violate an invariant. */
  violation?: ViolationId;
};

export type ViolationId = "INV-01" | "INV-02" | "INV-03";

const money = (n: number) => (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
const round2 = (n: number) => Math.round(n * 100) / 100;

const CATALOG: Product[] = [
  { id: "kbd", name: "Aero75 Mechanical Keyboard", price: 179.99 },
  { id: "cable", name: "Braided USB-C Cable", price: 19.99 },
  { id: "mat", name: "Pro Desk Mat — XL", price: 34.0 },
  { id: "stand", name: "Aluminium Laptop Stand", price: 59.0 },
];

const COUPONS: Record<string, number> = { SAVE20: 0.2, WELCOME10: 0.1 };

export class Shop {
  products = CATALOG;
  cart: CartLine[] = [];
  coupons: CouponApplication[] = [];
  order: { id: number; status: OrderStatus; amountDue: number; amountCaptured: number } = {
    id: 1041,
    status: "NONE",
    amountDue: 0,
    amountCaptured: 0,
  };
  /** A simulated hard-refresh cleared the client cart but not the server order. */
  clientCleared = false;
  /** Violations the engine has actually observed, with ground-truth detail. */
  violations = new Map<ViolationId, string>();

  constructor() {
    // Land the agent on a realistic, pre-populated cart (as if it browsed in).
    this.cart = [
      { lineId: "kbd", productId: "kbd", name: "Aero75 Mechanical Keyboard", price: 179.99, qty: 1 },
      { lineId: "cable", productId: "cable", name: "Braided USB-C Cable", price: 19.99, qty: 2 },
    ];
  }

  /* ---------- derived money ---------- */
  subtotal() {
    return round2(this.cart.reduce((s, l) => s + l.price * l.qty, 0));
  }
  discountPct() {
    // BUG (INV-01): every application stacks, including duplicate codes.
    return Math.min(this.coupons.reduce((s, c) => s + c.pct, 0), 1);
  }
  discountAmount() {
    const sub = this.subtotal();
    return sub > 0 ? round2(sub * this.discountPct()) : 0;
  }
  total() {
    return round2(this.subtotal() - this.discountAmount());
  }

  private cartSnapshot() {
    return {
      lines: this.cart.map((l) => ({
        line_id: l.lineId,
        name: l.name,
        price: l.price,
        qty: l.qty,
        line_total: round2(l.price * l.qty),
      })),
      coupons_applied: this.coupons.map((c) => c.code),
      subtotal: this.subtotal(),
      discount_pct: this.discountPct(),
      discount_amount: this.discountAmount(),
      total: this.total(),
    };
  }

  /* ---------- invariant evaluation (ground truth) ---------- */
  private evaluate() {
    // INV-02 — every line quantity must be an integer >= 1
    const badLine = this.cart.find((l) => l.qty < 1);
    if (badLine) {
      this.violations.set(
        "INV-02",
        `line "${badLine.name}" qty=${badLine.qty} → line total ${money(
          round2(badLine.price * badLine.qty),
        )}; subtotal fell to ${money(this.subtotal())}`,
      );
    }
    // INV-01 — a coupon code is redeemable at most once per cart
    const counts = new Map<string, number>();
    for (const c of this.coupons) counts.set(c.code, (counts.get(c.code) || 0) + 1);
    const stacked = [...counts.entries()].find(([, n]) => n > 1);
    if (stacked) {
      this.violations.set(
        "INV-01",
        `coupon ${stacked[0]} applied ${stacked[1]}× → discount stacked to −${Math.round(
          this.discountPct() * 100,
        )}%`,
      );
    }
    // INV-03 — no order reaches PAID without a captured payment
    if (
      this.order.status === "PAID" &&
      this.order.amountCaptured <= 0 &&
      this.order.amountDue > 0
    ) {
      this.violations.set(
        "INV-03",
        `order #${this.order.id} is PAID with ${money(
          this.order.amountCaptured,
        )} captured against ${money(this.order.amountDue)} due`,
      );
    }
  }

  /* ---------- tools the agent can call ---------- */

  listProducts(): ToolResult {
    return {
      observation: { products: this.products },
      frame: "home",
      kind: "see",
      summary: `Catalog: ${this.products.length} products, ${money(
        this.products[0].price,
      )}–${money(Math.max(...this.products.map((p) => p.price)))}`,
    };
  }

  viewCart(): ToolResult {
    this.evaluate();
    return {
      observation: this.cartSnapshot(),
      frame: this.total() < 0 ? "cartNeg" : this.discountPct() > 0.2 ? "coupon3" : "cart",
      kind: "see",
      summary: `Cart: ${this.cart.length} lines · subtotal ${money(
        this.subtotal(),
      )} · total ${money(this.total())}`,
    };
  }

  addToCart(productId: string, quantity: number): ToolResult {
    const p = this.products.find((x) => x.id === productId);
    if (!p) {
      return {
        observation: { error: `unknown product ${productId}` },
        frame: "cart",
        kind: "see",
        summary: `No such product: ${productId}`,
      };
    }
    const existing = this.cart.find((l) => l.productId === productId);
    if (existing) existing.qty += quantity;
    else
      this.cart.push({ lineId: p.id, productId: p.id, name: p.name, price: p.price, qty: quantity });
    this.evaluate();
    return {
      observation: this.cartSnapshot(),
      frame: "cart",
      kind: "atk",
      summary: `Added ${quantity}× ${p.name}`,
    };
  }

  setQuantity(lineId: string, quantity: number): ToolResult {
    const line = this.cart.find((l) => l.lineId === lineId);
    if (!line) {
      return {
        observation: { error: `no line ${lineId}` },
        frame: "cart",
        kind: "see",
        summary: `No such line: ${lineId}`,
      };
    }
    // BUG (INV-02): no floor — negative quantities flow straight through.
    line.qty = quantity;
    this.evaluate();
    const viol = this.violations.has("INV-02") && line.qty < 1;
    return {
      observation: { ...this.cartSnapshot(), accepted_value: quantity, validation_fired: false },
      frame: this.total() < 0 ? "cartNeg" : "cartQty",
      kind: "atk",
      summary: viol
        ? `Field accepted ${quantity} — no validation. Subtotal now ${money(this.subtotal())}`
        : `Quantity for ${line.name} set to ${quantity}`,
      violation: viol ? "INV-02" : undefined,
    };
  }

  applyCoupon(code: string): ToolResult {
    const pct = COUPONS[code.toUpperCase()];
    if (pct === undefined) {
      return {
        observation: { error: `coupon ${code} not recognized`, applied: false },
        frame: "cart",
        kind: "chk",
        summary: `Coupon ${code} rejected (unknown code)`,
      };
    }
    // BUG (INV-01): no idempotency check — same code stacks every time.
    this.coupons.push({ code: code.toUpperCase(), pct });
    this.evaluate();
    const times = this.coupons.filter((c) => c.code === code.toUpperCase()).length;
    const viol = times > 1;
    return {
      observation: {
        ...this.cartSnapshot(),
        coupon: code.toUpperCase(),
        times_applied: times,
        idempotent: false,
      },
      frame: viol ? "coupon3" : "coupon1",
      kind: viol ? "atk" : "chk",
      summary: viol
        ? `${code.toUpperCase()} stacked ${times}× → −${Math.round(this.discountPct() * 100)}%`
        : `${code.toUpperCase()} applied → −${Math.round(this.discountPct() * 100)}%`,
      violation: viol ? "INV-01" : undefined,
    };
  }

  checkout(): ToolResult {
    if (this.cart.length === 0) {
      return {
        observation: { error: "cart is empty" },
        frame: "checkout",
        kind: "see",
        summary: "Nothing to check out",
      };
    }
    this.order.status = "PENDING";
    this.order.amountDue = this.total();
    this.order.amountCaptured = 0;
    this.clientCleared = false;
    return {
      observation: {
        order_id: this.order.id,
        status: this.order.status,
        amount_due: this.order.amountDue,
      },
      frame: "checkout",
      kind: "atk",
      summary: `Pending order #${this.order.id} opened · amount due ${money(this.order.amountDue)}`,
    };
  }

  refreshBrowser(): ToolResult {
    // BUG (INV-03): client cart is wiped, but the server keeps the pending order.
    this.clientCleared = true;
    return {
      observation: {
        client_cart: "cleared",
        server_pending_order: this.order.status === "PENDING" ? this.order.id : null,
        note: "client and server state diverged",
      },
      frame: "checkout",
      kind: "see",
      summary: `Hard-refresh: client cart cleared, server kept pending order #${this.order.id}`,
    };
  }

  placeOrder(): ToolResult {
    if (this.order.status !== "PENDING") {
      return {
        observation: { error: "no pending order" },
        frame: "checkout",
        kind: "see",
        summary: "No pending order to place",
      };
    }
    // BUG (INV-03): marks PAID regardless; captures the (now empty) client total.
    this.order.amountCaptured = this.clientCleared ? 0 : this.order.amountDue;
    this.order.status = "PAID";
    this.evaluate();
    const viol = this.violations.has("INV-03");
    return {
      observation: {
        order_id: this.order.id,
        status: this.order.status,
        amount_due: this.order.amountDue,
        amount_captured: this.order.amountCaptured,
      },
      frame: "orderPaid",
      kind: "atk",
      summary: viol
        ? `Order #${this.order.id} created PAID — ${money(this.order.amountCaptured)} captured`
        : `Order #${this.order.id} PAID · ${money(this.order.amountCaptured)} captured`,
      violation: viol ? "INV-03" : undefined,
    };
  }

  /** Validate a finding the agent wants to report against ground truth. */
  confirmViolation(inv: ViolationId): { ok: boolean; detail?: string } {
    const detail = this.violations.get(inv);
    return detail ? { ok: true, detail } : { ok: false };
  }
}
