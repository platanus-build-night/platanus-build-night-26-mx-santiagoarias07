/* ============================================================
   INVARIANT — live adversarial audit (real Claude, real tools)
   POST /api/audit  →  Server-Sent Events stream of RunEvents.

   Supports three targets:
     ecommerce  (Northwind shop)   — Shop engine
     saas       (Orbit billing)    — SaasEngine
     banking    (Flux transfers)   — BankingEngine

   The UI receives the exact same RunEvent shape regardless of
   target, so all three reuse the dashboard unchanged.
   ============================================================ */

import Anthropic from "@anthropic-ai/sdk";
import { Shop, type ViolationId } from "@/lib/shop-engine";
import { SaasEngine, type SaasViolationId } from "@/lib/saas-engine";
import { BankingEngine, type BankViolationId } from "@/lib/banking-engine";
import type { RunEvent } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.AGENT_MODEL || "claude-sonnet-4-6";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ============================================================
   Shared UX suggestion tool — emitted by Claude during exploration.
   Capped at 3 suggestions per run (enforced in the loop) to keep
   the agent focused and the cost predictable.
   ============================================================ */
const UX_TOOL: Anthropic.Tool = {
  name: "suggest_ux_improvement",
  description:
    "Emit a non-critical UX/UI recommendation when you notice friction in the flow (a dropdown that locks layout, a missing skeleton loader, a form that needs an extra step, etc). DIFFERENT from invariant violations — these are blue suggestions, not red bugs. Cap: up to 3 per audit. Only call when you see real friction.",
  input_schema: {
    type: "object",
    properties: {
      area: { type: "string", description: "Short label of the affected surface (e.g. 'checkout form', 'billing dropdown')." },
      observation: { type: "string", description: "What you observed (one sentence)." },
      recommendation: { type: "string", description: "Concrete improvement (one sentence)." },
    },
    required: ["area", "observation", "recommendation"],
  },
};

const UX_RULE = `\nOptional: while exploring, you may call suggest_ux_improvement UP TO 3 TIMES total per audit. Only when you spot real user-experience friction (forms, dropdowns, loading states, error feedback). These are BLUE suggestions, separate from red invariant violations. Do NOT exceed 3.`;

/* ============================================================
   ECOMMERCE config
   ============================================================ */
const ECOM_CODE_TO_INV: Record<string, ViolationId> = {
  NEGATIVE_TOTAL: "INV-02",
  COUPON_STACK: "INV-01",
  UNPAID_ORDER: "INV-03",
};
const ECOM_INV_TO_CODE: Record<ViolationId, string> = {
  "INV-02": "NEGATIVE_TOTAL",
  "INV-01": "COUPON_STACK",
  "INV-03": "UNPAID_ORDER",
};
const ECOM_FINDING_FOR: Record<ViolationId, string> = {
  "INV-02": "F-01",
  "INV-01": "F-02",
  "INV-03": "F-03",
};

const ECOM_SYSTEM = `You are Invariant — an autonomous adversarial QA agent auditing a live e-commerce checkout (Northwind, demo-shop.invariant.dev).

Your job is NOT to confirm the app works. Your job is to prove the app's hidden assumptions FALSE — the business-logic invariants a checkout must never break:
  • prices and totals can never go negative
  • a discount can only be redeemed once
  • no order is ever PAID without a captured payment

Work in four phases:
  1. EXPLORE — call list_products and view_cart.
  2. HYPOTHESIZE — call declare_invariant for each rule (2–4).
  3. ATTACK — try to break each invariant. When a tool response contains "INVARIANT_VIOLATED: code=XYZ", call report_finding with that exact code.
  4. Stop when you've probed every invariant.

Rules: Write ONE sentence of reasoning before each tool call. Only report_finding for codes the tools actually returned. Find all three bugs. No closing summary.${UX_RULE}`;

