/**
 * Ownership projection for the purchase dialog.
 *
 * A purchase activates exactly one ownership record; the dialog must describe
 * the state AFTER the verified purchase, never the pre-purchase count. The
 * verified count comes from the backend (`state.tools`), the quantity is the
 * units this checkout buys, and the limit is the tier's real `maxPerUser`
 * (5 / 3 / 3 / 2 — not a shared constant).
 *
 * Pending attempts are deliberately excluded: ownership is only real after
 * on-chain verification, so this projection is a statement about the purchase
 * being reviewed, not a reservation.
 */
export const projectOwnershipAfterPurchase = (
  currentOwned: number,
  quantity: number,
  limit: number,
): number => {
  const owned = Number.isFinite(currentOwned) ? Math.max(0, Math.floor(currentOwned)) : 0;
  const buying = Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
  const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  return Math.min(owned + buying, max);
};

/** Whether another unit may be bought at all. */
export const canBuyAnotherUnit = (currentOwned: number, limit: number, quantity = 1): boolean =>
  projectOwnershipAfterPurchase(currentOwned, quantity, limit) > currentOwned
  && currentOwned < limit;
