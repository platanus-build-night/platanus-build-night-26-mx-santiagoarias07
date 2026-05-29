/* ============================================================
   INVARIANT — landing page
   ============================================================ */
"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Mark } from "@/components/ui";

const FEED = [
  {
    k: "NAVIGATE",
    c: "var(--tx-2)",
    x: "Captured DOM · 47 nodes · 1 form",
    cls: "",
  },
  {
    k: "REASON",
    c: "var(--acc-dim)",
    x: "A checkout must never get price wrong. Stating it as an invariant.",
    cls: "think",
  },
  {
    k: "INVARIANT",
    c: "var(--acc)",
    x: "INV-02 · Every line quantity is an integer ≥ 1.",
    cls: "",
  },
  {
    k: "PROBE",
    c: "var(--acc)",
    x: "Set quantity → -2 via stepper input",
    cls: "",
  },
  {
    k: "VIOLATION",
    c: "var(--red)",
    x: "Subtotal fell to -$320.00. INV-02 violated.",
    cls: "viol",
  },
];

export default function LandingPage() {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const render = () => {
      const feedEl = feedRef.current;
      if (!feedEl) return;
      feedEl.innerHTML = FEED.map(
        (f) =>
          `<div class="ln ${f.cls}"><div class="k" style="color:${f.c}">${f.k}</div><div class="x">${f.x}</div></div>`,
      ).join("");
      const lns = feedEl.querySelectorAll(".ln");
      lns.forEach((ln, i) =>
        setTimeout(() => ln.classList.add("on"), 500 + i * 900),
      );
    };
    render();
    const id = setInterval(render, FEED.length * 900 + 3200);

    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        }),
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    return () => {
      clearInterval(id);
      io.disconnect();
    };
  }, []);

  return (
    <div className="landing-root">
      <style>{landingCss}</style>

      {/* nav */}
      <nav className="nav">
        <div className="container">
          <span className="wm">
            <span className="wm-mark">
              <Mark size={19} />
            </span>
            <span className="wm-name">Invariant</span>
          </span>
          <div className="nav-links">
            <a href="#what">Product</a>
            <a href="#how">How it works</a>
            <a href="#output">Output</a>
            <Link href="/demo-shop">Demo target</Link>
          </div>
          <div className="nav-right">
            <Link className="btn btn-ghost btn-sm" href="/demo-shop">
              View target
            </Link>
            <Link className="btn btn-primary btn-sm" href="/dashboard">
              Launch demo
            </Link>
          </div>
        </div>
      </nav>

      {/* hero */}
      <header className="hero">
        <div className="hero-grid"></div>
        <div className="container hero-inner">
          <span className="pill pill-acc">
            <span className="live-dot"></span>Autonomous adversarial QA agent
          </span>
          <h1>
            Your tests check what you remembered.
            <br />
            <span className="accent">Invariant attacks what you forgot.</span>
          </h1>
          <p className="sub">
            Point it at a running web app. It explores the interface, infers the
            business rules that must always hold, then relentlessly tries to break each
            one — and writes the regression test the moment it succeeds.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-primary btn-lg" href="/dashboard">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 3L5 13h6l-1 8 8-10h-6z" />
              </svg>{" "}
              Watch a live audit
            </Link>
            <Link className="btn btn-lg" href="/demo-shop">
              Poke the target →
            </Link>
          </div>

          {/* live composition */}
          <div className="stage">
            <div className="stage-bar">
              <span className="d" style={{ background: "#ff5f57" }}></span>
              <span className="d" style={{ background: "#febc2e" }}></span>
              <span className="d" style={{ background: "#28c840" }}></span>
              <span className="t">invariant · run #A-1042 · demo-shop.invariant.dev</span>
              <span
                className="pill pill-acc"
                style={{ marginLeft: "auto", height: 20 }}
              >
                <span className="live-dot"></span>running
              </span>
            </div>
            <div className="stage-body">
              <div className="stage-feed">
                <div className="hd">
                  <span className="live-dot"></span>Agent feed
                </div>
                <div ref={feedRef}></div>
              </div>
              <div className="stage-side">
                <div className="eyebrow">Browser · /cart</div>
                <div
                  className="shop"
                  style={{
                    border: "1px solid var(--s-line)",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <div className="s-body" style={{ padding: 14 }}>
                    <div style={{ position: "relative" }}>
                      <div className="s-flag" style={{ inset: -5 }}>
                        <span className="s-flagtag">INV-02 · qty ≥ 1</span>
                      </div>
                      <div
                        className="s-line"
                        style={{
                          padding: "10px 0",
                          gridTemplateColumns: "38px 1fr auto",
                        }}
                      >
                        <div
                          className="s-thumb"
                          style={{ width: 38, height: 38 }}
                        ></div>
                        <div>
                          <div className="s-pname" style={{ fontSize: 12.5 }}>
                            Aero75 Keyboard
                          </div>
                          <div className="s-pmeta">$179.99</div>
                        </div>
                        <div className="s-right" style={{ gap: 12 }}>
                          <div className="s-stepper bad">
                            <button>–</button>
                            <input value="-2" readOnly />
                            <button>+</button>
                          </div>
                          <div className="s-linetot neg">-$359.98</div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="s-sum"
                      style={{ marginTop: 10, padding: 12 }}
                    >
                      <div
                        className="s-srow tot"
                        style={{ border: "none", margin: 0, padding: 0 }}
                      >
                        <span>Subtotal</span>
                        <span className="v neg">-$320.00</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="pill pill-red"
                  style={{ alignSelf: "flex-start" }}
                >
                  <span className="dot"></span>F-01 · Critical · contradiction recorded
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* what it is */}
      <section id="what">
        <div className="container">
          <div className="reveal">
            <div className="sec-eyebrow">What it does</div>
            <h2 className="sec-h">
              Not a scanner. A QA engineer that argues with your product.
            </h2>
            <p className="sec-sub">
              Invariant does black-box business-logic testing — no source access, no
              network exploits. It reasons about what your app <em>claims</em> to be
              true, then proves it isn&apos;t.
            </p>
          </div>
          <div className="three">
            <div className="feat reveal">
              <div className="ic">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="6" />
                  <path d="M11 7v8M7 11h8M16 16l5 5" />
                </svg>
              </div>
              <h3>Explores like a user</h3>
              <p>
                Drives a real Playwright browser — reading the DOM, taking screenshots,
                and mapping every form and route the way a person would.
              </p>
            </div>
            <div className="feat reveal">
              <div className="ic">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M9 4v16M4 9h5" />
                </svg>
              </div>
              <h3>Infers the invariants</h3>
              <p>
                Claude turns the interface into explicit rules that must always hold —
                “a coupon applies once”, “quantity ≥ 1”, “no PAID order without
                payment”.
              </p>
            </div>
            <div className="feat reveal">
              <div className="ic">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 3L5 13h6l-1 8 8-10h-6z" />
                </svg>
              </div>
              <h3>Attacks until something breaks</h3>
              <p>
                It generates adversarial sequences, executes them, and watches for
                contradictions — then captures the repro and writes a regression test.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section
        id="how"
        style={{
          background: "var(--bg-1)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="container">
          <div className="reveal">
            <div className="sec-eyebrow">How it works</div>
            <h2 className="sec-h">One URL in. Reproducible findings out.</h2>
          </div>
          <div className="steps reveal">
            <div className="step-line"></div>
            <div className="step">
              <div className="n">01</div>
              <h3>Explore</h3>
              <p>
                Launch a headless browser, capture DOM + screenshots, map the surface.
              </p>
            </div>
            <div className="step">
              <div className="n">02</div>
              <h3>Hypothesize</h3>
              <p>Claude states the business rules the app must never violate.</p>
            </div>
            <div className="step">
              <div className="n">03</div>
              <h3>Adversarial</h3>
              <p>Execute edge-case interactions designed to break each invariant.</p>
            </div>
            <div className="step">
              <div className="n">04</div>
              <h3>Report</h3>
              <p>
                On a contradiction: capture evidence and emit a Playwright regression
                test.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* output */}
      <section id="output">
        <div className="container">
          <div className="reveal">
            <div className="sec-eyebrow">The output</div>
            <h2 className="sec-h">
              Every finding ships with the test that locks it shut.
            </h2>
            <p className="sec-sub">
              No vague “looks suspicious”. You get the violated invariant, expected vs
              actual, a step-by-step repro, and a runnable spec.
            </p>
          </div>
          <div className="out">
            <div
              className="reveal"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div
                className="find-card"
                style={{
                  background: "var(--bg-1)",
                  cursor: "default",
                  padding: 16,
                }}
              >
                <div className="row gap-2">
                  <span className="sev sev-crit">Critical</span>
                  <span className="mono dimmer" style={{ fontSize: 11 }}>
                    F-01
                  </span>
                  <span className="pill pill-acc" style={{ height: 20 }}>
                    INV-02
                  </span>
                </div>
                <div
                  style={{ fontSize: 15, fontWeight: 500, marginTop: 11 }}
                >
                  Negative quantity manipulates order total
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  <div
                    style={{
                      border: "1px solid rgba(91,191,155,0.25)",
                      background: "var(--ok-soft)",
                      borderRadius: 8,
                      padding: 11,
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--ok)",
                        letterSpacing: ".08em",
                        marginBottom: 6,
                      }}
                    >
                      EXPECTED
                    </div>
                    Field rejects values &lt; 1.
                  </div>
                  <div
                    style={{
                      border: "1px solid var(--red-line)",
                      background: "var(--red-soft)",
                      borderRadius: 8,
                      padding: 11,
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--red)",
                        letterSpacing: ".08em",
                        marginBottom: 6,
                      }}
                    >
                      ACTUAL
                    </div>
                    -2 accepted → subtotal -$320.00.
                  </div>
                </div>
              </div>
            </div>
            <div className="reveal code-mini">
              <div className="bar">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--acc)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 6l-5 6 5 6M16 6l5 6-5 6" />
                </svg>{" "}
                tests/invariant-02.spec.ts
              </div>
              <pre>
                <span className="c-key">import</span> {"{ test, expect } "}
                <span className="c-key">from</span>{" "}
                <span className="c-str">&apos;@playwright/test&apos;</span>;{"\n\n"}
                <span className="c-com">{"// INV-02 — quantity must be an integer >= 1"}</span>
                {"\n"}
                <span className="c-fn">test</span>(
                <span className="c-str">&apos;cart rejects negative quantity&apos;</span>,{" "}
                <span className="c-key">async</span> ({"{ page }"}) ={">"} {"{"}
                {"\n"}
                {"  "}
                <span className="c-key">await</span> page.
                <span className="c-fn">goto</span>(
                <span className="c-str">&apos;/cart&apos;</span>);{"\n"}
                {"  "}
                <span className="c-key">const</span> qty = page.
                <span className="c-fn">getByTestId</span>(
                <span className="c-str">&apos;qty-input&apos;</span>);{"\n"}
                {"  "}
                <span className="c-key">await</span> qty.
                <span className="c-fn">fill</span>(
                <span className="c-str">&apos;-2&apos;</span>);{"\n"}
                {"  "}
                <span className="c-key">await</span>{" "}
                <span className="c-fn">expect</span>(qty).
                <span className="c-fn">toHaveValue</span>(
                <span className="c-str">&apos;1&apos;</span>);{"\n"}
                {"}"});
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="container">
          <div className="cta-band reveal">
            <h2>Watch it find a bug in 38 seconds.</h2>
            <p>
              The live demo runs against a store with three planted invariant
              violations. It finds all three, every time.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-primary btn-lg" href="/dashboard">
                Launch the dashboard
              </Link>
              <Link className="btn btn-lg" href="/demo-shop">
                Inspect the target
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="container foot">
          <span className="wm">
            <span className="wm-mark" style={{ width: 16, height: 16 }}>
              <Mark size={16} />
            </span>
            <b>Invariant</b>
          </span>
          <span className="mono" style={{ marginLeft: "auto" }}>
            Playwright · Claude · FastAPI
          </span>
          <span>Adversarial QA, autonomously.</span>
        </div>
      </footer>
    </div>
  );
}

