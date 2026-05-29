/* ============================================================
   INVARIANT — Live Agent Feed + Browser Preview panels
   ============================================================ */
"use client";

import { useEffect, useRef } from "react";
import { Icon, Mark } from "@/components/ui";
import { ShopFrame } from "@/components/shop";
import type { EventKind, FrameId, RunEventWithTs } from "@/lib/data";

const KIND: Record<EventKind, { tag: string; cls: string }> = {
  sys: { tag: "SYSTEM", cls: "k-sys" },
  nav: { tag: "NAVIGATE", cls: "k-act" },
  see: { tag: "OBSERVE", cls: "k-see" },
  think: { tag: "REASON", cls: "k-think" },
  inv: { tag: "INVARIANT", cls: "k-inv" },
  atk: { tag: "PROBE", cls: "k-atk" },
  chk: { tag: "CHECK", cls: "k-chk" },
  viol: { tag: "VIOLATION", cls: "k-viol" },
  rep: { tag: "REPORT", cls: "k-rep" },
};

function FeedItem({ e, last }: { e: RunEventWithTs; last: boolean }) {
  const meta = KIND[e.k] ?? KIND.sys;
  const dotColor =
    e.k === "viol"
      ? "var(--red)"
      : e.k === "inv" || e.k === "atk" || e.k === "rep"
        ? "var(--acc)"
        : e.k === "think"
          ? "var(--acc-dim)"
          : e.k === "chk"
            ? "var(--ok)"
            : "var(--tx-2)";

  return (
    <div className={"feed-item fade-in " + meta.cls}>
      <div className="feed-rail">
        <span
          className="feed-node"
          style={{
            background: dotColor,
            boxShadow: last ? `0 0 0 3px ${dotColor}33` : "none",
          }}
        ></span>
        {!last && <span className="feed-tail"></span>}
      </div>
      <div className="feed-content">
        <div className="feed-meta">
          <span className="feed-kind" style={{ color: dotColor }}>
            {meta.tag}
          </span>
          {e.id && <span className="feed-id mono">{e.id}</span>}
          <span className="feed-ts mono">{e.ts}</span>
        </div>
        <div className="feed-txt">{e.txt}</div>
        {e.sub && <div className="feed-sub mono">{e.sub}</div>}
        {e.finding && (
          <div className="feed-finding">
            <Icon name="finding" size={12} /> Finding {e.finding} recorded — screenshots
            + repro captured
          </div>
        )}
        {e.test && (
          <div
            className="feed-finding"
            style={{
              color: "var(--acc)",
              borderColor: "var(--acc-line)",
              background: "var(--acc-soft)",
            }}
          >
            <Icon name="test" size={12} /> Regression test written to repo
          </div>
        )}
      </div>
    </div>
  );
}

export function FeedPanel({
  events,
  running,
}: {
  events: RunEventWithTs[];
  running: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events.length]);
  return (
    <div
      className="panel grow"
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <div className="panel-head">
        <div className="panel-title">
          <Icon name="feed" size={15} style={{ color: "var(--acc)" }} /> Agent feed
        </div>
        <div className="row gap-2">
          {running && (
            <span className="pill pill-acc">
              <span className="live-dot"></span>thinking
            </span>
          )}
          <span className="pill mono">{events.length} events</span>
        </div>
      </div>
      <div className="feed-scroll" ref={ref}>
        {events.length === 0 && (
          <div className="feed-empty">
            <Mark size={26} color="var(--tx-3)" />
            <div style={{ marginTop: 14, color: "var(--tx-1)", fontSize: 13 }}>
              No active run.
            </div>
            <div style={{ color: "var(--tx-2)", fontSize: 12.5, marginTop: 3 }}>
              Launch an audit to watch the agent reason in real time.
            </div>
          </div>
        )}
        {events.map((e, i) => (
          <FeedItem key={i} e={e} last={i === events.length - 1 && running} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Browser preview ---------- */
export const FRAME_PATH: Record<FrameId, string> = {
  home: "/",
  cart: "/cart",
  cartQty: "/cart",
  cartNeg: "/cart",
  coupon1: "/cart",
  coupon3: "/cart",
  checkout: "/checkout",
  orderPaid: "/order/1041",
};

export const FRAME_ORDER: FrameId[] = [
  "home",
  "cart",
  "cartQty",
  "cartNeg",
  "coupon1",
  "coupon3",
  "checkout",
  "orderPaid",
];

function Thumb({
  frame,
  active,
  onClick,
}: {
  frame: FrameId;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={"thumb" + (active ? " active" : "")}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      title={frame}
    >
      <div className="thumb-inner">
        <ShopFrame frame={frame} />
      </div>
    </div>
  );
}

export function BrowserPreview({
  frame,
  captured,
  running,
  onPick,
}: {
  frame: FrameId;
  captured: FrameId[];
  running: boolean;
  onPick?: (f: FrameId) => void;
}) {
  const path = FRAME_PATH[frame] ?? "/";
  return (
    <div
      className="panel"
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <div className="panel-head">
        <div className="panel-title">
          <Icon name="browser" size={15} style={{ color: "var(--acc)" }} /> Browser
        </div>
        <div className="row gap-2">
          {running && (
            <span className="pill pill-red">
              <span className="dot"></span>REC
            </span>
          )}
          <span className="pill mono">Chromium</span>
        </div>
      </div>

      <div style={{ padding: 12, paddingBottom: 0 }}>
        <div className="browser-chrome">
          <div className="bc-bar">
            <span className="bc-dot" style={{ background: "#ff5f57" }}></span>
            <span className="bc-dot" style={{ background: "#febc2e" }}></span>
            <span className="bc-dot" style={{ background: "#28c840" }}></span>
            <div className="bc-url mono">
              <Icon name="dot" size={10} style={{ color: "var(--tx-3)" }} />
              demo-shop.invariant.dev
              <span style={{ color: "var(--tx-0)" }}>{path}</span>
            </div>
            <Icon name="refresh" size={13} style={{ color: "var(--tx-2)" }} />
          </div>
          <div className="bc-viewport">
            <ShopFrame frame={frame} />
          </div>
        </div>
      </div>

      <div className="filmstrip">
        <div className="film-label mono">CAPTURES</div>
        <div className="film-track">
          {FRAME_ORDER.filter((f) => captured.includes(f)).map((f) => (
            <Thumb
              key={f}
              frame={f}
              active={f === frame}
              onClick={() => onPick && onPick(f)}
            />
          ))}
          {captured.length === 0 && (
            <span className="dimmer" style={{ fontSize: 12 }}>
              —
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