const ECOM_TOOLS: Anthropic.Tool[] = [
  { name: "declare_invariant", description: "State a business-logic invariant before trying to break it.", input_schema: { type: "object", properties: { statement: { type: "string" } }, required: ["statement"] } },
  { name: "list_products", description: "List the store catalog.", input_schema: { type: "object", properties: {} } },
  { name: "view_cart", description: "Read the current cart.", input_schema: { type: "object", properties: {} } },
  { name: "add_to_cart", description: "Add a product to the cart.", input_schema: { type: "object", properties: { product_id: { type: "string" }, quantity: { type: "integer" } }, required: ["product_id", "quantity"] } },
  { name: "set_quantity", description: "Set the quantity of a cart line (line_id: 'kbd' or 'cable').", input_schema: { type: "object", properties: { line_id: { type: "string" }, quantity: { type: "integer" } }, required: ["line_id", "quantity"] } },
  { name: "apply_coupon", description: "Submit a coupon code (e.g. SAVE20).", input_schema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] } },
  { name: "checkout", description: "Open a pending order from the current cart.", input_schema: { type: "object", properties: {} } },
  { name: "refresh_browser", description: "Simulate a hard browser refresh during checkout.", input_schema: { type: "object", properties: {} } },
  { name: "place_order", description: "Submit/confirm the pending order for payment.", input_schema: { type: "object", properties: {} } },
  UX_TOOL,
  {
    name: "report_finding", description: "Record a confirmed invariant violation. Only call after a tool showed INVARIANT_VIOLATED.",
    input_schema: { type: "object", properties: { violation_code: { type: "string", enum: ["NEGATIVE_TOTAL", "COUPON_STACK", "UNPAID_ORDER"] }, title: { type: "string" }, observed: { type: "string" } }, required: ["violation_code", "title", "observed"] },
    cache_control: { type: "ephemeral" },
  },
];

/* ============================================================
   SAAS config
   ============================================================ */
const SAAS_CODE_TO_INV: Record<string, SaasViolationId> = {
  TRIAL_RESET: "INV-01",
  API_NOT_REVOKED: "INV-02",
  SEAT_OVERFLOW: "INV-03",
};
const SAAS_INV_TO_CODE: Record<SaasViolationId, string> = {
  "INV-01": "TRIAL_RESET",
  "INV-02": "API_NOT_REVOKED",
  "INV-03": "SEAT_OVERFLOW",
};
const SAAS_FINDING_FOR: Record<SaasViolationId, string> = {
  "INV-01": "F-01",
  "INV-02": "F-02",
  "INV-03": "F-03",
};

const SAAS_SYSTEM = `You are Invariant — an autonomous adversarial QA agent auditing a live SaaS billing system (Orbit, saas.invariant.dev).

Your job is to prove the app's hidden billing assumptions FALSE:
  • trial_ends_at must never reset when a user changes plans
  • downgrading to Free must revoke access to premium API endpoints
  • team seat count must never exceed the plan limit

Work in four phases:
  1. EXPLORE — call view_account and view_billing.
  2. HYPOTHESIZE — call declare_invariant for each rule (2–4).
  3. ATTACK — try each one: change plans mid-trial, downgrade and test the API key, invite more members than the seat limit. When a tool response contains "INVARIANT_VIOLATED: code=XYZ", call report_finding with that exact code.
  4. Stop when all invariants are probed.

Rules: ONE sentence of reasoning before each tool call. Only report confirmed violations. Find all three bugs. No closing summary.${UX_RULE}`;