const landingCss = `
  html { scroll-behavior: smooth; }
  .landing-root { background: var(--bg-0); }
  .container { max-width: 1140px; margin: 0 auto; padding: 0 28px; }

  /* nav */
  .nav { position: sticky; top: 0; z-index: 40; height: 60px; display: flex; align-items: center;
    border-bottom: 1px solid var(--line); background: rgba(8,8,10,0.72); backdrop-filter: blur(12px); }
  .nav .container { display: flex; align-items: center; width: 100%; }
  .nav-links { display: flex; gap: 26px; margin-left: 42px; }
  .nav-links a { color: var(--tx-1); font-size: 13.5px; text-decoration: none; transition: color .13s; }
  .nav-links a:hover { color: var(--tx-0); }
  .nav-right { margin-left: auto; display: flex; gap: 10px; align-items: center; }
  a.btn { text-decoration: none; }

  /* hero */
  .hero { position: relative; overflow: hidden; padding: 90px 0 60px; }
  .hero::before { content: ""; position: absolute; top: -260px; left: 50%; transform: translateX(-50%);
    width: 900px; height: 600px; background: radial-gradient(ellipse at center, var(--acc-soft), transparent 62%); pointer-events: none; }
  .hero-grid { position: absolute; inset: 0; opacity: .5;
    background-image: radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px); background-size: 26px 26px;
    -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%); }
  .hero-inner { position: relative; text-align: center; }
  .hero .pill { margin: 0 auto; }
  .hero h1 { font-size: 60px; line-height: 1.02; letter-spacing: -0.035em; margin: 22px auto 0; max-width: 860px; font-weight: 600; }
  .hero h1 .accent { color: var(--acc); }
  .hero .sub { font-size: 18px; color: var(--tx-1); line-height: 1.55; max-width: 620px; margin: 22px auto 0; text-wrap: pretty; }
  .hero-cta { display: flex; gap: 12px; justify-content: center; margin-top: 30px; }
  .btn-lg { height: 44px; padding: 0 20px; font-size: 14.5px; border-radius: 9px; }

  /* hero product composition */
  .stage { position: relative; margin: 56px auto 0; max-width: 1000px;
    border: 1px solid var(--line-2); border-radius: 16px; background: var(--bg-1); overflow: hidden;
    box-shadow: 0 50px 120px -40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02); }
  .stage-bar { display: flex; align-items: center; gap: 8px; padding: 11px 15px; border-bottom: 1px solid var(--line); background: var(--bg-2); }
  .stage-bar .d { width: 11px; height: 11px; border-radius: 50%; }
  .stage-bar .t { margin-left: 8px; font-family: var(--mono); font-size: 11.5px; color: var(--tx-2); }
  .stage-body { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 0; min-height: 360px; }
  .stage-feed { padding: 18px 20px; border-right: 1px solid var(--line); }
  .stage-feed .hd { font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; color: var(--tx-3); text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .ln { opacity: 0; transform: translateY(6px); transition: all .4s ease; margin-bottom: 15px; }
  .ln.on { opacity: 1; transform: none; }
  .ln .k { font-family: var(--mono); font-size: 9.5px; font-weight: 600; letter-spacing: .1em; }
  .ln .x { font-size: 13px; color: var(--tx-0); margin-top: 4px; line-height: 1.45; }
  .ln.think .x { color: var(--tx-1); }
  .ln.viol .x { color: var(--red); font-weight: 500; }
  .stage-side { padding: 18px; display: flex; flex-direction: column; gap: 14px; background: var(--bg-inset); }

  /* sections */
  section { padding: 84px 0; }
  .sec-eyebrow { font-family: var(--mono); font-size: 11.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--acc); }
  .sec-h { font-size: 38px; letter-spacing: -0.03em; margin: 14px 0 0; max-width: 680px; font-weight: 600; }
  .sec-sub { font-size: 16px; color: var(--tx-1); line-height: 1.55; max-width: 600px; margin: 16px 0 0; }
  .reveal { opacity: 0; transform: translateY(18px); transition: opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1); }
  .reveal.in { opacity: 1; transform: none; }

  .three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 48px; }
  .feat { border: 1px solid var(--line); background: var(--bg-1); border-radius: 13px; padding: 24px; }
  .feat .ic { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--acc-line); background: var(--acc-soft);
    color: var(--acc); display: grid; place-items: center; margin-bottom: 16px; }
  .feat h3 { font-size: 17px; letter-spacing: -0.02em; }
  .feat p { font-size: 13.5px; color: var(--tx-1); line-height: 1.55; margin: 9px 0 0; }

  /* how it works */
  .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 48px; position: relative; }
  .step { padding: 0 22px; position: relative; }
  .step:not(:last-child)::after { content: ""; position: absolute; top: 13px; right: -2px; width: 4px; height: 4px; }
  .step .n { font-family: var(--mono); font-size: 12px; color: var(--acc); border: 1px solid var(--acc-line); background: var(--acc-soft);
    width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; font-weight: 600; }
  .step h3 { font-size: 16px; margin-top: 18px; letter-spacing: -0.02em; }
  .step p { font-size: 13px; color: var(--tx-1); line-height: 1.5; margin: 8px 0 0; }
  .step-line { position: absolute; top: 13px; left: 8%; right: 8%; height: 1px; background: var(--line-2); z-index: -1; }

  /* output showcase */
  .out { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 44px; align-items: stretch; }
  .code-mini { border: 1px solid var(--line-2); border-radius: 12px; overflow: hidden; background: var(--bg-inset); }
  .code-mini .bar { display: flex; align-items: center; gap: 8px; padding: 9px 13px; background: var(--bg-2); border-bottom: 1px solid var(--line); font-family: var(--mono); font-size: 11.5px; color: var(--tx-1); }
  .code-mini pre { margin: 0; padding: 16px; font-family: var(--mono); font-size: 12px; line-height: 1.7; color: #c9c9cf; overflow-x: auto; }

  /* CTA */
  .cta-band { text-align: center; border: 1px solid var(--line-2); border-radius: 18px; padding: 60px 30px; position: relative; overflow: hidden;
    background: radial-gradient(ellipse at 50% 0%, rgba(245,160,74,0.1), transparent 60%), var(--bg-1); }
  .cta-band h2 { font-size: 40px; letter-spacing: -0.03em; }
  .cta-band p { color: var(--tx-1); font-size: 16px; margin: 14px auto 28px; max-width: 460px; }

  footer { border-top: 1px solid var(--line); padding: 34px 0; }
  .foot { display: flex; align-items: center; gap: 14px; color: var(--tx-2); font-size: 12.5px; }
  .foot .mono { font-family: var(--mono); }

  .c-key{color:#c98fff} .c-fn{color:var(--acc-bright)} .c-str{color:#8fd6a8} .c-com{color:var(--tx-3);font-style:italic} .c-num{color:#7fb0ff}

  @media (max-width: 860px){
    .hero h1 { font-size: 40px; } .stage-body { grid-template-columns: 1fr; } .stage-side { border-top: 1px solid var(--line); }
    .three, .steps, .out { grid-template-columns: 1fr; gap: 16px; } .step-line { display: none; }
    .nav-links { display: none; }
  }
`;
