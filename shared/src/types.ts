/**
 * Core domain types. Every amount is a bigint in the asset's smallest unit
 * (kobo for NGN, 1e-6 for USDC/USDG). Floats never touch money.
 */

export interface Asset {
  symbol: string;
  decimals: number;
}

/** What the business wants done: sell `amountIn` of `sell`, receive as much `buy` as possible. */
export interface RouteRequest {
  paymentId: string;
  sell: Asset;
  buy: Asset;
  amountIn: bigint;
}

export type VenueKind = "onchain-dex" | "offramp";

/**
 * A venue's answer to a RouteRequest. All cost fields are denominated in the
 * buy asset's smallest unit so the scorer can subtract them directly.
 */
export interface Quote {
  venueId: string;
  venueKind: VenueKind;
  sell: string;
  buy: string;
  amountIn: bigint;
  /** Gross output before the costs below. */
  amountOut: bigint;
  /** Venue fees not already netted into amountOut. */
  feeOut: bigint;
  /** Network gas, converted into the buy asset. */
  gasCostOut: bigint;
  /** Cross-chain transfer cost, converted into the buy asset. Zero for single-chain routes. */
  bridgeCostOut: bigint;
  /** Expected time from execution to funds landing. */
  settlementSeconds: number;
  /** Largest amountIn the venue will fill at this quote. */
  maxAmountIn: bigint;
  /** Unix ms. */
  quotedAt: number;
  /** Unix ms. A quote is unusable at or after this instant. */
  expiresAt: number;
  /** Venue-specific detail kept for audit and the LLM explainer. Never read by the scorer. */
  meta?: Record<string, string | number | boolean>;
}

export interface VenueAdapter {
  readonly id: string;
  readonly kind: VenueKind;
  supports(sell: Asset, buy: Asset): boolean;
  quote(req: RouteRequest): Promise<Quote>;
}

export type RejectReason =
  | "pair-mismatch"
  | "amount-mismatch"
  | "expired"
  | "too-old"
  | "insufficient-depth"
  | "too-slow"
  | "non-positive-net"
  | "venue-error";

export interface Rejection {
  venueId: string;
  reason: RejectReason;
  detail?: string;
  quote?: Quote;
}

export interface ScoredQuote {
  quote: Quote;
  timePenaltyOut: bigint;
  /** amountOut − fee − gas − bridge − timePenalty. The ranking key. */
  netOut: bigint;
  /** Net buy units per whole sell unit, 1e18 fixed point. For display and the dictum's promised rate. */
  netRateE18: bigint;
}

export interface ScoreResult {
  /** Best first. */
  ranked: ScoredQuote[];
  rejected: Rejection[];
  best: ScoredQuote | undefined;
}