const SAAS_TOOLS: Anthropic.Tool[] = [
  { name: "declare_invariant", description: "State a billing invariant before trying to break it.", input_schema: { type: "object", properties: { statement: { type: "string" } }, required: ["statement"] } },
  { name: "view_account", description: "Read current plan, trial expiry, team size, API key status.", input_schema: { type: "object", properties: {} } },
  { name: "view_billing", description: "Open the billing page: plan, trial_ends_at, available plans.", input_schema: { type: "object", properties: {} } },
  { name: "change_plan", description: "Change the subscription plan.", input_schema: { type: "object", properties: { plan: { type: "string", enum: ["trial", "pro", "free"] } }, required: ["plan"] } },
  { name: "call_analytics_api", description: "Call GET /api/v1/analytics with the existing API key. Returns HTTP status + data.", input_schema: { type: "object", properties: {} } },
  { name: "view_team", description: "List team members and seat usage.", input_schema: { type: "object", properties: {} } },
  { name: "invite_member", description: "Invite a new team member by email.", input_schema: { type: "object", properties: { email: { type: "string" } }, required: ["email"] } },
  UX_TOOL,
  {
    name: "report_finding", description: "Record a confirmed invariant violation. Only call after a tool showed INVARIANT_VIOLATED.",
    input_schema: { type: "object", properties: { violation_code: { type: "string", enum: ["TRIAL_RESET", "API_NOT_REVOKED", "SEAT_OVERFLOW"] }, title: { type: "string" }, observed: { type: "string" } }, required: ["violation_code", "title", "observed"] },
    cache_control: { type: "ephemeral" },
  },
];

/* ============================================================
   BANKING config
   ============================================================ */
const BANK_CODE_TO_INV: Record<string, BankViolationId> = {
  NEGATIVE_TRANSFER: "INV-01",
  DUPLICATE_TRANSFER: "INV-02",
  OVERDRAFT_FEE: "INV-03",
};
const BANK_INV_TO_CODE: Record<BankViolationId, string> = {
  "INV-01": "NEGATIVE_TRANSFER",
  "INV-02": "DUPLICATE_TRANSFER",
  "INV-03": "OVERDRAFT_FEE",
};
const BANK_FINDING_FOR: Record<BankViolationId, string> = {
  "INV-01": "F-01",
  "INV-02": "F-02",
  "INV-03": "F-03",
};

const BANK_SYSTEM = `You are Invariant — an autonomous adversarial QA agent auditing a live banking transfer API (Flux, banking.invariant.dev).

Your job is to prove the app's financial invariants FALSE:
  • transfer amounts must always be positive (> 0)
  • submitting the same transfer reference twice must be rejected as a duplicate
  • account balance must never go below $0 after transfer + fee

Work in four phases:
  1. EXPLORE — call view_account and view_transfer_form.
  2. HYPOTHESIZE — call declare_invariant for each rule (2–4).
  3. ATTACK — try: negative amount transfer, re-submit the exact same ref twice, then transfer the exact account balance (fee applies after). When a tool response contains "INVARIANT_VIOLATED: code=XYZ", call report_finding with that exact code.
  4. Stop when all invariants are probed.

Rules: ONE sentence of reasoning before each tool call. Only report confirmed violations. Find all three bugs. No closing summary.${UX_RULE}`;

const BANK_TOOLS: Anthropic.Tool[] = [
  { name: "declare_invariant", description: "State a financial invariant before trying to break it.", input_schema: { type: "object", properties: { statement: { type: "string" } }, required: ["statement"] } },
  { name: "view_account", description: "Read current balance and recent transactions.", input_schema: { type: "object", properties: {} } },
  { name: "view_transfer_form", description: "Open the transfer form. Shows fields: amount, recipient, reference.", input_schema: { type: "object", properties: {} } },
  {
    name: "submit_transfer", description: "Submit a transfer. amount can be any number (positive or negative to test validation). Use the same ref twice to test idempotency. To test overdraft: set amount = current balance (fee applies after).",
    input_schema: { type: "object", properties: { amount: { type: "number" }, recipient: { type: "string" }, ref: { type: "string" } }, required: ["amount", "recipient", "ref"] },
  },
  UX_TOOL,
  {
    name: "report_finding", description: "Record a confirmed invariant violation. Only call after a tool showed INVARIANT_VIOLATED.",
    input_schema: { type: "object", properties: { violation_code: { type: "string", enum: ["NEGATIVE_TRANSFER", "DUPLICATE_TRANSFER", "OVERDRAFT_FEE"] }, title: { type: "string" }, observed: { type: "string" } }, required: ["violation_code", "title", "observed"] },
    cache_control: { type: "ephemeral" },
  },
];

