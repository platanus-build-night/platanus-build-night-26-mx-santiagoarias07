"use client";

import Link from "next/link";
import { useState } from "react";
import { ShopApp } from "@/components/shop";

export default function DemoShopPage() {
  const [f03State, setF03State] = useState<"idle" | "mid" | "done">("idle");

  const triggerF03 = () => {
    setF03State("mid");
    // simulate the "hard refresh" clearing the client cart while server keeps order
    setTimeout(() => setF03State("done"), 900);
  };

  const resetF03 = () => setF03State("idle");

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{shopPageCss}</style>
      <div className="target-bar">
        <span className="pill pill-red">
          <span className="dot"></span>UNDER AUDIT
        </span>
        <span className="ttl">Northwind Store</span>
        <span className="mono">
          demo-shop.invariant.dev · intentionally vulnerable business logic
        </span>
        <Link
          href="/dashboard"
          className="btn btn-sm"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          ← Back to Invariant
        </Link>
      </div>

      <div className="wrap">
        {/* F-03 overlay takes over the whole left column when triggered */}
        {f03State !== "idle" ? (
          <div className="f03-demo">
            <div
              className="shop"
              style={{
                maxWidth: 560,
                margin: "0 auto",
                borderLeft: "1px solid var(--s-line)",
                borderRight: "1px solid var(--s-line)",
              }}
            >
              {/* shop top bar */}
              <div className="s-top">
                <div className="s-logo"><span className="m"></span>Northwind</div>
                <div className="s-nav"><span>Shop</span><span>Deals</span></div>
                <div className="s-cartbtn">Cart · 2</div>
              </div>

              {f03State === "mid" ? (
                /* Mid-refresh: show the checkout frozen + a visual "refresh" flash */
                <div className="s-body" style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "var(--mono)",
                      fontSize: 12,
                      color: "var(--s-sub)",
                      background: "#f5f5f0",
                      border: "1px solid var(--s-line)",
                      borderRadius: 8,
                      padding: "6px 14px",
                      marginBottom: 22,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        border: "2px solid #aaa",
                        borderTopColor: "#555",
                        animation: "spin 0.6s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Hard refresh — reconnecting…
                  </div>
                  <div className="s-h" style={{ opacity: 0.35 }}>Checkout</div>
                  <div className="s-hsub" style={{ opacity: 0.35 }}>Step 2 of 2 · payment</div>
                  <div
                    style={{
                      maxWidth: 320,
                      margin: "16px auto 0",
                      opacity: 0.2,
                      background: "var(--s-line)",
                      height: 120,
                      borderRadius: 8,
                    }}
                  />
                </div>
              ) : (
                /* Done: order appears PAID with $0 captured */
                <div className="s-body">
                  <div className="s-order">
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <div className="s-flag" style={{ inset: -5 }}>
                        <span className="s-flagtag">INV-03 · PAID, $0 captured</span>
                      </div>
                      <span className="s-badge warn" data-testid="order-status">
                        ● PAID · $0.00 captured
                      </span>
                    </div>
                    <div className="s-onum">Order #1041</div>
                    <div className="s-hsub" style={{ marginBottom: 0 }}>
                      Confirmation sent to ada@northwind.io
                    </div>
                    <div
                      className="s-pmeta"
                      style={{ marginTop: 14, fontFamily: "var(--mono)" }}
                    >
                      amount_captured = $0.00
                    </div>
                    <button
                      className="s-cta"
                      onClick={resetF03}
                      style={{ marginTop: 24, background: "#555" }}
                    >
                      Reset demo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <ShopApp />
          </div>
        )}

        <div className="bugs">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            3 planted invariant violations
          </div>

          <div className="bug">
            <div className="h">
              <span className="sev sev-crit">CRIT</span> Negative quantity
            </div>
            <p>
              Type <b>-2</b> into the keyboard quantity. No validation fires; the
              subtotal goes negative.
            </p>
            <div className="try">INV-02 · qty ≥ 1</div>
          </div>

          <div className="bug">
            <div className="h">
              <span className="sev sev-high">HIGH</span> Coupon stacking
            </div>
            <p>
              Click <b>Apply</b> on SAVE20 repeatedly — the discount stacks past 100%.
            </p>
            <div className="try">INV-01 · once per cart</div>
          </div>

          <div className="bug">
            <div className="h">
              <span className="sev sev-med">MED</span> Checkout desync
            </div>
            <p>
              Refresh during checkout → server keeps pending order → re-submit marks
              it PAID with $0 captured.
            </p>
            <div className="try">INV-03 · total = Σ lines</div>
            {f03State === "idle" && (
              <button className="bug-btn" onClick={triggerF03}>
                ▶ Reproduce F-03
              </button>
            )}
            {f03State === "done" && (
              <button
                className="bug-btn"
                onClick={resetF03}
                style={{ background: "var(--red-soft)", borderColor: "var(--red-line)", color: "var(--red)" }}
              >
                ↺ Reset
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .bug-btn {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 10px; padding: 5px 12px; border-radius: 7px;
          border: 1px solid var(--acc-line); background: var(--acc-soft); color: var(--acc);
          font-family: var(--mono); font-size: 11.5px; font-weight: 600; cursor: pointer;
          transition: all .13s;
        }
        .bug-btn:hover { background: rgba(245,160,74,0.22); }
        .f03-demo { animation: fadeIn .25s ease both; }
      `}</style>
    </div>
  );
}

const shopPageCss = `
  .target-bar {
    display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--line);
    background: var(--bg-1); position: sticky; top: 0; z-index: 5; overflow: hidden;
  }
  .target-bar .ttl { font-size: 13.5px; font-weight: 500; white-space: nowrap; }
  .target-bar .mono { color: var(--tx-2); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .wrap {
    max-width: 980px; margin: 0 auto; padding: 28px 22px 60px;
    display: grid; grid-template-columns: 1fr 300px; gap: 26px; align-items: start;
  }
  .bugs { position: sticky; top: 60px; }
  .bug { border: 1px solid var(--line); background: var(--bg-1); border-radius: 10px; padding: 14px; margin-bottom: 12px; }
  .bug .h { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; }
  .bug p { color: var(--tx-1); font-size: 12px; line-height: 1.5; margin: 8px 0 0; }
  .bug .try { font-family: var(--mono); font-size: 11px; color: var(--acc); margin-top: 8px; }
  @media (max-width: 820px) {
    .wrap { grid-template-columns: 1fr; padding: 18px 16px 40px; }
    .bugs { position: static; }
    .target-bar .mono { display: none; }
  }
`;
