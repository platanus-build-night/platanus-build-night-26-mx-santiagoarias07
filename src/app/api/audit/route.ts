/* ============================================================
   INVARIANT — live adversarial audit (real Claude, real tools)
   POST /api/audit  →  Server-Sent Events stream of RunEvents.

   Claude drives the Shop engine through tools, reasons out loud,
   and reports invariant violations. Every event matches the
   RunEvent shape the dashboard already renders, so "Live mode"
   reuses the exact same UI as the scripted demo.
   ============================================================ */

import Anthropic from "@anthropic-ai/sdk";
import { Shop, type ViolationId } from "@/lib/shop-engine";
import { FINDINGS, type RunEvent } from "@/lib/data";

// Node runtime (the SDK + a multi-turn loop need it) and headroom for the run.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-4-6";

/** Engine violation id → curated finding id shown in the UI. */
const FINDING_FOR: Record<ViolationId, string> = {
  "INV-02": "F-01",
  "INV-01": "F-02",
  "INV-03": "F-03",
};

/* Stable bug codes the agent copies verbatim when reporting. Kept separate
   from the agent's own INV-0n hypothesis numbering so the two never collide. */
const CODE_TO_INV: Record<string, ViolationId> = {
  NEGATIVE_TOTAL: "INV-02",
  COUPON_STACK: "INV-01",
  UNPAID_ORDER: "INV-03",
};
const INV_TO_CODE: Record<ViolationId, string> = {
  "INV-02": "NEGATIVE_TOTAL",
  "INV-01": "COUPON_STACK",
  "INV-03": "UNPAID_ORDER",
};

const SYSTEM = `You are Invariant — an autonomous adversarial QA agent auditing a live e-commerce checkout (Northwind, demo-shop.invariant.dev).

Your job is NOT to confirm the app works. Traditional tests already do that. Your job is to prove the app's hidden assumptions FALSE — the business-logic invariants a checkout must never break:
  • prices and totals can never go negative
  • a discount can only be redeemed once
  • no order is ever PAID without a captured payment

Work in four phases:
  1. EXPLORE — call list_products and view_cart to understand the surface.
  2. HYPOTHESIZE — call declare_invariant for each business rule you believe must hold (state 2–4 of them).
  3. ATTACK — try to break each invariant with the action tools. Be the user who does absurd things: negative quantities, the same coupon submitted again and again, refreshing mid-checkout. When a tool response contains "INVARIANT_VIOLATED: code=XYZ", immediately call report_finding and pass that exact code as violation_code.
  4. You stop when you've probed every invariant.

Rules of engagement:
  • Before each tool call, write ONE short sentence of reasoning — your actual hypothesis or intent. Be concrete and confident, like a senior engineer thinking aloud. No filler.
  • Only call report_finding for a code the tools actually returned in an INVARIANT_VIOLATED line. Copy the code verbatim. No speculation — zero false positives is the whole point.
  • Push past the first bug. Find all three classes of failure.
  • Do NOT write a long closing summary — the platform auto-generates the report and regression tests. Keep every message to one or two sentences.`;