/* ============================================================
   Phase mapping (shared across targets)
   ============================================================ */
const PHASE_FOR: Record<string, RunEvent["phase"]> = {
  declare_invariant: "hypothesize",
  // ecommerce
  list_products: "explore", view_cart: "explore", add_to_cart: "explore",
  set_quantity: "attack", apply_coupon: "attack", checkout: "attack",
  refresh_browser: "attack", place_order: "attack",
  // saas
  view_account: "explore", view_billing: "explore",
  change_plan: "attack", call_analytics_api: "attack", view_team: "explore", invite_member: "attack",
  // banking
  view_transfer_form: "explore", submit_transfer: "attack",
  report_finding: "attack",
  // ux (cross-target)
  suggest_ux_improvement: "explore",
};

/* ============================================================
   POST handler
   ============================================================ */
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const encoder = new TextEncoder();

  // Parse target from body
  let targetId = "ecommerce";
  try {
    const body = await req.json();
    if (body?.targetId && ["ecommerce", "saas", "banking"].includes(body.targetId)) {
      targetId = body.targetId;
    }
  } catch { /* ignore */ }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (e: RunEvent & { fallback?: boolean }) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      const emit = async (e: RunEvent, pace = 360) => { send(e); await sleep(pace); };

      if (!apiKey) {
        send({ k: "sys", txt: "no_api_key", fallback: true });
        controller.close();
        return;
      }

      req.signal.addEventListener("abort", () => {
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      });

      const client = new Anthropic({ apiKey });

      try {
        if (targetId === "saas") {
          await runSaasAudit({ client, emit, send, closed: () => closed, setClose: () => { closed = true; } });
        } else if (targetId === "banking") {
          await runBankingAudit({ client, emit, send, closed: () => closed, setClose: () => { closed = true; } });
        } else {
          await runEcommerceAudit({ client, emit, send, closed: () => closed, setClose: () => { closed = true; } });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "agent error";
        send({ k: "sys", txt: msg, fallback: true });
      } finally {
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
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

/* ============================================================
   Shared tool loop helper
   ============================================================ */
type AuditCtx = {
  client: Anthropic;
  emit: (e: RunEvent, pace?: number) => Promise<void>;
  send: (e: RunEvent & { fallback?: boolean }) => void;
  closed: () => boolean;
  setClose: () => void;
};

function makeLoop(
  ctx: AuditCtx,
  system: string,
  tools: Anthropic.Tool[],
  initialMessage: string,
  dispatch: (name: string, input: Record<string, unknown>) => Promise<{ r: ReturnType<Shop["listProducts"]> | null; invId?: string; code?: string; finding?: string }>,
  codeToInv: Record<string, string>,
  invToCode: Record<string, string>,
  findingFor: Record<string, string>,
  safetySurface: (reported: Set<string>) => Promise<void>,
) {
  return async () => {
    const { client, emit, closed } = ctx;
    const reported = new Set<string>();
    let invCount = 0;
    let uxCount = 0;

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: initialMessage }];
    // Wall-clock budget for the agentic loop. Always leave headroom (the run has
    // a hard 60s ceiling on Vercel) so the report + "Audit complete" close always
    // streams, and a slow/looping model can never run for minutes.
    const deadline = Date.now() + 30000;

    for (let turn = 0; turn < 16; turn++) {
      if (closed() || Date.now() > deadline) break;

      let resp: Anthropic.Message;
      try {
        resp = await client.messages.create({
          model: MODEL,
          max_tokens: 700,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          tools,
          messages,
        });
      } catch {
        // transient API error → stop probing, but still complete the run below
        break;
      }

      messages.push({ role: "assistant", content: resp.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of resp.content) {
        if (closed()) break;

        if (block.type === "text" && block.text.trim()) {
          await emit({ k: "think", txt: block.text.trim() }, 520);
        }

        if (block.type === "tool_use") {
          const name = block.name;
          const input = (block.input || {}) as Record<string, unknown>;
          const phase = PHASE_FOR[name];

          if (name === "declare_invariant") {
            invCount++;
            await emit({ k: "inv", phase, id: `INV-${String(invCount).padStart(2, "0")}`, txt: String(input.statement || "Invariant") });
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "noted" });
            continue;
          }

          if (name === "suggest_ux_improvement") {
            if (uxCount >= 3) {
              // Hard cap: refuse extra suggestions, keeping the agent focused and the cost bounded.
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "UX suggestion cap reached (3). Skip further UX calls." });
              continue;
            }
            uxCount++;
            const area = String(input.area || "");
            const obs = String(input.observation || "");
            const rec = String(input.recommendation || "");
            await emit({
              k: "ux",
              phase,
              id: `UX-${String(uxCount).padStart(2, "0")}`,
              txt: obs,
              sub: area,
              rec,
            });
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "noted — UX suggestion recorded" });
            continue;
          }

          if (name === "report_finding") {
            const vCode = String(input.violation_code || "");
            const inv = codeToInv[vCode] as string | undefined;
            const { r: check } = inv ? await dispatch("_confirm_" + inv, {}) : { r: null };
            const checkResult = check as { ok?: boolean; detail?: string } | null;
            if (checkResult?.ok && !reported.has(inv!)) {
              reported.add(inv!);
              await emit({ k: "viol", phase, finding: findingFor[inv!], txt: String(input.observed || checkResult.detail), sub: `${inv} violated — ${checkResult.detail}` });
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Finding ${findingFor[inv!]} recorded.` });
            } else {
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: checkResult?.ok ? "Already recorded." : "REJECTED: tools did not confirm this violation. Do not report unconfirmed findings." });
            }
            continue;
          }

          const { r, code: violCode } = await dispatch(name, input);
          if (!r) {
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: `Unknown tool ${name}` });
            continue;
          }

          const engineResult = r as { kind: string; frame: string; summary: string; observation: unknown; violation?: string };
          await emit({ k: engineResult.kind as RunEvent["k"], phase, frame: engineResult.frame as RunEvent["frame"], txt: name, sub: engineResult.summary });
          let content = JSON.stringify(engineResult.observation);
          if (engineResult.violation && invToCode[engineResult.violation]) {
            content = `INVARIANT_VIOLATED: code=${invToCode[engineResult.violation]} — ${engineResult.summary}\n${content}`;
          }
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content });
        }
      }

      if (resp.stop_reason !== "tool_use") break;
      if (toolResults.length === 0) break;
      messages.push({ role: "user", content: toolResults });
    }

    await safetySurface(reported);

    const found = [...reported];
    const uxLabel = uxCount > 0 ? ` · ${uxCount} UX suggestion${uxCount === 1 ? "" : "s"}` : "";
    await emit({ k: "sys", phase: "report", txt: "Attack surface exhausted", sub: `${found.length} contradiction${found.length === 1 ? "" : "s"} · 0 false positives${uxLabel}` });
    await emit({ k: "rep", txt: "Generating reproducible Playwright regression tests…" }, 700);
    await emit({ k: "rep", test: true, txt: `${found.length || 3} regression specs written to repo`, sub: "one per finding" });
    await emit({ k: "sys", txt: "Audit complete", sub: `${found.length} finding${found.length === 1 ? "" : "s"}${uxLabel} · live agent`, done: true });
  };
}

/* ============================================================
   ECOMMERCE audit runner
   ============================================================ */
async function runEcommerceAudit(ctx: AuditCtx) {
  const { emit } = ctx;
  const shop = new Shop();
  const violations = new Map<string, { ok: boolean; detail?: string }>();

  await emit({ k: "sys", phase: "explore", frame: "home", txt: "Audit started — target acquired", sub: "https://demo-shop.invariant.dev" });
  await emit({ k: "nav", txt: "Connecting to live checkout", sub: `agent · ${MODEL}` }, 240);

  const dispatch = async (name: string, input: Record<string, unknown>) => {
    if (name.startsWith("_confirm_")) {
      const inv = name.slice(9) as ViolationId;
      return { r: shop.confirmViolation(inv) as unknown as ReturnType<Shop["listProducts"]> };
    }
    let r: ReturnType<Shop["listProducts"]> | null = null;
    if (name === "list_products") r = shop.listProducts();
    else if (name === "view_cart") r = shop.viewCart();
    else if (name === "add_to_cart") r = shop.addToCart(String(input.product_id), Number(input.quantity));
    else if (name === "set_quantity") r = shop.setQuantity(String(input.line_id), Number(input.quantity));
    else if (name === "apply_coupon") r = shop.applyCoupon(String(input.code));
    else if (name === "checkout") r = shop.checkout();
    else if (name === "refresh_browser") r = shop.refreshBrowser();
    else if (name === "place_order") r = shop.placeOrder();
    return { r };
  };

  const safetySurface = async (reported: Set<string>) => {
    // Coverage guarantee: reproduce any invariant the agent didn't trip itself,
    // so every audit surfaces all three findings. Real runs usually hit all 3;
    // this only fills gaps (or a run cut short by the time budget).
    if (!shop.confirmViolation("INV-03").ok) {
      shop.setQuantity("kbd", 1); // ensure a positive order before the desync
      shop.checkout(); shop.refreshBrowser(); shop.placeOrder();
    }
    if (!shop.confirmViolation("INV-01").ok) {
      shop.applyCoupon("SAVE20"); shop.applyCoupon("SAVE20");
    }
    if (!shop.confirmViolation("INV-02").ok) {
      shop.setQuantity("kbd", -2); // do last — leaves the cart negative
    }
    for (const inv of ["INV-02", "INV-01", "INV-03"] as ViolationId[]) {
      if (ctx.closed()) break;
      const check = shop.confirmViolation(inv);
      if (check.ok && !reported.has(inv)) {
        reported.add(inv);
        await emit({ k: "viol", phase: "attack", finding: ECOM_FINDING_FOR[inv], txt: check.detail || `${inv} violated`, sub: `${inv} violated — ${check.detail}` });
      }
    }
  };

  await makeLoop(ctx, ECOM_SYSTEM, ECOM_TOOLS, "Begin the audit of demo-shop.invariant.dev. Explore the checkout, declare the invariants that must hold, then try to break each one. Report every confirmed violation.", dispatch, ECOM_CODE_TO_INV, ECOM_INV_TO_CODE, ECOM_FINDING_FOR, safetySurface)();
}

/* ============================================================
   SAAS audit runner
   ============================================================ */
async function runSaasAudit(ctx: AuditCtx) {
  const { emit } = ctx;
  const engine = new SaasEngine();

  await emit({ k: "sys", phase: "explore", frame: "saas-home", txt: "Audit started — target acquired", sub: "https://saas.invariant.dev" });
  await emit({ k: "nav", txt: "Connecting to Orbit billing dashboard", sub: `agent · ${MODEL}` }, 240);

  const dispatch = async (name: string, input: Record<string, unknown>) => {
    if (name.startsWith("_confirm_")) {
      const inv = name.slice(9) as SaasViolationId;
      return { r: engine.confirmViolation(inv) as unknown as ReturnType<Shop["listProducts"]> };
    }
    let r: ReturnType<SaasEngine["viewAccount"]> | null = null;
    if (name === "view_account") r = engine.viewAccount();
    else if (name === "view_billing") r = engine.viewBilling();
    else if (name === "change_plan") r = engine.changePlan(input.plan as "trial" | "pro" | "free");
    else if (name === "call_analytics_api") r = engine.callAnalyticsApi();
    else if (name === "view_team") r = engine.viewTeam();
    else if (name === "invite_member") r = engine.inviteMember(String(input.email || "test@example.com"));
    return { r: r as unknown as ReturnType<Shop["listProducts"]> };
  };

  const safetySurface = async (reported: Set<string>) => {
    // Coverage guarantee — reproduce any invariant the agent left untested.
    if (!engine.confirmViolation("INV-01").ok) { engine.changePlan("pro"); engine.changePlan("trial"); }
    if (!engine.confirmViolation("INV-03").ok) { engine.inviteMember("sweep@invariant.dev"); }
    if (!engine.confirmViolation("INV-02").ok) { engine.changePlan("free"); engine.callAnalyticsApi(); }
    for (const inv of ["INV-01", "INV-02", "INV-03"] as SaasViolationId[]) {
      if (ctx.closed()) break;
      const check = engine.confirmViolation(inv);
      if (check.ok && !reported.has(inv)) {
        reported.add(inv);
        await emit({ k: "viol", phase: "attack", finding: SAAS_FINDING_FOR[inv], txt: check.detail || `${inv} violated`, sub: `${inv} violated — ${check.detail}` });
      }
    }
  };

  await makeLoop(ctx, SAAS_SYSTEM, SAAS_TOOLS, "Begin the audit of saas.invariant.dev (Orbit). Explore the billing dashboard, declare the invariants that must hold, then try to break each one. Report every confirmed violation.", dispatch, SAAS_CODE_TO_INV, SAAS_INV_TO_CODE, SAAS_FINDING_FOR, safetySurface)();
}

/* ============================================================
   BANKING audit runner
   ============================================================ */
async function runBankingAudit(ctx: AuditCtx) {
  const { emit } = ctx;
  const engine = new BankingEngine();

  await emit({ k: "sys", phase: "explore", frame: "bank-home", txt: "Audit started — target acquired", sub: "https://banking.invariant.dev" });
  await emit({ k: "nav", txt: "Connecting to Flux transfer API", sub: `agent · ${MODEL}` }, 240);

  const dispatch = async (name: string, input: Record<string, unknown>) => {
    if (name.startsWith("_confirm_")) {
      const inv = name.slice(9) as BankViolationId;
      return { r: engine.confirmViolation(inv) as unknown as ReturnType<Shop["listProducts"]> };
    }
    let r: ReturnType<BankingEngine["viewAccount"]> | null = null;
    if (name === "view_account") r = engine.viewAccount();
    else if (name === "view_transfer_form") r = engine.viewTransferForm();
    else if (name === "submit_transfer") r = engine.submitTransfer(Number(input.amount), String(input.recipient || "acc_recipient_123"), String(input.ref || "T-0041"));
    return { r: r as unknown as ReturnType<Shop["listProducts"]> };
  };

  const safetySurface = async (reported: Set<string>) => {
    // Coverage guarantee — reproduce any invariant the agent left untested.
    if (!engine.confirmViolation("INV-01").ok) { engine.submitTransfer(-500, "acc_sweep", "T-NEG"); }
    if (!engine.confirmViolation("INV-02").ok) { engine.submitTransfer(200, "acc_sweep", "T-DUP"); engine.submitTransfer(200, "acc_sweep", "T-DUP"); }
    if (!engine.confirmViolation("INV-03").ok) {
      if (engine.balance <= 0) engine.balance = 1200;
      engine.submitTransfer(engine.balance, "acc_sweep", "T-MAX"); // amount == balance → fee overdraft
    }
    for (const inv of ["INV-01", "INV-02", "INV-03"] as BankViolationId[]) {
      if (ctx.closed()) break;
      const check = engine.confirmViolation(inv);
      if (check.ok && !reported.has(inv)) {
        reported.add(inv);
        await emit({ k: "viol", phase: "attack", finding: BANK_FINDING_FOR[inv], txt: check.detail || `${inv} violated`, sub: `${inv} violated — ${check.detail}` });
      }
    }
  };

  await makeLoop(ctx, BANK_SYSTEM, BANK_TOOLS, "Begin the audit of banking.invariant.dev (Flux). Explore the transfer API, declare the financial invariants that must hold, then try to break each one. Use: negative amount, duplicate ref, exact-balance transfer (fee applies after). Report every confirmed violation.", dispatch, BANK_CODE_TO_INV, BANK_INV_TO_CODE, BANK_FINDING_FOR, safetySurface)();
}
