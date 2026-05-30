/* ============================================================
   INVARIANT — client-side consumer for the live audit stream.
   Reads the SSE feed from /api/audit and replays it through the
   same RunEvent pipeline the scripted demo uses.
   ============================================================ */
"use client";

import type { RunEvent } from "@/lib/data";

export type LiveEvent = RunEvent & { fallback?: boolean };

type RunOpts = {
  signal: AbortSignal;
  targetId?: string;
  onEvent: (e: RunEvent) => void;
  onDone: () => void;
  /** The server has no key / errored mid-run — caller should play the demo. */
  onFallback: (reason: string) => void;
};

export async function runLiveAudit({ signal, targetId = "ecommerce", onEvent, onDone, onFallback }: RunOpts) {
  let res: Response;
  try {
    res = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId }),
      signal,
    });
  } catch (e) {
    onFallback(e instanceof Error ? e.message : "network error");
    return;
  }

  if (!res.ok || !res.body) {
    onFallback(`audit endpoint returned ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let sawDone = false;
  let eventCount = 0;
  let sawViolation = false;

  const processFrame = (frame: string): "fallback" | void => {
    const line = frame.split("\n").find((l) => l.startsWith("data:"));
    if (!line) return;
    let e: LiveEvent;
    try {
      e = JSON.parse(line.slice(5).trim());
    } catch {
      return;
    }
    if (e.fallback) {
      onFallback(e.txt || "live run unavailable");
      return "fallback";
    }
    onEvent(e);
    eventCount++;
    if (e.k === "viol") sawViolation = true;
    if (e.done) sawDone = true;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";

      for (const frame of frames) {
        if (processFrame(frame) === "fallback") return;
      }
    }
  } catch (e) {
    if (signal.aborted) return;
    // If we never received any sustantive data, surface the error.
    if (eventCount === 0) {
      onFallback(e instanceof Error ? e.message : "stream error");
      return;
    }
    // Otherwise fall through — the run already produced data the user is seeing.
  }

  // Flush any event that arrived without a trailing \n\n before the stream closed.
  if (buf.trim()) {
    if (processFrame(buf) === "fallback") return;
  }

  // Treat the run as completed if:
  //   • the server sent its explicit "done" event, OR
  //   • the agent already produced findings / a meaningful amount of events
  //     (covers Vercel's 60s function timeout cutting the stream after the bugs
  //     were found but before the closing "Audit complete" event). In that case
  //     we must NOT restart the demo, since the user already sees real findings.
  const lookedLikeRealRun = sawViolation || eventCount >= 6;
  if (sawDone || lookedLikeRealRun) onDone();
  else onFallback("stream ended early");
}
