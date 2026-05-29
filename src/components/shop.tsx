/* ============================================================
   INVARIANT — demo shop renders
   ShopFrame: presentational frames for the dashboard preview.
   ShopApp: a genuinely vulnerable, pokeable store.
   ============================================================ */
"use client";

import { useState } from "react";
import type { FrameId } from "@/lib/data";

const PRICE_A = 179.99;
const PRICE_B = 19.99;
const QTY_B = 2;

const money = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);

function Flag({ label }: { label: string }) {
  return (
    <div className="s-flag" style={{ inset: -5 }}>
      <span className="s-flagtag">{label}</span>
    </div>
  );
}

function ShopTop({ count = 3 }: { count?: number }) {
  return (
    <div className="s-top">
      <div className="s-logo">
        <span className="m"></span>Northwind
      </div>
      <div className="s-nav">
        <span>Shop</span>
        <span>Deals</span>
        <span>Support</span>
      </div>
      <div className="s-cartbtn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="18" cy="20" r="1.4" />
          <path d="M2 3h3l2.4 12.5a1.5 1.5 0 0 0 1.5 1.2h8.3a1.5 1.5 0 0 0 1.5-1.2L22 7H6" />
        </svg>
        Cart · {count}
      </div>
    </div>
  );
}

type CartBodyProps = {
  qtyA: number;
  couponPct: number;
  flag?: "qty" | "coupon" | null;
  onQty?: (v: number) => void;
  onCoupon?: () => void;
  couponCount?: number;
};

function CartBody({ qtyA, couponPct, flag, onQty, onCoupon, couponCount }: CartBodyProps) {
  const lineA = PRICE_A * qtyA;
  const lineB = PRICE_B * QTY_B;
  const sub = lineA + lineB;
  const disc = sub > 0 ? sub * couponPct : 0;
  const total = sub - disc;
  const badQty = qtyA < 1;

  return (
    <div className="s-body">
      <div className="s-h">Your cart</div>
      <div className="s-hsub">2 items · ships from Reno, NV</div>

      <div style={{ position: "relative" }}>
        {flag === "qty" && <Flag label="INV-02 · qty ≥ 1" />}
        <div className="s-line">
          <div className="s-thumb"></div>
          <div>
            <div className="s-pname">Aero75 Mechanical Keyboard</div>
            <div className="s-pmeta">Linear switches · {money(PRICE_A)}</div>
          </div>
          <div className="s-right">
            <div className={"s-stepper" + (badQty ? " bad" : "")}>
              <button onClick={() => onQty && onQty(qtyA - 1)}>–</button>
              <input
                data-testid="qty-input"
                value={qtyA}
                onChange={(e) =>
                  onQty && onQty(parseInt(e.target.value || "0", 10))
                }
                readOnly={!onQty}
              />
              <button onClick={() => onQty && onQty(qtyA + 1)}>+</button>
            </div>
            <div className={"s-linetot" + (lineA < 0 ? " neg" : "")}>{money(lineA)}</div>
          </div>
        </div>
      </div>

      <div className="s-line">
        <div className="s-thumb"></div>
        <div>
          <div className="s-pname">Braided USB-C Cable</div>
          <div className="s-pmeta">2 m · {money(PRICE_B)}</div>
        </div>
        <div className="s-right">
          <div className="s-stepper">
            <button>–</button>
            <input value={QTY_B} readOnly />
            <button>+</button>
          </div>
          <div className="s-linetot">{money(lineB)}</div>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        {flag === "coupon" && <Flag label="INV-01 · once per cart" />}
        <div className="s-coupon">
          <input data-testid="coupon-input" defaultValue="SAVE20" placeholder="Coupon code" />
          <button onClick={() => onCoupon && onCoupon()}>Apply</button>
        </div>
        {couponPct > 0 && (
          <div className="s-chip" data-testid="discount">
            ✓ SAVE20 applied{couponCount && couponCount > 1 ? ` ×${couponCount}` : ""} · −
            {Math.round(couponPct * 100)}%
          </div>
        )}
      </div>

      <div className="s-sum">
        <div className="s-srow">
          <span className="l">Subtotal</span>
          <span
            className={"v" + (sub < 0 ? " neg" : "")}
            data-testid="cart-subtotal"
          >
            {money(sub)}
          </span>
        </div>
        {couponPct > 0 && (
          <div className="s-srow">
            <span className="l">Discount (SAVE20)</span>
            <span className="v disc">−{money(disc)}</span>
          </div>
        )}
        <div className="s-srow">
          <span className="l">Shipping</span>
          <span className="v">$0.00</span>
        </div>
        <div className="s-srow tot">
          <span>Total</span>
          <span className={"v" + (total < 0 ? " neg" : "")} data-testid="cart-total">
            {money(total)}
          </span>
        </div>
      </div>
      <button className="s-cta">Checkout</button>
    </div>
  );
}

