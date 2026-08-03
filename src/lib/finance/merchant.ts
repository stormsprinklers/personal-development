/** Normalize merchant / payee strings for matching rules across txns. */
export function normalizeMerchantKey(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/[#*]+/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 &'-]/g, "")
    .trim()
    .slice(0, 120);
}

export function displayMerchantName(
  merchantName: string | null | undefined,
  transactionName: string,
): string {
  const m = merchantName?.trim();
  if (m) return m;
  return transactionName.trim() || "Unknown";
}
