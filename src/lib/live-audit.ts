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

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";

      for (const frame of frames) {
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        let e: LiveEvent;
        try {
          e = JSON.parse(line.slice(5).trim());
        } catch {
          continue;
        }
        if (e.fallback) {
          onFallback(e.txt || "live run unavailable");
          return;
        }
        onEvent(e);
        if (e.done) sawDone = true;
      }
    }
  } catch (e) {
    if (signal.aborted) return;
    if (!sawDone) {
      onFallback(e instanceof Error ? e.message : "stream error");
      return;
    }
  }

  if (sawDone) onDone();
  else onFallback("stream ended early");
}