function HomeBody() {
  const items: [string, number][] = [
    ["Aero75 Mechanical Keyboard", PRICE_A],
    ["Braided USB-C Cable", PRICE_B],
    ["Pro Desk Mat — XL", 34.0],
    ["Aluminium Laptop Stand", 59.0],
  ];
  return (
    <div className="s-body">
      <div className="s-h">New this week</div>
      <div className="s-hsub">Desk gear, free shipping over $50</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginTop: 6,
        }}
      >
        {items.map(([n, p]) => (
          <div
            key={n}
            style={{
              background: "#fff",
              border: "1px solid var(--s-line)",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div
              className="s-thumb"
              style={{ width: "100%", height: 88, borderRadius: 8 }}
            ></div>
            <div className="s-pname" style={{ marginTop: 10 }}>
              {n}
            </div>
            <div className="s-pmeta">{money(p)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckoutBody() {
  return (
    <div className="s-body">
      <div className="s-h">Checkout</div>
      <div className="s-hsub">Step 2 of 2 · payment</div>
      <div className="s-checkout" style={{ marginTop: 8 }}>
        <div className="s-fieldrow">
          <label>Email</label>
          <div className="inp">ada@northwind.io</div>
        </div>
        <div className="s-fieldrow">
          <label>Card number</label>
          <div className="inp">4242 4242 4242 4242</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div className="s-fieldrow" style={{ flex: 1 }}>
            <label>Expiry</label>
            <div className="inp">04 / 28</div>
          </div>
          <div className="s-fieldrow" style={{ flex: 1 }}>
            <label>CVC</label>
            <div className="inp">•••</div>
          </div>
        </div>
        <div className="s-sum" style={{ marginTop: 4 }}>
          <div className="s-srow">
            <span className="l">Order total</span>
            <span className="v">$219.97</span>
          </div>
        </div>
        <button className="s-cta">Place order</button>
      </div>
    </div>
  );
}

function OrderBody({ flag }: { flag?: boolean }) {
  return (
    <div className="s-body">
      <div className="s-order">
        <div style={{ position: "relative", display: "inline-block" }}>
          {flag && <Flag label="INV-03 · PAID, $0 captured" />}
          <span className="s-badge warn" data-testid="order-status">
            ● PAID · $0.00 captured
          </span>
        </div>
        <div className="s-onum" data-testid="order-num">
          Order #1041
        </div>
        <div className="s-hsub" style={{ marginBottom: 0 }}>
          Confirmation sent to ada@northwind.io
        </div>
        <div
          className="s-pmeta"
          style={{ marginTop: 14, fontFamily: "var(--mono)" }}
          data-testid="amount-captured"
        >
          amount_captured = $0.00
        </div>
      </div>
    </div>
  );
}

/* ---- presentational frame dispatcher for the browser preview ---- */
export function ShopFrame({ frame }: { frame: FrameId }) {
  let body: React.ReactNode;
  let count = 3;
  switch (frame) {
    case "home":
      body = <HomeBody />;
      count = 0;
      break;
    case "cart":
      body = <CartBody qtyA={1} couponPct={0} />;
      break;
    case "cartQty":
      body = <CartBody qtyA={-2} couponPct={0} />;
      break;
    case "cartNeg":
      body = <CartBody qtyA={-2} couponPct={0} flag="qty" />;
      break;
    case "coupon1":
      body = <CartBody qtyA={1} couponPct={0.2} couponCount={1} />;
      break;
    case "coupon3":
      body = <CartBody qtyA={1} couponPct={0.6} couponCount={3} flag="coupon" />;
      break;
    case "checkout":
      body = <CheckoutBody />;
      break;
    case "orderPaid":
      body = <OrderBody flag={true} />;
      break;
    default:
      body = <CartBody qtyA={1} couponPct={0} />;
  }
  return (
    <div className="shop">
      <ShopTop count={count} />
      {body}
    </div>
  );
}

/* ---- a genuinely vulnerable, pokeable store for the standalone page ---- */
export function ShopApp() {
  const [qtyA, setQtyA] = useState(1);
  const [couponCount, setCouponCount] = useState(0);
  const couponPct = Math.min(couponCount * 0.2, 1);
  const badQty = qtyA < 1;
  return (
    <div
      className="shop"
      style={{
        maxWidth: 560,
        margin: "0 auto",
        borderLeft: "1px solid var(--s-line)",
        borderRight: "1px solid var(--s-line)",
      }}
    >
      <ShopTop count={3} />
      <CartBody
        qtyA={qtyA}
        couponPct={couponPct}
        couponCount={couponCount}
        flag={badQty ? "qty" : couponCount > 1 ? "coupon" : null}
        onQty={(v) => setQtyA(isNaN(v) ? 0 : v)}
        onCoupon={() => setCouponCount((c) => c + 1)}
      />
    </div>
  );
}
