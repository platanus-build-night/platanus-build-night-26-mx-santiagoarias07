/* ============================================================
   INVARIANT — Sidebar, TopNav, Findings/Tests/History views
   ============================================================ */
"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, Mark, Sev, CodeBlock } from "@/components/ui";
import { TESTS, type Finding, type HistoryRow, type TestSpec } from "@/lib/data";

type ViewId = "live" | "findings" | "tests" | "history";

export function Sidebar({
  view,
  setView,
  counts,
  running,
}: {
  view: ViewId;
  setView: (v: ViewId) => void;
  counts: { findings: number; tests: number };
  running: boolean;
}) {
  const items: {
    id: ViewId;
    icon: Parameters<typeof Icon>[0]["name"];
    label: string;
    count?: number;
    live?: boolean;
  }[] = [
    { id: "live", icon: "audit", label: "New Audit", live: running },
    { id: "findings", icon: "finding", label: "Findings", count: counts.findings },
    { id: "tests", icon: "test", label: "Tests", count: counts.tests },
    { id: "history", icon: "history", label: "History" },
  ];
  return (
    <aside className="sidebar">
      <Link
        href="/"
        className="side-brand"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <Mark size={20} />
        <span className="wm-name">Invariant</span>
        <span className="side-ver">v0.1</span>
      </Link>

      <div className="side-group">
        <div className="side-label">Workspace</div>
        {items.map((it) => (
          <div
            key={it.id}
            className={"nav-item" + (view === it.id ? " active" : "")}
            onClick={() => setView(it.id)}
          >
            <Icon name={it.icon} size={16} />
            <span>{it.label}</span>
            {it.live && (
              <span className="live-dot" style={{ marginLeft: "auto" }}></span>
            )}
            {it.count != null && !it.live && <span className="count">{it.count}</span>}
          </div>
        ))}
      </div>

      <div className="side-group">
        <div className="side-label">Settings</div>
        <div className="nav-item">
          <Icon name="settings" size={16} />
          <span>Configuration</span>
        </div>
        <Link
          className="nav-item"
          href="/demo-shop"
          style={{ textDecoration: "none" }}
        >
          <Icon name="browser" size={16} />
          <span>Demo target</span>
          <Icon
            name="external"
            size={13}
            style={{ marginLeft: "auto", color: "var(--tx-3)" }}
          />
        </Link>
        <Link
          className="nav-item"
          href="/architecture"
          style={{ textDecoration: "none" }}
        >
          <Icon name="dom" size={16} />
          <span>Architecture</span>
          <Icon
            name="external"
            size={13}
            style={{ marginLeft: "auto", color: "var(--tx-3)" }}
          />
        </Link>
      </div>

      <div className="side-foot">
        <div className="model-card">
          <span className="av">A</span>
          <div className="col" style={{ gap: 1 }}>
            <span style={{ color: "var(--tx-0)", fontSize: 12.5 }}>
              claude-sonnet-4.5
            </span>
            <span
              className="mono"
              style={{ fontSize: 10.5, color: "var(--ok)" }}
            >
              ● reasoning engine
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function TopNav({
  runId,
  running,
  elapsed,
  viewLabel,
}: {
  runId: string | null;
  running: boolean;
  elapsed: string;
  viewLabel: string;
}) {
  return (
    <div className="topnav">
      <div className="crumb">
        <span>Audits</span>
        <span className="sep">/</span>
        <b>{viewLabel}</b>
        {runId && (
          <span className="pill mono" style={{ marginLeft: 4 }}>
            {runId}
          </span>
        )}
      </div>
      <div className="topnav-right">
        {running ? (
          <span className="pill pill-acc">
            <span className="live-dot"></span>Agent running
          </span>
        ) : (
          <span className="pill">
            <span className="dot" style={{ background: "var(--tx-2)" }}></span>Idle
          </span>
        )}
        <span className="clock">{elapsed}</span>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "var(--bg-3)",
            border: "1px solid var(--line-2)",
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            color: "var(--tx-1)",
          }}
        >
          AD
        </div>
      </div>
    </div>
  );
}

