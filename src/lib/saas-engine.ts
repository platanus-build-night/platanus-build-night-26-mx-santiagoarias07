/* ============================================================
   INVARIANT — SaaS (Orbit) engine under test
   Seeded invariant violations:
     INV-01  trial_ends_at must not reset on plan change (resets)
     INV-02  downgrade to Free revokes premium API access (doesn't)
     INV-03  team seats cannot exceed plan limit (no cap at invite)
   ============================================================ */

import type { FrameId } from "@/lib/data";

export type SaasViolationId = "INV-01" | "INV-02" | "INV-03";

export type ToolResult = {
  observation: Record<string, unknown>;
  frame: FrameId;
  kind: "see" | "chk" | "atk" | "nav";
  summary: string;
  violation?: SaasViolationId;
};

const DAY_MS = 86_400_000;
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

export class SaasEngine {
  signupDate = new Date(Date.now() - 2 * DAY_MS);           // signed up 2 days ago
  trialEndsAt = new Date(Date.now() + 12 * DAY_MS);         // 12 days left on trial
  plan: "trial" | "pro" | "free" = "trial";
  apiKeyValid = true;                                         // key exists since signup
  teamMembers = ["Ada L.", "Bo W.", "Cal R.", "Dee M.", "Eve S."]; // 5 members = full
  planSeatLimit = 5;
  violations = new Map<SaasViolationId, string>();

  /* ---------- tools ---------- */

  viewAccount(): ToolResult {
    return {
      observation: {
        plan: this.plan,
        trial_ends_at: fmtDate(this.trialEndsAt),
        days_remaining: Math.max(0, Math.round((this.trialEndsAt.getTime() - Date.now()) / DAY_MS)),
        team_members: this.teamMembers.length,
        seat_limit: this.planSeatLimit,
        api_key_active: this.apiKeyValid,
      },
      frame: "saas-home",
      kind: "see",
      summary: `Plan: ${this.plan} · trial ends ${fmtDate(this.trialEndsAt)} · ${this.teamMembers.length}/${this.planSeatLimit} seats`,
    };
  }

  viewBilling(): ToolResult {
    return {
      observation: {
        current_plan: this.plan,
        trial_ends_at: fmtDate(this.trialEndsAt),
        available_plans: ["trial", "pro", "business"],
        renewal_amount: this.plan === "pro" ? 49 : 0,
      },
      frame: "saas-billing",
      kind: "nav",
      summary: `Billing: plan=${this.plan}, trial ends ${fmtDate(this.trialEndsAt)}`,
    };
  }

  changePlan(newPlan: "trial" | "pro" | "free"): ToolResult {
    const prevPlan = this.plan;
    this.plan = newPlan;

    // BUG (INV-01): changing plan resets trial_ends_at to now+14d regardless of history
    if (newPlan === "trial") {
      this.trialEndsAt = new Date(Date.now() + 14 * DAY_MS);
    }
    // BUG (INV-02): downgrade to Free does NOT revoke the API key
    // (nothing here revokes apiKeyValid — intentional bug)

    const viol = newPlan === "trial" && prevPlan !== "trial" ? "INV-01" as const : undefined;
    if (viol) {
      this.violations.set("INV-01", `trial_ends_at reset to ${fmtDate(this.trialEndsAt)} after plan change from ${prevPlan} → trial (was ${fmtDate(new Date(this.signupDate.getTime() + 14 * DAY_MS))})`);
    }

    return {
      observation: {
        plan: this.plan,
        trial_ends_at: fmtDate(this.trialEndsAt),
        previous_plan: prevPlan,
        note: viol ? "trial_ends_at reset — counter should not have moved" : undefined,
      },
      frame: newPlan === "trial" ? "saas-trialReset" : newPlan === "free" ? "saas-downgrade" : "saas-planChange",
      kind: "atk",
      summary: viol
        ? `Plan changed ${prevPlan}→${newPlan}: trial_ends_at RESET to ${fmtDate(this.trialEndsAt)}`
        : `Plan changed to ${newPlan}`,
      violation: viol,
    };
  }

  callAnalyticsApi(): ToolResult {
    // BUG (INV-02): API key still works on Free — no revocation on downgrade
    const shouldBeBlocked = this.plan === "free";
    if (shouldBeBlocked && this.apiKeyValid) {
      this.violations.set("INV-02", `GET /api/v1/analytics returned 200 on plan=${this.plan} — key should have been revoked on downgrade`);
    }
    return {
      observation: {
        http_status: this.apiKeyValid ? 200 : 403,
        plan: this.plan,
        data: this.apiKeyValid ? { mrr: 4280, users: 127, churn: 0.023 } : null,
        expected_on_free: 403,
      },
      frame: "saas-apiAccess",
      kind: "atk",
      summary: this.apiKeyValid && shouldBeBlocked
        ? `GET /api/v1/analytics → 200 on Free plan (expected 403)`
        : `GET /api/v1/analytics → ${this.apiKeyValid ? 200 : 403}`,
      violation: shouldBeBlocked && this.apiKeyValid ? "INV-02" : undefined,
    };
  }

  inviteMember(email: string): ToolResult {
    // BUG (INV-03): no seat cap check at invite time
    const over = this.teamMembers.length >= this.planSeatLimit;
    this.teamMembers.push(email); // always accepts
    if (over) {
      this.violations.set("INV-03", `team has ${this.teamMembers.length} members on a ${this.planSeatLimit}-seat plan — 6th invite accepted without rejection`);
    }
    return {
      observation: {
        accepted: true,
        team_size: this.teamMembers.length,
        seat_limit: this.planSeatLimit,
        over_limit: this.teamMembers.length > this.planSeatLimit,
        expected_error: over ? "422 Seat limit reached" : null,
      },
      frame: "saas-seatOverflow",
      kind: "atk",
      summary: over
        ? `Invite accepted — team now ${this.teamMembers.length}/${this.planSeatLimit} (over limit!)`
        : `Invite accepted — team now ${this.teamMembers.length}/${this.planSeatLimit}`,
      violation: over ? "INV-03" : undefined,
    };
  }

  viewTeam(): ToolResult {
    return {
      observation: {
        members: this.teamMembers,
        count: this.teamMembers.length,
        seat_limit: this.planSeatLimit,
        over_limit: this.teamMembers.length > this.planSeatLimit,
      },
      frame: "saas-seatOverflow",
      kind: "see",
      summary: `Team: ${this.teamMembers.length}/${this.planSeatLimit} seats`,
    };
  }

  confirmViolation(inv: SaasViolationId): { ok: boolean; detail?: string } {
    const detail = this.violations.get(inv);
    return detail ? { ok: true, detail } : { ok: false };
  }
}
