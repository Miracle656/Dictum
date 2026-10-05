import { keccak256, toHex } from "viem";
import type { Quote } from "@dictum/shared";

/**
 * Canonical hash of every quote considered for a payment. Written into the
 * dictum so anyone can later check the agent didn't hide a better quote.
 * Fields are in a fixed order, quotes sorted by venueId, bigints as decimal strings.
 */
export function canonicalQuoteSet(quotes: readonly Quote[]): string {
  const rows = [...quotes]
    .sort((a, b) => (a.venueId < b.venueId ? -1 : a.venueId > b.venueId ? 1 : a.quotedAt - b.quotedAt))
    .map((q) => [
      q.venueId,
      q.venueKind,
      q.sell,
      q.buy,
      q.amountIn.toString(),
      q.amountOut.toString(),
      q.feeOut.toString(),
      q.gasCostOut.toString(),
      q.bridgeCostOut.toString(),
      q.settlementSeconds,
      q.maxAmountIn.toString(),
      q.quotedAt,
      q.expiresAt,
    ]);
  return JSON.stringify(rows);
}

export function quoteSetHash(quotes: readonly Quote[]): `0x${string}` {
  return keccak256(toHex(canonicalQuoteSet(quotes)));
}