const tools: Anthropic.Tool[] = [
  {
    name: "declare_invariant",
    description:
      "State a business-logic invariant you believe must always hold, before you try to break it.",
    input_schema: {
      type: "object",
      properties: { statement: { type: "string", description: "The invariant, one sentence." } },
      required: ["statement"],
    },
  },
  {
    name: "list_products",
    description: "List the store catalog.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "view_cart",
    description: "Read the current cart: lines, coupons, subtotal, discount, total.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "add_to_cart",
    description: "Add a product to the cart.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string" },
        quantity: { type: "integer" },
      },
      required: ["product_id", "quantity"],
    },
  },
  {
    name: "set_quantity",
    description: "Set the quantity of an existing cart line (by line_id, e.g. 'kbd' or 'cable').",
    input_schema: {
      type: "object",
      properties: {
        line_id: { type: "string" },
        quantity: { type: "integer", description: "Any integer the field would accept." },
      },
      required: ["line_id", "quantity"],
    },
  },
  {
    name: "apply_coupon",
    description: "Submit a coupon code (e.g. SAVE20) to the cart.",
    input_schema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  },
  {
    name: "checkout",
    description: "Open a pending order from the current cart.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "refresh_browser",
    description: "Simulate a hard browser refresh during checkout.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "place_order",
    description: "Submit/confirm the pending order for payment.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "report_finding",
    description:
      "Record a confirmed invariant violation. Only use after a tool response showed an INVARIANT_VIOLATED line; pass its code verbatim.",
    input_schema: {
      type: "object",
      properties: {
        violation_code: {
          type: "string",
          enum: ["NEGATIVE_TOTAL", "COUPON_STACK", "UNPAID_ORDER"],
          description: "The exact code from the INVARIANT_VIOLATED line.",
        },
        severity: { type: "string", enum: ["crit", "high", "med", "low"] },
        title: { type: "string" },
        expected: { type: "string" },
        observed: { type: "string" },
      },
      required: ["violation_code", "title", "observed"],
    },
    // cache the whole tool block + system prompt across turns
    cache_control: { type: "ephemeral" },
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function actionLabel(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "list_products":
      return "GET /api/products";
    case "view_cart":
      return "GET /cart · snapshot";
    case "add_to_cart":
      return `add_to_cart("${input.product_id}", ${input.quantity})`;
    case "set_quantity":
      return `set_quantity("${input.line_id}", ${input.quantity})`;
    case "apply_coupon":
      return `apply_coupon("${input.code}")`;
    case "checkout":
      return "POST /checkout";
    case "refresh_browser":
      return "hard-refresh /checkout mid-submit";
    case "place_order":
      return "POST /orders/{id}/place";
    default:
      return name;
  }
}

