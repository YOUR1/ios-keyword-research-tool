/**
 * Formatting utilities for display values.
 */

// Threshold above which we consider a limit "unlimited"
export const UNLIMITED_THRESHOLD = 100000;

/**
 * Check if a limit value represents "unlimited".
 */
export function isUnlimited(limit: number): boolean {
  return limit >= UNLIMITED_THRESHOLD;
}

/**
 * Format a limit value, showing ∞ for unlimited plans.
 */
export function formatLimit(limit: number): string {
  return isUnlimited(limit) ? "∞" : limit.toLocaleString();
}

/**
 * Format a "remaining" value for display.
 * Returns "∞ remaining" for unlimited, or "X remaining" otherwise.
 */
export function formatRemaining(used: number, limit: number): string {
  if (isUnlimited(limit)) {
    return "∞ remaining";
  }
  const remaining = Math.max(0, limit - used);
  return `${remaining.toLocaleString()} remaining`;
}
