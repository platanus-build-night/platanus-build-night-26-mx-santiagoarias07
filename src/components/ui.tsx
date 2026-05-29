/* ============================================================
   INVARIANT — shared UI atoms + a tiny TS highlighter
   ============================================================ */
"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Severity } from "@/lib/data";

/* ---------- brand mark: a square whose corner is "violated" ---------- */
export function Mark({
  size = 19,
  color = "var(--acc)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4"
        stroke={color}
        strokeWidth="1.8"
        strokeDasharray="34 8"
      />
      <circle cx="20" cy="4" r="3.2" fill="var(--red)" />
    </svg>
  );
}

/* ---------- icon set (simple line glyphs) ---------- */
export type IconName =
  | "audit"
  | "feed"
  | "browser"
  | "finding"
  | "test"
  | "history"
  | "settings"
  | "copy"
  | "download"
  | "check"
  | "arrow"
  | "refresh"
  | "play"
  | "pause"
  | "chevron"
  | "external"
  | "x"
  | "dom"
  | "bolt"
  | "dot";

const PATHS: Record<IconName, ReactNode> = {
  audit: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M11 7v8M7 11h8M16 16l5 5" />
    </>
  ),
  feed: <path d="M3 12h3l2-7 4 16 3-9h6" />,
  browser: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <circle cx="6" cy="6.5" r=".6" fill="currentColor" />
    </>
  ),
  finding: (
    <>
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4M12 17v.5" />
    </>
  ),
  test: <path d="M8 6l-5 6 5 6M16 6l5 6-5 6" />,
  history: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  download: <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />,
  check: <path d="M5 12l4 4 10-11" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  refresh: <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 4v4h-4" />,
  play: <path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  external: (
    <>
      <path d="M14 5h5v5M19 5l-8 8M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  dom: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 4v16M4 9h5" />
    </>
  ),
  bolt: <path d="M13 3L5 13h6l-1 8 8-10h-6z" />,
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
};

export function Icon({
  name,
  size = 16,
  stroke = 1.7,
  style,
  className,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
    >
      {PATHS[name] ?? null}
    </svg>
  );
}

/* ---------- TS syntax highlighter → React spans ---------- */
const KW = new Set([
  "import",
  "from",
  "const",
  "let",
  "var",
  "function",
  "async",
  "await",
  "return",
  "new",
  "of",
  "in",
  "if",
  "else",
  "for",
  "while",
  "export",
  "default",
  "true",
  "false",
  "null",
  "undefined",
]);

function highlightLine(line: string, key: number) {
  const re =
    /(\/\/[^\n]*)|('[^']*'|"[^"]*"|`[^`]*`|\/[^/\n]+\/[a-z]*)|([A-Za-z_$][\w$]*)|(\d+(?:\.\d+)?)|([{}()\[\];:,.<>=+\-*/!?&|]+)|(\s+)/g;
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    if (m[1]) {
      out.push(
        <span key={i++} className="tok-com">
          {m[1]}
        </span>,
      );
    } else if (m[2]) {
      out.push(
        <span key={i++} className="tok-str">
          {m[2]}
        </span>,
      );
    } else if (m[3]) {
      const word = m[3];
      const after = line[re.lastIndex];
      if (KW.has(word)) {
        out.push(
          <span key={i++} className="tok-key">
            {word}
          </span>,
        );
      } else if (after === "(") {
        out.push(
          <span key={i++} className="tok-fn">
            {word}
          </span>,
        );
      } else {
        out.push(<span key={i++}>{word}</span>);
      }
    } else if (m[4]) {
      out.push(
        <span key={i++} className="tok-num">
          {m[4]}
        </span>,
      );
    } else if (m[5]) {
      out.push(
        <span key={i++} className="tok-pun">
          {m[5]}
        </span>,
      );
    } else {
      out.push(<span key={i++}>{m[6]}</span>);
    }
  }
  return <span key={key}>{out}</span>;
}

export function CodeBlock({ code, typed }: { code: string; typed?: number | null }) {
  const lines = (typed != null ? code.slice(0, typed) : code).split("\n");
  return (
    <div style={{ display: "flex", padding: "14px 0" }}>
      <div
        style={{
          flex: "none",
          textAlign: "right",
          padding: "0 14px 0 16px",
          color: "var(--tx-3)",
          fontFamily: "var(--mono)",
          fontSize: 12.5,
          lineHeight: "1.65",
          userSelect: "none",
        }}
      >
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="code" style={{ margin: 0, paddingRight: 16, overflowX: "auto" }}>
        {lines.map((ln, i) => (
          <div key={i}>
            {highlightLine(ln, i)}
            {"\n"}
          </div>
        ))}
      </pre>
    </div>
  );
}

/* ---------- severity tag ---------- */
const SEV_LABEL: Record<Severity, string> = {
  crit: "Critical",
  high: "High",
  med: "Medium",
  low: "Low",
};

export function Sev({ level }: { level: Severity }) {
  return <span className={"sev sev-" + level}>{SEV_LABEL[level]}</span>;
}

/* ---------- phase stepper ---------- */
type StepperPhase = { id: string; label: string; n: string };

export function PhaseStepper({
  phases,
  active,
  doneSet,
}: {
  phases: StepperPhase[];
  active: string;
  doneSet: Set<string>;
}) {
  const idx = phases.findIndex((p) => p.id === active);
  return (
    <div className="row" style={{ gap: 0 }}>
      {phases.map((p, i) => {
        const isDone = doneSet.has(p.id);
        const isActive = p.id === active;
        const state: "active" | "done" | "idle" = isActive
          ? "active"
          : isDone || i < idx
            ? "done"
            : "idle";
        return (
          <div key={p.id} className="row" style={{ gap: 0 }}>
            <div
              className="row"
              style={{
                gap: 8,
                opacity: state === "idle" ? 0.4 : 1,
                transition: "opacity .3s",
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  border:
                    "1px solid " +
                    (state === "idle" ? "var(--line-2)" : "var(--acc-line)"),
                  background:
                    state === "active"
                      ? "var(--acc)"
                      : state === "done"
                        ? "var(--acc-soft)"
                        : "transparent",
                  color:
                    state === "active"
                      ? "#1a0e02"
                      : state === "done"
                        ? "var(--acc)"
                        : "var(--tx-2)",
                }}
              >
                {state === "done" ? <Icon name="check" size={11} stroke={2.4} /> : p.n}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: state === "active" ? "var(--tx-0)" : "var(--tx-1)",
                }}
              >
                {p.label}
              </span>
              {state === "active" && (
                <span className="live-dot" style={{ marginLeft: 1 }}></span>
              )}
            </div>
            {i < phases.length - 1 && (
              <div
                style={{
                  width: 26,
                  height: 1,
                  margin: "0 12px",
                  background: i < idx ? "var(--acc-line)" : "var(--line-2)",
                }}
              ></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
