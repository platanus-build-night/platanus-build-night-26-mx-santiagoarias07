import Link from "next/link";
import { ShopApp } from "@/components/shop";

export const metadata = {
  title: "Northwind — Demo target (intentionally vulnerable)",
};

export default function DemoShopPage() {
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
        <div>
          <ShopApp />
        </div>
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
              Refreshing mid-checkout leaves an order in PAID state with $0 captured.
            </p>
            <div className="try">INV-03 · total = Σ lines</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const shopPageCss = `
  .target-bar { display: flex; align-items: center; gap: 12px; padding: 12px 22px; border-bottom: 1px solid var(--line);
    background: var(--bg-1); position: sticky; top: 0; z-index: 5; }
  .target-bar .ttl { font-size: 13.5px; font-weight: 500; }
  .target-bar .mono { color: var(--tx-2); font-size: 12px; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 28px 22px 60px; display: grid; grid-template-columns: 1fr 300px; gap: 26px; align-items: start; }
  .bugs { position: sticky; top: 70px; }
  .bug { border: 1px solid var(--line); background: var(--bg-1); border-radius: 10px; padding: 14px; margin-bottom: 12px; }
  .bug .h { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; }
  .bug p { color: var(--tx-1); font-size: 12px; line-height: 1.5; margin: 8px 0 0; }
  .bug .try { font-family: var(--mono); font-size: 11px; color: var(--acc); margin-top: 8px; }
  @media (max-width: 820px){ .wrap { grid-template-columns: 1fr; } .bugs { position: static; } }
`;
