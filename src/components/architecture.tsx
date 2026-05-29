/* ============================================================
   INVARIANT — architecture doc page
   ============================================================ */
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Mark } from "@/components/ui";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "stack", label: "Stack" },
  { id: "tree", label: "Folder structure" },
  { id: "api", label: "API routes" },
  { id: "schema", label: "Database schema" },
  { id: "loop", label: "Agent event loop" },
  { id: "prompts", label: "Claude prompts" },
  { id: "playwright", label: "Playwright runner" },
  { id: "tests", label: "Test generation" },
  { id: "state", label: "Frontend state" },
];

export default function ArchitectureDoc() {
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]'),
    );
    const map = links
      .map((a) => ({
        a,
        el: document.querySelector(a.getAttribute("href") || ""),
      }))
      .filter((x): x is { a: HTMLAnchorElement; el: Element } => Boolean(x.el));
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.remove("on"));
            const m = map.find((x) => x.el === e.target);
            if (m) m.a.classList.add("on");
          }
        });
      },
      { rootMargin: "-10% 0px -80% 0px" },
    );
    map.forEach((x) => io.observe(x.el));
    return () => io.disconnect();
  }, []);

  return (
    <div>
      <style>{archCss}</style>
      <div className="doc">
        <aside className="toc">
          <span className="wm">
            <Mark size={20} />
            <span className="wm-name">Invariant</span>
          </span>
          {SECTIONS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={i === 0 ? "on" : ""}
            >
              {s.label}
            </a>
          ))}
          <div style={{ marginTop: 24 }}>
            <Link href="/dashboard" style={{ color: "var(--acc)" }}>
              ← Live dashboard
            </Link>
          </div>
        </aside>

        <main className="body">
          <div className="doc-head" id="overview">
            <span className="eyebrow">Technical design · 12-hour MVP</span>
            <h1>Invariant — architecture</h1>
            <p>
              An autonomous adversarial QA agent. A reasoning loop (Claude) drives a
              real browser (Playwright) against a target, infers business-logic
              invariants, attacks them, and on a contradiction emits a reproducible
              regression test. Scoped for demo impact and reliability — not enterprise
              breadth.
            </p>
            <div className="meta">
              <span className="pill pill-acc">Next.js 15 · TS · Tailwind</span>
              <span className="pill pill-acc">FastAPI · Anthropic SDK</span>
              <span className="pill pill-acc">Playwright · Pydantic</span>
              <span className="pill">SQLite</span>
            </div>
          </div>

          <h2 className="s" id="stack">
            System at a glance
          </h2>
          <p className="lead">
            Three processes, one event stream. The browser stays open as a session; the
            agent loop reads its state, asks Claude what to try next, and pushes every
            thought to the UI over a WebSocket.
          </p>
          <div className="block">
            <div className="bar">system topology</div>
            <pre>{`┌─────────────┐   WS /audit/stream    ┌──────────────────────────────┐
│  Next.js UI │ ◀───── events ─────── │         FastAPI core          │
│  dashboard  │ ─── POST /audit ───▶  │  AuditOrchestrator (per run)  │
└─────────────┘                       │   ├─ PlaywrightSession  (browser) │
                                       │   ├─ ClaudeReasoner     (SDK)     │
                                       │   └─ InvariantStore     (state)   │
                                       └──────────────┬───────────────┘
                                                      │  read/write
                                                ┌─────▼─────┐
                                                │  SQLite   │  runs · findings · tests
                                                └───────────┘`}</pre>
          </div>

          <h2 className="s" id="stack-2">
            Stack &amp; responsibilities
          </h2>
          <div className="grid2">
            <div className="mini">
              <h4>
                <span className="pill pill-acc">Frontend</span>
              </h4>
              <p>
                Next.js 15 App Router, TypeScript, Tailwind + shadcn/ui, Framer Motion
                for the feed/finding transitions.
              </p>
              <ul>
                <li>Subscribes to the run WebSocket</li>
                <li>Renders feed, browser captures, findings, tests</li>
                <li>Zero business logic — pure projection of server events</li>
              </ul>
            </div>
            <div className="mini">
              <h4>
                <span className="pill pill-acc">Backend</span>
              </h4>
              <p>
                FastAPI orchestrates one <code className="ic">AuditOrchestrator</code>{" "}
                per run, streaming Pydantic events.
              </p>
              <ul>
                <li>Playwright drives a headless Chromium session</li>
                <li>Anthropic SDK for inference + judging</li>
                <li>SQLite persists runs, findings, generated tests</li>
              </ul>
            </div>
          </div>

          <h2 className="s" id="tree">
            Folder structure
          </h2>
          <div className="block">
            <div className="bar">invariant/</div>
            <pre>{`apps/web/                      # Next.js 15 dashboard
  app/
    page.tsx                  # landing
    dashboard/page.tsx        # live audit workspace
  components/
    feed/AgentFeed.tsx        FindingDrawer.tsx
    browser/BrowserPreview.tsx  Filmstrip.tsx
    tests/CodeViewer.tsx      ui/*            # shadcn
  lib/useAuditStream.ts       # WebSocket hook
  store/audit.ts              # Zustand store

services/agent/                # FastAPI backend
  main.py                     # routes + WS
  orchestrator.py             # AuditOrchestrator: the loop
  browser/session.py          # PlaywrightSession + DOM digest
  reasoning/
    reasoner.py               # Claude calls
    prompts/                  rules.md  attack.md  judge.md
  invariants/store.py         models.py     # Pydantic
  testgen/playwright_writer.py
  db.py  schema.sql           targets/shop/   # vulnerable demo app`}</pre>
          </div>

          <h2 className="s" id="api">
            API routes
          </h2>
          <table className="api">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="verb post">POST</span>
                </td>
                <td className="p">/audit</td>
                <td>
                  Start a run for a target URL → returns{" "}
                  <code className="ic">run_id</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="verb ws">WS</span>
                </td>
                <td className="p">/audit/{"{run_id}"}/stream</td>
                <td>
                  Live event stream: reasoning, actions, captures, findings, tests.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="verb get">GET</span>
                </td>
                <td className="p">/audit/{"{run_id}"}</td>
                <td>Full run report (findings + tests) for replay/hydration.</td>
              </tr>
              <tr>
                <td>
                  <span className="verb get">GET</span>
                </td>
                <td className="p">/audits</td>
                <td>History list for the sidebar.</td>
              </tr>
              <tr>
                <td>
                  <span className="verb get">GET</span>
                </td>
                <td className="p">/findings/{"{id}"}/test</td>
                <td>
                  Download the generated <code className="ic">.spec.ts</code> file.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="verb post">POST</span>
                </td>
                <td className="p">/audit/{"{run_id}"}/stop</td>
                <td>Cancel a run and close the browser session.</td>
              </tr>
            </tbody>
          </table>

          <h2 className="s" id="schema">
            Database schema
          </h2>
          <p className="lead">
            SQLite, three tables. Everything the UI shows is reconstructable from here,
            so a refresh mid-demo loses nothing.
          </p>
          <div className="block">
            <div className="bar">schema.sql</div>
            <pre>{`CREATE TABLE runs (
  id            TEXT PRIMARY KEY,   -- "#A-1042"
  target_url    TEXT NOT NULL,
  status        TEXT,                -- running|done|stopped
  phase         TEXT,                -- explore|hypothesize|attack|report
  started_at    TIMESTAMP,  runtime_ms INTEGER,
  invariants    JSON                 -- inferred rules + status
);
CREATE TABLE findings (
  id            TEXT PRIMARY KEY,   run_id TEXT REFERENCES runs(id),
  invariant_id  TEXT,  severity TEXT,  title TEXT,
  expected      TEXT,  actual   TEXT,  impact TEXT,
  steps         JSON,  screenshots JSON,  action_log JSON
);
CREATE TABLE tests (
  finding_id    TEXT REFERENCES findings(id),
  filename      TEXT,  code TEXT,  framework TEXT DEFAULT 'playwright'
);`}</pre>
          </div>

          <h2 className="s" id="loop">
            Agent event loop
          </h2>
          <p className="lead">
            The orchestrator runs a bounded loop. Each iteration is one probe; every
            step emits an event the UI renders verbatim.
          </p>
          <div className="flow">
            {[
              ["Explore", "Open the target, capture a DOM digest (interactive nodes, forms, routes) + screenshot."],
              ["Infer invariants", "Claude reads the digest → returns a typed list of business rules with a testable predicate each."],
              ["Plan an attack", "Claude picks the cheapest unbroken invariant and emits a concrete action sequence (Playwright steps)."],
              ["Execute & observe", "Run the steps; re-capture state. Diff observed vs the invariant's predicate."],
              ["Judge", "Claude confirms a genuine contradiction (guards against false positives) → records a Finding."],
              ["Generate test", "Serialize the winning action log into a Playwright spec. Loop until invariants exhausted or budget hit."],
            ].map(([title, body], i, arr) => (
              <div className="fl" key={title}>
                <div className="rail">
                  <div className="dot">{i + 1}</div>
                  {i < arr.length - 1 && <div className="tail"></div>}
                </div>
                <div className="c">
                  <b>{title}</b>
                  <span>{body}</span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="s" id="prompts">
            Claude prompt architecture
          </h2>
          <p className="lead">
            Three narrow, structured prompts — each returns JSON validated by a
            Pydantic model. Small surfaces = reliable demos.
          </p>
          <div className="grid2">
            <div className="mini">
              <h4>
                <span className="pill pill-acc">1 · rules.md</span> Invariant inference
              </h4>
              <p>
                In: DOM digest + screenshot. Out:{" "}
                <code className="ic">Invariant[]</code> —{" "}
                <span className="mono">{"{ id, statement, predicate, surface }"}</span>.
                “List rules a correct checkout must never violate.”
              </p>
            </div>
            <div className="mini">
              <h4>
                <span className="pill pill-acc">2 · attack.md</span> Adversarial planner
              </h4>
              <p>
                In: one invariant + current DOM. Out:{" "}
                <code className="ic">ActionPlan</code> — ordered Playwright steps + the
                expected-vs-watch assertion.
              </p>
            </div>
            <div className="mini">
              <h4>
                <span className="pill pill-acc">3 · judge.md</span> Contradiction judge
              </h4>
              <p>
                In: before/after state + plan. Out:{" "}
                <code className="ic">Verdict</code> —{" "}
                <span className="mono">{"{ violated, severity, actual, impact }"}</span>.
                Rejects noise before it becomes a finding.
              </p>
            </div>
            <div className="mini">
              <h4>
                <span className="pill">Tooling</span> Structured output
              </h4>
              <p>
                Each call uses a tool/JSON schema so the orchestrator never parses
                prose. Temperature low; the browser is the source of truth.
              </p>
            </div>
          </div>

          <h2 className="s" id="playwright">
            Playwright execution
          </h2>
          <p className="lead">
            One long-lived session per run. The agent speaks an intent vocabulary; the
            session translates to Playwright and records everything.
          </p>
          <div className="block">
            <div className="bar">browser/session.py</div>
            <pre>{`class PlaywrightSession:
    async def digest(self) -> DomDigest:        # roles, forms, routes, testids
    async def run(self, plan: ActionPlan) -> ActionLog:
        for step in plan.steps:        # fill / click / goto / reload
            await self._apply(step)
            self.log.append(step, screenshot=await self.shot())
        return self.log              # replayed verbatim into the test`}</pre>
          </div>

          <h2 className="s" id="tests">
            Regression test generation
          </h2>
          <p className="lead">
            No LLM guesswork in the output: the recorded{" "}
            <code className="ic">ActionLog</code> + the invariant&apos;s predicate
            template-render into a deterministic spec. The bug becomes a permanent
            guardrail.
          </p>
          <div className="block">
            <div className="bar">
              testgen/playwright_writer.py → tests/invariant-02.spec.ts
            </div>
            <pre>{`def write(finding, log) -> str:
    return TEMPLATE.render(
        title   = finding.title,
        steps   = [step.as_playwright() for step in log],
        assert_ = finding.invariant.as_expect(),   # expected, not actual
    )`}</pre>
          </div>

          <h2 className="s" id="state">
            Frontend state &amp; events
          </h2>
          <p className="lead">
            A single Zustand store is the projection of the server event stream — the
            same model this prototype runs on.
          </p>
          <div className="block">
            <div className="bar">store/audit.ts — event union</div>
            <pre>{`type AuditEvent =
  | { t: 'phase';     phase: Phase }
  | { t: 'reason';    text: string }
  | { t: 'invariant'; id: string; statement: string }
  | { t: 'action';    label: string; screenshot: string }
  | { t: 'finding';   finding: Finding }
  | { t: 'test';      findingId: string; code: string }
  | { t: 'done';      runtimeMs: number };
// reducer appends to feed, swaps the browser frame, spawns findings.`}</pre>
          </div>
        </main>
      </div>
    </div>
  );
}

const archCss = `
  .doc { max-width: 1080px; margin: 0 auto; padding: 0 28px; display: grid; grid-template-columns: 210px 1fr; gap: 40px; }
  .toc { position: sticky; top: 0; height: 100vh; padding: 32px 0; align-self: start; }
  .toc .wm { margin-bottom: 22px; display: inline-flex; align-items: center; gap: 9px; }
  .toc a { display: block; color: var(--tx-2); font-size: 12.5px; text-decoration: none; padding: 6px 0; transition: color .12s; border-left: 1px solid transparent; padding-left: 12px; margin-left: -12px; }
  .toc a:hover, .toc a.on { color: var(--tx-0); border-color: var(--acc); }
  .body { padding: 40px 0 100px; min-width: 0; }
  .doc-head { padding-bottom: 26px; border-bottom: 1px solid var(--line); margin-bottom: 8px; }
  .doc-head h1 { font-size: 30px; letter-spacing: -0.03em; }
  .doc-head p { color: var(--tx-1); font-size: 14.5px; line-height: 1.55; margin: 12px 0 0; max-width: 640px; }
  .doc-head .meta { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
  h2.s { font-size: 20px; letter-spacing: -0.02em; margin: 52px 0 4px; scroll-margin-top: 24px; }
  .lead { color: var(--tx-1); font-size: 14px; line-height: 1.6; margin: 10px 0 18px; max-width: 660px; text-wrap: pretty; }
  p.note { color: var(--tx-1); font-size: 13.5px; line-height: 1.6; max-width: 660px; }
  code.ic { font-family: var(--mono); font-size: 12.5px; color: var(--acc); background: var(--acc-soft); border: 1px solid var(--acc-line); padding: 1px 6px; border-radius: 5px; }

  .block { border: 1px solid var(--line-2); border-radius: 11px; overflow: hidden; background: var(--bg-inset); margin: 16px 0; }
  .block .bar { font-family: var(--mono); font-size: 11.5px; color: var(--tx-1); padding: 9px 14px; background: var(--bg-2); border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 8px; }
  .block pre { margin: 0; padding: 16px; font-family: var(--mono); font-size: 12.5px; line-height: 1.65; color: #c9c9cf; overflow-x: auto; white-space: pre; }

  table.api { width: 100%; border-collapse: collapse; margin: 16px 0; }
  table.api th { text-align: left; font-family: var(--mono); font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase; color: var(--tx-3); padding: 0 12px 11px; border-bottom: 1px solid var(--line); }
  table.api td { padding: 11px 12px; border-bottom: 1px solid var(--line); font-size: 12.5px; color: var(--tx-1); vertical-align: top; }
  table.api .m { font-family: var(--mono); font-weight: 600; }
  table.api .p { font-family: var(--mono); color: var(--tx-0); }
  .verb { font-family: var(--mono); font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
  .get { color: #7fb0ff; background: rgba(127,176,255,.12); } .post { color: var(--ok); background: var(--ok-soft); } .ws { color: var(--acc); background: var(--acc-soft); }

  .flow { display: flex; flex-direction: column; gap: 0; margin: 18px 0; }
  .fl { display: flex; gap: 14px; align-items: flex-start; }
  .fl .rail { display: flex; flex-direction: column; align-items: center; flex: none; }
  .fl .dot { width: 24px; height: 24px; border-radius: 7px; border: 1px solid var(--acc-line); background: var(--acc-soft); color: var(--acc); font-family: var(--mono); font-size: 11px; font-weight: 600; display: grid; place-items: center; }
  .fl .tail { width: 1px; flex: 1; background: var(--line-2); min-height: 26px; }
  .fl .c { padding-bottom: 22px; }
  .fl .c b { font-size: 13.5px; color: var(--tx-0); font-weight: 500; }
  .fl .c span { display: block; font-size: 12.5px; color: var(--tx-2); margin-top: 3px; line-height: 1.5; }
  .fl .c .mono { color: var(--acc-dim); }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 16px 0; }
  .mini { border: 1px solid var(--line); background: var(--bg-1); border-radius: 10px; padding: 15px; }
  .mini h4 { font-size: 13.5px; display: flex; align-items: center; gap: 8px; }
  .mini .pill { margin-bottom: 0; }
  .mini p { font-size: 12.5px; color: var(--tx-1); line-height: 1.55; margin: 9px 0 0; }
  .mini ul { margin: 9px 0 0; padding-left: 16px; } .mini li { font-size: 12.5px; color: var(--tx-1); line-height: 1.6; }
  @media (max-width: 820px){ .doc { grid-template-columns: 1fr; } .toc { display: none; } .grid2 { grid-template-columns: 1fr; } }
`;