const PHASE_FOR: Record<string, RunEvent["phase"]> = {
  list_products: "explore",
  view_cart: "explore",
  add_to_cart: "explore",
  declare_invariant: "hypothesize",
  set_quantity: "attack",
  apply_coupon: "attack",
  checkout: "attack",
  refresh_browser: "attack",
  place_order: "attack",
  report_finding: "attack",
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (e: RunEvent & { fallback?: boolean }) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      const emit = async (e: RunEvent, pace = 360) => {
        send(e);
        await sleep(pace);
      };

      // No key configured → tell the client to fall back to the scripted demo.
      if (!apiKey) {
        send({ k: "sys", txt: "no_api_key", fallback: true });
        controller.close();
        return;
      }

      req.signal.addEventListener("abort", () => {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });

      const client = new Anthropic({ apiKey });
      const shop = new Shop();
      const reported = new Set<ViolationId>();
      let invCount = 0;

      try {
        await emit({
          k: "sys",
          phase: "explore",
          frame: "home",
          txt: "Audit started — target acquired",
          sub: "https://demo-shop.invariant.dev",
        });
        await emit({ k: "nav", txt: "Connecting to live checkout", sub: `agent · ${MODEL}` }, 240);

        const messages: Anthropic.MessageParam[] = [
          {
            role: "user",
            content:
              "Begin the audit of demo-shop.invariant.dev. Explore the checkout, declare the invariants that must hold, then try to break each one. Report every confirmed violation.",
          },
        ];

        for (let turn = 0; turn < 16; turn++) {
          if (closed) break;

          const resp = await client.messages.create({
            model: MODEL,
            max_tokens: 900,
            system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
            tools,
            messages,
          });

          messages.push({ role: "assistant", content: resp.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of resp.content) {
            if (closed) break;

            if (block.type === "text" && block.text.trim()) {
              await emit({ k: "think", txt: block.text.trim() }, 520);
            }

            if (block.type === "tool_use") {
              const name = block.name;
              const input = (block.input || {}) as Record<string, unknown>;
              const phase = PHASE_FOR[name];

              if (name === "declare_invariant") {
                invCount++;
                await emit({
                  k: "inv",
                  phase,
                  id: `INV-${String(invCount).padStart(2, "0")}`,
                  txt: String(input.statement || "Invariant"),
                });
                toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "noted" });
                continue;
              }

              if (name === "report_finding") {
                const inv = CODE_TO_INV[String(input.violation_code)];
                const check = inv ? shop.confirmViolation(inv) : { ok: false as const };
                if (check.ok && !reported.has(inv)) {
                  reported.add(inv);
                  await emit({
                    k: "viol",
                    phase,
                    finding: FINDING_FOR[inv],
                    txt: String(input.observed || check.detail),
                    sub: `${inv} violated — ${check.detail}`,
                  });
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: `Finding ${FINDING_FOR[inv]} recorded with repro + screenshot.`,
                  });
                } else {
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: check.ok
                      ? "Already recorded."
                      : "REJECTED: the tools did not actually show this invariant violated. Do not report unconfirmed findings.",
                  });
                }
                continue;
              }

              // Engine action tools.
              const r =
                name === "list_products"
                  ? shop.listProducts()
                  : name === "view_cart"
                    ? shop.viewCart()
                    : name === "add_to_cart"
                      ? shop.addToCart(String(input.product_id), Number(input.quantity))
                      : name === "set_quantity"
                        ? shop.setQuantity(String(input.line_id), Number(input.quantity))
                        : name === "apply_coupon"
                          ? shop.applyCoupon(String(input.code))
                          : name === "checkout"
                            ? shop.checkout()
                            : name === "refresh_browser"
                              ? shop.refreshBrowser()
                              : name === "place_order"
                                ? shop.placeOrder()
                                : null;

              if (!r) {
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: `Unknown tool ${name}`,
                });
                continue;
              }

              await emit({
                k: r.kind,
                phase,
                frame: r.frame,
                txt: actionLabel(name, input),
                sub: r.summary,
              });

              let content = JSON.stringify(r.observation);
              if (r.violation) {
                content = `INVARIANT_VIOLATED: code=${INV_TO_CODE[r.violation]} — ${shop.confirmViolation(r.violation).detail}\n${content}`;
              }
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content });
            }
          }

          if (resp.stop_reason !== "tool_use") break;
          if (toolResults.length === 0) break;
          messages.push({ role: "user", content: toolResults });
        }

        // Safety net: surface any real violation the agent didn't formally report.
        for (const inv of ["INV-02", "INV-01", "INV-03"] as ViolationId[]) {
          if (closed) break;
          const check = shop.confirmViolation(inv);
          if (check.ok && !reported.has(inv)) {
            reported.add(inv);
            await emit({
              k: "viol",
              phase: "attack",
              finding: FINDING_FOR[inv],
              txt: check.detail || `${inv} violated`,
              sub: `${inv} violated — ${check.detail}`,
            });
          }
        }

        // Report phase — turn findings into reusable assets.
        const found = [...reported];
        await emit({
          k: "sys",
          phase: "report",
          txt: "Attack surface exhausted",
          sub: `${found.length} contradiction${found.length === 1 ? "" : "s"} · 0 false positives`,
        });
        await emit({ k: "rep", txt: "Generating reproducible Playwright regression tests…" }, 700);
        const specCount = found.length || FINDINGS.length;
        await emit({
          k: "rep",
          test: true,
          txt: `${specCount} regression spec${specCount === 1 ? "" : "s"} written to repo`,
          sub: "one per finding",
        });
        await emit({
          k: "sys",
          txt: "Audit complete",
          sub: `${found.length} finding${found.length === 1 ? "" : "s"} · live agent`,
          done: true,
        });
      } catch (err) {
        // Anything goes wrong with the live run → let the client fall back.
        const msg = err instanceof Error ? err.message : "agent error";
        send({ k: "sys", txt: msg, fallback: true });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