/* ---------- findings list (compact card) ---------- */
export function FindingsList({
  findings,
  onOpen,
}: {
  findings: Finding[];
  onOpen: (f: Finding) => void;
}) {
  return (
    <div className="find-list">
      {findings.map((f) => (
        <div className="find-card fade-in" key={f.id} onClick={() => onOpen(f)}>
          <div className="find-top">
            <Sev level={f.sev} />
            <span className="id mono">{f.id}</span>
            <span className="pill pill-acc" style={{ height: 20 }}>
              {f.invariant}
            </span>
            <Icon
              name="chevron"
              size={15}
              className="chev"
              style={{ marginLeft: "auto", color: "var(--tx-3)" }}
            />
          </div>
          <div className="find-title">{f.title}</div>
          <div className="find-where">
            <Icon name="dot" size={9} />
            {f.where}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- code viewer with copy / download ---------- */
function downloadFile(name: string, text: string) {
  const blob = new Blob([text], { type: "text/typescript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.split("/").pop() ?? name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CodeViewer({
  test,
  onCopy,
  typed,
}: {
  test: TestSpec;
  onCopy?: () => void;
  typed?: number | null;
}) {
  return (
    <div className="code-wrap">
      <div className="code-bar">
        <span className="code-file">
          <Icon name="test" size={13} style={{ color: "var(--acc)" }} />
          {test.file}
        </span>
        <span className="pill pill-ok" style={{ height: 19 }}>
          generated
        </span>
        <div className="code-actions">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              navigator.clipboard?.writeText(test.code);
              onCopy && onCopy();
            }}
          >
            <Icon name="copy" size={13} /> Copy
          </button>
          <button
            className="btn btn-sm"
            onClick={() => downloadFile(test.file, test.code)}
          >
            <Icon name="download" size={13} /> Download
          </button>
        </div>
      </div>
      <div className="code-scroll">
        <CodeBlock code={test.code} typed={typed} />
      </div>
    </div>
  );
}

/* ---------- finding drawer ---------- */
export function FindingDrawer({
  finding,
  test,
  onClose,
  onCopy,
}: {
  finding: Finding;
  test?: TestSpec;
  onClose: () => void;
  onCopy?: () => void;
}) {
  if (!finding) return null;
  return (
    <>
      <div className="drawer-back" onClick={onClose}></div>
      <div className="drawer">
        <div className="drawer-head">
          <div className="row gap-2" style={{ justifyContent: "space-between" }}>
            <div className="row gap-2">
              <Sev level={finding.sev} />
              <span
                className="mono dimmer"
                style={{ fontSize: 12, whiteSpace: "nowrap" }}
              >
                {finding.id}
              </span>
              <span className="pill pill-acc" style={{ height: 20 }}>
                {finding.invariant}
              </span>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>
              <Icon name="x" size={15} />
            </button>
          </div>
          <h3
            style={{
              fontSize: 18,
              marginTop: 14,
              letterSpacing: "-0.02em",
              textWrap: "pretty",
            }}
          >
            {finding.title}
          </h3>
          <div className="find-where" style={{ marginTop: 8 }}>
            <Icon name="browser" size={12} />
            {finding.where}
          </div>
        </div>
        <div className="drawer-body">
          <div className="dr-block">
            <div className="dr-label">Violated invariant</div>
            <div className="dr-rule">{finding.rule}</div>
          </div>

          <div className="dr-block">
            <div className="dr-ea">
              <div className="dr-cell exp">
                <div className="h">
                  <Icon name="check" size={12} /> Expected
                </div>
                {finding.expected}
              </div>
              <div className="dr-cell act">
                <div className="h">
                  <Icon name="finding" size={12} /> Actual
                </div>
                {finding.actual}
              </div>
            </div>
          </div>

          <div className="dr-block">
            <div className="dr-label">Impact</div>
            <div
              style={{ fontSize: 13, color: "var(--tx-1)", lineHeight: 1.55 }}
            >
              {finding.impact}
            </div>
          </div>

          <div className="dr-block">
            <div className="dr-label">Reproduction</div>
            <div className="dr-steps">
              {finding.steps.map((s, i) => (
                <div className="dr-step" key={i}>
                  <span className="n">{i + 1}</span>
                  <span className="t">{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dr-block" style={{ marginBottom: 0 }}>
            <div className="dr-label">Generated regression test</div>
            {test && <CodeViewer test={test} onCopy={onCopy} />}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- full Findings view ---------- */
export function FindingsView({
  findings,
  onOpen,
}: {
  findings: Finding[];
  onOpen: (f: Finding) => void;
}) {
  return (
    <div className="view-scroll">
      <div className="view-head">
        <h2>Findings</h2>
        <p>
          {findings.length} contradictions across{" "}
          {new Set(findings.map((f) => f.invariant)).size} invariants ·
          demo-shop.invariant.dev
        </p>
      </div>
      <div className="find-list" style={{ maxWidth: 760 }}>
        {findings.map((f) => (
          <div
            className="find-card"
            key={f.id}
            onClick={() => onOpen(f)}
            style={{ padding: 16 }}
          >
            <div className="find-top">
              <Sev level={f.sev} />
              <span className="id mono">{f.id}</span>
              <span className="pill pill-acc" style={{ height: 20 }}>
                {f.invariant}
              </span>
              <Icon
                name="chevron"
                size={15}
                style={{ marginLeft: "auto", color: "var(--tx-3)" }}
              />
            </div>
            <div className="find-title" style={{ fontSize: 14.5 }}>
              {f.title}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--tx-1)",
                lineHeight: 1.5,
                marginTop: 8,
                maxWidth: 600,
              }}
            >
              {f.actual}
            </div>
            <div className="find-where" style={{ marginTop: 10 }}>
              <Icon name="dot" size={9} />
              {f.where}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tests view ---------- */
export function TestsView({
  findings,
  onCopy,
}: {
  findings: Finding[];
  onCopy?: () => void;
}) {
  const order = findings.map((f) => f.test);
  const [active, setActive] = useState<string>(order[0] ?? "INV-02");
  const test = TESTS[active];
  return (
    <div className="view-scroll">
      <div className="view-head">
        <h2>Generated regression tests</h2>
        <p>
          One Playwright spec per finding — drop into your suite to lock the bug
          closed forever.
        </p>
      </div>
      <div style={{ maxWidth: 760 }}>
        <div className="test-tabs">
          {order.map((t) => (
            <button
              key={t}
              className={"test-tab" + (t === active ? " active" : "")}
              onClick={() => setActive(t)}
            >
              <Icon name="test" size={12} /> {TESTS[t].file.split("/").pop()}
            </button>
          ))}
        </div>
        {test && <CodeViewer test={test} onCopy={onCopy} />}
        <div
          style={{
            marginTop: 14,
            fontFamily: "var(--mono)",
            fontSize: 11.5,
            color: "var(--tx-3)",
          }}
        >
          $ npx playwright test {test ? test.file : ""}
        </div>
      </div>
    </div>
  );
}

/* ---------- History view ---------- */
export function HistoryView({ history }: { history: HistoryRow[] }) {
  const SevDots = ({ r }: { r: HistoryRow }) => (
    <span className="sev-dots">
      {r.crit > 0 && <b style={{ color: "var(--sev-crit)" }}>● {r.crit}</b>}
      {r.high > 0 && <b style={{ color: "var(--sev-high)" }}>● {r.high}</b>}
      {r.med > 0 && <b style={{ color: "var(--sev-med)" }}>● {r.med}</b>}
      {r.crit + r.high + r.med === 0 && (
        <b style={{ color: "var(--ok)" }}>clean</b>
      )}
    </span>
  );
  return (
    <div className="view-scroll">
      <div className="view-head">
        <h2>Audit history</h2>
        <p>Every run is reproducible — reports and tests are versioned with the target.</p>
      </div>
      <div className="panel" style={{ maxWidth: 880, overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Run</th>
              <th>Target</th>
              <th>When</th>
              <th>Runtime</th>
              <th>Findings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((r) => (
              <tr key={r.id}>
                <td className="id-cell">{r.id}</td>
                <td className="mono" style={{ fontSize: 12.5 }}>
                  {r.target}
                </td>
                <td>{r.when}</td>
                <td className="mono" style={{ fontSize: 12.5 }}>
                  {r.runtime}
                </td>
                <td>
                  <SevDots r={r} />
                </td>
                <td>
                  {r.status === "running" ? (
                    <span className="pill pill-acc" style={{ height: 20 }}>
                      <span className="live-dot"></span>running
                    </span>
                  ) : r.status === "clean" ? (
                    <span className="pill pill-ok" style={{ height: 20 }}>
                      passed
                    </span>
                  ) : (
                    <span className="pill" style={{ height: 20 }}>
                      complete
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
