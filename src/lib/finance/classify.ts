import type { FinanceFlowType } from "@prisma/client";

export type ClassifyInput = {
  amount: number;
  accountType: string;
  accountSubtype: string | null;
  pending: boolean;
  transferId: string | null;
  paymentChannel: string | null;
  plaidPfcPrimary: string | null;
  plaidPfcDetailed: string | null;
  name: string;
  merchantName: string | null;
  /** From an existing merchant rule, if any. */
  ruleFlowType?: FinanceFlowType | null;
  ruleCategoryName?: string | null;
};

export type ClassifyResult = {
  flowType: FinanceFlowType;
  suggestedCategoryName: string;
};

const TRANSFER_PFC = new Set([
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "LOAN_PAYMENTS",
]);

const INCOME_PFC = new Set(["INCOME"]);

const CC_PAYMENT_HINTS = [/payment.*thank you/i, /credit card payment/i, /autopay/i, /\bcc payment\b/i];

/**
 * Classify a transaction for cash-flow bookkeeping.
 * Order: merchant rule → transfer/cc heuristics → Plaid PFC → amount/account default.
 */
export function classifyTransaction(input: ClassifyInput): ClassifyResult {
  if (input.ruleFlowType && input.ruleCategoryName) {
    return { flowType: input.ruleFlowType, suggestedCategoryName: input.ruleCategoryName };
  }
  if (input.ruleCategoryName) {
    const flow =
      input.ruleCategoryName === "Income"
        ? "income"
        : input.ruleCategoryName === "Transfer"
          ? "transfer"
          : input.ruleCategoryName === "Credit Card Payment"
            ? "cc_payment"
            : "expense";
    return { flowType: flow, suggestedCategoryName: input.ruleCategoryName };
  }

  const nameBlob = `${input.merchantName ?? ""} ${input.name}`;
  const isDepository = input.accountType === "depository";
  const isCredit = input.accountType === "credit";

  if (input.transferId) {
    return { flowType: "transfer", suggestedCategoryName: "Transfer" };
  }

  if (CC_PAYMENT_HINTS.some((re) => re.test(nameBlob))) {
    if (isDepository || isCredit) {
      return { flowType: "cc_payment", suggestedCategoryName: "Credit Card Payment" };
    }
  }

  const pfc = (input.plaidPfcPrimary ?? "").toUpperCase();
  const detailed = (input.plaidPfcDetailed ?? "").toUpperCase();

  if (
    detailed.includes("CREDIT_CARD_PAYMENT") ||
    detailed.includes("LOAN_PAYMENTS_CREDIT_CARD")
  ) {
    return { flowType: "cc_payment", suggestedCategoryName: "Credit Card Payment" };
  }

  if (TRANSFER_PFC.has(pfc) || detailed.startsWith("TRANSFER_")) {
    return { flowType: "transfer", suggestedCategoryName: "Transfer" };
  }

  if (INCOME_PFC.has(pfc) || detailed.startsWith("INCOME_")) {
    return { flowType: "income", suggestedCategoryName: "Income" };
  }

  // Plaid: positive amount = money leaving the account (for depository/credit).
  if (input.amount < 0) {
    return { flowType: "income", suggestedCategoryName: "Income" };
  }

  const categoryFromPfc = mapPfcToCategory(pfc, detailed);
  return { flowType: "expense", suggestedCategoryName: categoryFromPfc };
}

function mapPfcToCategory(primary: string, detailed: string): string {
  if (detailed.includes("GROCERIES") || detailed.includes("SUPERMARKETS")) return "Groceries";
  if (
    detailed.includes("RESTAURANT") ||
    detailed.includes("FOOD_AND_DRINK") ||
    primary === "FOOD_AND_DRINK"
  ) {
    return "Dining";
  }
  if (primary === "TRANSPORTATION" || detailed.includes("GAS") || detailed.includes("TAXI")) {
    return "Transport";
  }
  if (primary === "RENT_AND_UTILITIES" || detailed.includes("RENT")) return "Housing";
  if (detailed.includes("UTILITIES") || detailed.includes("INTERNET") || detailed.includes("TELECOM")) {
    return "Utilities";
  }
  if (detailed.includes("SUBSCRIPTION") || primary === "GENERAL_SERVICES") return "Subscriptions";
  if (primary === "GENERAL_MERCHANDISE" || detailed.includes("SHOPPING")) return "Shopping";
  if (primary === "ENTERTAINMENT") return "Entertainment";
  if (primary === "MEDICAL" || detailed.includes("HEALTH")) return "Health";
  if (primary === "TRAVEL" || detailed.includes("AIRLINES") || detailed.includes("LODGING")) {
    return "Travel";
  }
  if (detailed.includes("PERSONAL_CARE")) return "Personal Care";
  if (detailed.includes("BANK_FEES") || primary === "BANK_FEES") return "Fees";
  return "Uncategorized";
}

/** Absolute dollars for charts: expenses are positive outflows. */
export function expenseAmount(amount: number): number {
  return Math.abs(amount);
}

export function incomeAmount(amount: number): number {
  return Math.abs(amount);
}
