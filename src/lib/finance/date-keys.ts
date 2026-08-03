/** Client-safe date helpers for Finance UI (YYYY-MM keys). */

export function monthKeyFromDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function money(amount: number, currency = "USD") {
  return amount.toLocaleString(undefined, { style: "currency", currency });
}
