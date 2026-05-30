/* ============================================================
   INVARIANT — Banking (Flux) engine under test
   Seeded invariant violations:
     INV-01  transfer amount must be positive (accepts negative)
     INV-02  duplicate reference must be rejected (stacks)
     INV-03  balance must never go below $0 after transfer+fee (fee bypasses guard)
   ============================================================ */

import type { FrameId } from "@/lib/data";

export type BankViolationId = "INV-01" | "INV-02" | "INV-03";

export type ToolResult = {
  observation: Record<string, unknown>;
  frame: FrameId;
  kind: "see" | "chk" | "atk" | "nav";
  summary: string;
  violation?: BankViolationId;
};

const money = (n: number) => (n < 0 ? "-$" : "$") + Math.abs(n).toFixed(2);
const round2 = (n: number) => Math.round(n * 100) / 100;

const TX_FEE = 4.99;

export class BankingEngine {
  balance = 1200.00;
  transactions: { id: string; amount: number; recipient: string; ref: string }[] = [];
  seenRefs = new Map<string, number>(); // ref → count
  violations = new Map<BankViolationId, string>();

  viewAccount(): ToolResult {
    return {
      observation: {
        balance: this.balance,
        currency: "USD",
        recent_transactions: this.transactions.slice(-5).map(t => ({
          id: t.id, amount: t.amount, recipient: t.recipient, ref: t.ref,
        })),
      },
      frame: "bank-home",
      kind: "see",
      summary: `Balance: ${money(this.balance)} · ${this.transactions.length} transactions`,
    };
  }

  viewTransferForm(): ToolResult {
    return {
      observation: {
        form_fields: ["amount", "recipient", "reference"],
        balance: this.balance,
        fee: TX_FEE,
        note: `Fee of ${money(TX_FEE)} applied post-submission`,
      },
      frame: "bank-transfer",
      kind: "nav",
      summary: `Transfer form: balance ${money(this.balance)}, fee ${money(TX_FEE)}`,
    };
  }

  submitTransfer(amount: number, recipient: string, ref: string): ToolResult {
    const txId = `T-${String(this.transactions.length + 41).padStart(4, "0")}`;

    // BUG (INV-01): no validation on amount sign — negative accepted
    const isNegative = amount < 0;
    if (isNegative) {
      this.violations.set("INV-01", `transfer of ${money(amount)} processed — negative amount reversed money flow (recipient received a debit instead of credit)`);
    }

    // BUG (INV-02): no idempotency — same ref accepted multiple times
    const prevCount = this.seenRefs.get(ref) || 0;
    const isDuplicate = prevCount > 0;
    if (isDuplicate) {
      this.violations.set("INV-02", `reference "${ref}" submitted ${prevCount + 1} times — each created a new transaction and debited the account again`);
    }
    this.seenRefs.set(ref, prevCount + 1);

    // BUG (INV-03): balance check happens BEFORE fee is deducted
    const balanceBeforeFee = round2(this.balance - amount);
    // Fee applied after: if balance was exactly amount, it goes negative
    const newBalance = round2(balanceBeforeFee - TX_FEE);
    const overdraft = !isNegative && newBalance < 0 && balanceBeforeFee >= 0;
    if (overdraft) {
      this.violations.set("INV-03", `balance went to ${money(newBalance)} after fee ${money(TX_FEE)} was applied post-transfer — overdraft guard checked before fee`);
    }

    this.balance = newBalance;
    this.transactions.push({ id: txId, amount, recipient, ref });

    const viol = isNegative ? "INV-01" : isDuplicate ? "INV-02" : overdraft ? "INV-03" : undefined;
    const frame: FrameId = isNegative ? "bank-negTransfer"
      : isDuplicate ? "bank-transfer2"
      : overdraft ? "bank-overdraft"
      : this.transactions.length === 1 ? "bank-transfer1"
      : "bank-transfer2";

    return {
      observation: {
        transaction_id: txId,
        amount,
        recipient,
        ref,
        fee: TX_FEE,
        new_balance: this.balance,
        duplicate_ref: isDuplicate,
        times_seen: prevCount + 1,
        overdraft,
      },
      frame,
      kind: "atk",
      summary: viol === "INV-01"
        ? `Transfer ${money(amount)} processed — negative amount, recipient balance DECREASED`
        : viol === "INV-02"
        ? `Duplicate ref "${ref}" accepted — ${txId} created, ${money(amount)} debited again`
        : viol === "INV-03"
        ? `Transfer ok, then fee ${money(TX_FEE)} pushed balance to ${money(this.balance)}`
        : `Transfer ${money(amount)} → ${recipient} · new balance ${money(this.balance)}`,
      violation: viol,
    };
  }

  confirmViolation(inv: BankViolationId): { ok: boolean; detail?: string } {
    const detail = this.violations.get(inv);
    return detail ? { ok: true, detail } : { ok: false };
  }
}
