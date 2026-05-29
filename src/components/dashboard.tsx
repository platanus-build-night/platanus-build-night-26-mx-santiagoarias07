/* ============================================================
   INVARIANT — dashboard app + cinematic run engine
   ============================================================ */
"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, PhaseStepper } from "@/components/ui";
import { runLiveAudit } from "@/lib/live-audit";
import { FeedPanel, BrowserPreview } from "@/components/panels";
import {
  Sidebar,
  TopNav,
  FindingsList,
  FindingDrawer,
  FindingsView,
  TestsView,
  HistoryView,
} from "@/components/views";
import {
  FINDINGS,
  HISTORY,
  PHASES,
  RUN,
  TARGET,
  TESTS,
  type Finding,
  type FrameId,
  type PhaseId,
  type RunEventWithTs,
} from "@/lib/data";

const STORE_KEY = "invariant_run_v1";

type RunStatus = "idle" | "running" | "paused" | "done";
type ViewId = "live" | "findings" | "tests" | "history";
type RunMode = "live" | "demo";

const fmtClock = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(
    Math.floor(sec % 60),
  ).padStart(2, "0")}`;

export default function DashboardApp() {
  const [view, setView] = useState<ViewId>("live");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [events, setEvents] = useState<RunEventWithTs[]>([]);
  const [phase, setPhase] = useState<PhaseId | null>(null);
  const [phasesSeen, setPhasesSeen] = useState<Set<PhaseId>>(new Set());
  const [frame, setFrame] = useState<FrameId>("home");
  const [captured, setCaptured] = useState<FrameId[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [testsUnlocked, setTestsUnlocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sel, setSel] = useState<Finding | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mode, setMode] = useState<RunMode>("live");

  const idx = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const runKind = useRef<RunMode>("demo");
  const liveAbort = useRef<AbortController | null>(null);
  // mirror of accumulated run state, so finish() can persist either mode
  const snap = useRef<{ events: RunEventWithTs[]; captured: FrameId[]; findings: string[]; frame: FrameId }>(
    { events: [], captured: [], findings: [], frame: "home" },
  );

  /* ---- hydrate a finished run on load (survives refresh during a pitch) ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setEvents(s.events || []);
        setFrame((s.frame as FrameId) || "orderPaid");
        setCaptured((s.captured as FrameId[]) || []);
        setFindings(
          ((s.findings as string[]) || [])
            .map((id) => FINDINGS.find((f) => f.id === id))
            .filter((f): f is Finding => Boolean(f)),
        );
        setTestsUnlocked(true);
        setStatus("done");
        setPhase("report");
        setPhasesSeen(new Set(PHASES.map((p) => p.id)));
        setElapsed(38);
        elapsedRef.current = 38;
      }
    } catch {
      /* ignore */
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (clock.current) clearInterval(clock.current);
      if (liveAbort.current) liveAbort.current.abort();
    };
  }, []);

  const startClock = () => {
    if (clock.current) clearInterval(clock.current);
    clock.current = setInterval(() => {
      elapsedRef.current += 0.1;
      setElapsed(elapsedRef.current);
    }, 100);
  };

  /* ---- apply one RunEvent's side-effects (shared by scripted + live) ---- */
  const pushEvent = (e: RunEventWithTs) => {
    setEvents((prev) => [...prev, e]);
    snap.current.events = [...snap.current.events, e];
    if (e.phase) {
      setPhase(e.phase);
      setPhasesSeen((s) => new Set(s).add(e.phase!));
    }
    if (e.frame) {
      const fr = e.frame;
      setFrame(fr);
      snap.current.frame = fr;
      if (!snap.current.captured.includes(fr)) snap.current.captured.push(fr);
      setCaptured((c) => (c.includes(fr) ? c : [...c, fr]));
    }
    if (e.finding) {
      const f = FINDINGS.find((x) => x.id === e.finding);
      if (f) {
        if (!snap.current.findings.includes(f.id)) snap.current.findings.push(f.id);
        setFindings((prev) => (prev.find((p) => p.id === f.id) ? prev : [...prev, f]));
      }
    }
    if (e.test) setTestsUnlocked(true);
  };

  const persist = () => {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          events: snap.current.events,
          frame: snap.current.frame || "orderPaid",
          captured: snap.current.captured,
          findings: snap.current.findings,
        }),
      );
    } catch {
      /* ignore */
    }
  };

  const finish = () => {
    if (clock.current) clearInterval(clock.current);
    if (liveAbort.current) liveAbort.current.abort();
    setStatus("done");
    setTimeout(persist, 0);
  };

  /* ---- scripted demo engine (deterministic, offline fallback) ---- */
  const step = () => {
    if (idx.current >= RUN.length) {
      finish();
      return;
    }
    const e = RUN[idx.current];
    pushEvent({ ...e, ts: fmtClock(elapsedRef.current) });
    const dur = e.dur || 1000;
    idx.current++;
    timer.current = setTimeout(step, dur);
  };

  const resetRun = () => {
    if (timer.current) clearTimeout(timer.current);
    if (clock.current) clearInterval(clock.current);
    if (liveAbort.current) liveAbort.current.abort();
    localStorage.removeItem(STORE_KEY);
    idx.current = 0;
    elapsedRef.current = 0;
    snap.current = { events: [], captured: [], findings: [], frame: "home" };
    setEvents([]);
    setPhase(null);
    setPhasesSeen(new Set());
    setFrame("home");
    setCaptured([]);
    setFindings([]);
    setTestsUnlocked(false);
    setElapsed(0);
    setStatus("running");
    setView("live");
    setSel(null);
    startClock();
  };

  const launchScripted = () => {
    runKind.current = "demo";
    resetRun();
    timer.current = setTimeout(step, 350);
  };

  /* ---- live engine: real Claude driving the shop via /api/audit ---- */
  const launchLive = () => {
    runKind.current = "live";
    resetRun();
    const ctrl = new AbortController();
    liveAbort.current = ctrl;
    runLiveAudit({
      signal: ctrl.signal,
      onEvent: (e) => pushEvent({ ...e, ts: fmtClock(elapsedRef.current) }),
      onDone: finish,
      onFallback: (reason) => {
        if (ctrl.signal.aborted) return;
        // live unavailable → seamlessly play the deterministic demo instead
        showToast("Live agent unavailable — playing demo run");
        // eslint-disable-next-line no-console
        console.warn("[invariant] live audit fell back:", reason);
        launchScripted();
      },
    });
  };

  const launch = () => {
    if (mode === "demo") launchScripted();
    else launchLive();
  };

  const pause = () => {
    if (timer.current) clearTimeout(timer.current);
    if (clock.current) clearInterval(clock.current);
    if (liveAbort.current) liveAbort.current.abort();
    setStatus("paused");
  };

  const resume = () => {
    setStatus("running");
    startClock();
    if (runKind.current === "live") {
      // the stream can't be paused server-side; restart a fresh live run
      launchLive();
    } else {
      timer.current = setTimeout(step, 250);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1900);
  };

  const openFinding = (f: Finding) => setSel(f);

  const running = status === "running";
  const runId = status === "idle" ? null : "#A-1042";
  const viewLabel = (
    {
      live: running ? "Live audit" : "New Audit",
      findings: "Findings",
      tests: "Tests",
      history: "History",
    } as const
  )[view];

  return (
    <div className="app">
      <Sidebar
        view={view}
        setView={setView}
        running={running}
        counts={{
          findings: findings.length,
          tests: testsUnlocked ? findings.length : 0,
        }}
      />

      <div className="main">
        <TopNav
          runId={runId}
          running={running}
          elapsed={fmtClock(elapsed)}
          viewLabel={viewLabel}
        />

        <div className="workspace">
          {view === "live" &&
            (status === "idle" && events.length === 0 ? (
              <AuditHero onLaunch={launch} mode={mode} setMode={setMode} />
            ) : (
              <LiveView
                status={status}
                events={events}
                phase={phase}
                phasesSeen={phasesSeen}
                frame={frame}
                captured={captured}
                findings={findings}
                testsUnlocked={testsUnlocked}
                running={running}
                openFinding={openFinding}
                setView={setView}
                onPause={pause}
                onResume={resume}
                onRerun={launch}
                setFrame={setFrame}
              />
            ))}
          {view === "findings" && (
            <FindingsView findings={findings} onOpen={openFinding} />
          )}
          {view === "tests" &&
            (testsUnlocked ? (
              <TestsView
                findings={findings}
                onCopy={() => showToast("Test copied to clipboard")}
              />
            ) : (
              <EmptyState
                icon="test"
                title="No tests yet"
                sub="Run an audit — Invariant writes one Playwright spec per finding."
                onLaunch={launch}
              />
            ))}
          {view === "history" && <HistoryView history={HISTORY} />}
        </div>
      </div>

      {sel && (
        <FindingDrawer
          finding={sel}
          test={TESTS[sel.test]}
          onClose={() => setSel(null)}
          onCopy={() => showToast("Test copied to clipboard")}
        />
      )}
      {toast && (
        <div className="toast">
          <Icon name="check" size={14} style={{ color: "var(--ok)" }} />
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- New Audit hero ---------- */
function AuditHero({
  onLaunch,
  mode,
  setMode,
}: {
  onLaunch: () => void;
  mode: RunMode;
  setMode: (m: RunMode) => void;
}) {
  const [url, setUrl] = useState(TARGET);
  return (
    <div className="audit-hero">
      <div className="audit-card fade-in">
        <span className="pill pill-acc badge">
          <span className="live-dot"></span>Adversarial QA agent
        </span>
        <h2>Prove your app wrong.</h2>
        <p>
          Point Invariant at a running web app. It explores the interface, infers the
          business rules that must hold, then attacks each one until something
          contradicts itself.
        </p>
        <div className="mode-toggle" role="tablist" aria-label="Run mode">
          <button
            role="tab"
            aria-selected={mode === "live"}
            className={"mode-opt" + (mode === "live" ? " on" : "")}
            onClick={() => setMode("live")}
          >
            <span className="mode-main">
              <Icon name="bolt" size={12} /> Live agent
            </span>
            <span className="mode-sub">Claude, real-time</span>
          </button>
          <button
            role="tab"
            aria-selected={mode === "demo"}
            className={"mode-opt" + (mode === "demo" ? " on" : "")}
            onClick={() => setMode("demo")}
          >
            <span className="mode-main">
              <Icon name="play" size={12} /> Demo run
            </span>
            <span className="mode-sub">Deterministic replay</span>
          </button>
        </div>
        <div className="audit-input-row">
          <div className="field">
            <Icon name="dot" size={12} style={{ color: "var(--acc)" }} />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              spellCheck="false"
            />
          </div>
          <button className="btn btn-primary" onClick={onLaunch}>
            <Icon name="bolt" size={15} /> Launch audit
          </button>
        </div>
        <div className="suggest">
          <span
            className="dimmer mono"
            style={{ fontSize: 11.5, alignSelf: "center" }}
          >
            try
          </span>
          <span className="chip" onClick={onLaunch}>
            demo-shop.invariant.dev
          </span>
          <span className="chip" onClick={onLaunch}>
            app.northwind.io
          </span>
          <span className="chip" onClick={onLaunch}>
            staging.fern.app
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  sub,
  onLaunch,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  sub: string;
  onLaunch: () => void;
}) {
  return (
    <div className="audit-hero">
      <div className="audit-card" style={{ width: 420 }}>
        <div style={{ display: "grid", placeItems: "center", marginBottom: 6 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              border: "1px solid var(--line-2)",
              display: "grid",
              placeItems: "center",
              color: "var(--tx-2)",
            }}
          >
            <Icon name={icon} size={20} />
          </div>
        </div>
        <h2 style={{ fontSize: 19 }}>{title}</h2>
        <p>{sub}</p>
        <button
          className="btn btn-primary"
          onClick={onLaunch}
          style={{ margin: "0 auto" }}
        >
          <Icon name="bolt" size={15} /> Launch audit
        </button>
      </div>
    </div>
  );
}

/* ---------- Live audit workspace ---------- */
type LiveViewProps = {
  status: RunStatus;
  events: RunEventWithTs[];
  phase: PhaseId | null;
  phasesSeen: Set<PhaseId>;
  frame: FrameId;
  captured: FrameId[];
  findings: Finding[];
  testsUnlocked: boolean;
  running: boolean;
  openFinding: (f: Finding) => void;
  setView: (v: ViewId) => void;
  onPause: () => void;
  onResume: () => void;
  onRerun: () => void;
  setFrame: (f: FrameId) => void;
};

function LiveView(p: LiveViewProps) {
  const total = p.findings.length;
  return (
    <div className="live">
      <div className="run-header">
        <div className="run-target">
          <span
            className="live-dot"
            style={{ background: p.running ? "var(--acc)" : "var(--tx-2)" }}
          ></span>
          <div className="col" style={{ gap: 2 }}>
            <span className="url">{TARGET}</span>
            <span className="rid">run #A-1042 · Chromium 124 · headless</span>
          </div>
        </div>
        <div className="run-sep"></div>
        <PhaseStepper
          phases={PHASES}
          active={p.phase || "explore"}
          doneSet={p.phasesSeen}
        />
        <div style={{ marginLeft: "auto" }} className="row gap-2">
          {p.status === "done" ? (
            <>
              <span className="pill pill-red">
                <Icon name="finding" size={11} />
                {total} findings
              </span>
              <button className="btn btn-sm" onClick={p.onRerun}>
                <Icon name="refresh" size={13} /> Re-run
              </button>
            </>
          ) : (
            <>
              {p.running ? (
                <button className="btn btn-sm btn-ghost" onClick={p.onPause}>
                  <Icon name="pause" size={13} /> Pause
                </button>
              ) : (
                <button className="btn btn-sm btn-ghost" onClick={p.onResume}>
                  <Icon name="play" size={13} /> Resume
                </button>
              )}
              <button className="btn btn-sm" onClick={p.onRerun}>
                <Icon name="refresh" size={13} /> Restart
              </button>
            </>
          )}
        </div>
      </div>

      <div className="live-grid">
        <FeedPanel events={p.events} running={p.running} />

        <div className="live-col">
          <BrowserPreview
            frame={p.frame}
            captured={p.captured}
            running={p.running}
            onPick={p.setFrame}
          />

          <div
            className="panel grow"
            style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <div className="panel-head">
              <div className="panel-title">
                <Icon
                  name="finding"
                  size={15}
                  style={{
                    color: p.findings.length ? "var(--red)" : "var(--tx-2)",
                  }}
                />{" "}
                Findings
              </div>
              <div className="row gap-2">
                {p.testsUnlocked && (
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => p.setView("tests")}
                  >
                    <Icon name="test" size={12} /> Tests
                  </button>
                )}
                <span className="pill mono">{p.findings.length}</span>
              </div>
            </div>
            <div
              style={{ flex: 1, overflowY: "auto", padding: 14, minHeight: 0 }}
            >
              {p.findings.length === 0 ? (
                <div
                  className="dimmer"
                  style={{
                    fontSize: 12.5,
                    textAlign: "center",
                    padding: "26px 0",
                    lineHeight: 1.5,
                  }}
                >
                  No contradictions yet.
                  <br />
                  The agent is still probing the surface.
                </div>
              ) : (
                <FindingsList
                  findings={p.findings}
                  onOpen={p.openFinding}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
