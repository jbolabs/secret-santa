/** The gift budget: free text such as "$30" or "under 50 €", shown as typed. */
export const MAX_BUDGET_LENGTH = 40;

/**
 * Trims a budget from any untrusted source (setup link, agent, send request).
 * Blank becomes undefined, so callers can treat "no budget" as one case.
 */
export function readBudget(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length > MAX_BUDGET_LENGTH) {
    throw new Error(
      `Budget must be text of at most ${MAX_BUDGET_LENGTH} characters.`
    );
  }
  return value.trim() || undefined;
}
