/**
 * Utilitaires de saisie, parsing et formatage décimal (virgule FR et point EN)
 * pour préserver jusqu'à 2 décimales exactes sur le poids et les mensurations.
 */

export function roundToDecimals(val: number, maxDecimals = 2): number {
  if (!Number.isFinite(val)) return val;
  const factor = 10 ** Math.max(0, Math.min(6, Math.round(maxDecimals)));
  const sign = val < 0 ? -1 : 1;
  const rounded = sign * (Math.round((Math.abs(val) + Number.EPSILON) * factor) / factor);
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * Nettoie une saisie utilisateur en cours tout en autorisant `.` ou `,` en fin de chaîne
 * (ex: `"82,"` ou `"78.,5"` -> `"78,5"`, `"78..5"` -> `"78.5"`, `"78.4,5"` -> `"78.45"`).
 */
export function sanitizeDecimalDraft(raw: string): string {
  const stripped = raw.replace(/[^\d.,]/g, "");
  const collapsed = stripped.replace(/[.,]+/g, (match) =>
    match.includes(",") ? "," : "."
  );
  const sepIdx = collapsed.search(/[.,]/);
  if (sepIdx === -1) return collapsed;
  return (
    collapsed.slice(0, sepIdx + 1) +
    collapsed.slice(sepIdx + 1).replace(/[.,]/g, "")
  );
}

/**
 * Parse une valeur décimale (`.` ou `,`) en nombre borné à `maxDecimals` décimales.
 */
export function parseDecimalInput(
  raw: string | number | null | undefined,
  maxDecimals = 2
): number | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? roundToDecimals(raw, maxDecimals) : undefined;
  }
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const normalized = sanitizeDecimalDraft(trimmed).replace(",", ".");
  if (!normalized || normalized === ".") return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return roundToDecimals(parsed, maxDecimals);
}

/**
 * Formate un nombre avec virgule française en conservant les décimales significatives
 * sans zéros inutiles (`82` -> `"82"`, `82.4` -> `"82,4"`, `82.45` -> `"82,45"`).
 */
export function formatDecimalFr(val: number, maxDecimals = 2): string {
  if (!Number.isFinite(val)) return "0";
  const rounded = roundToDecimals(val, maxDecimals);
  return String(rounded).replace(".", ",");
}
