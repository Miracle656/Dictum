import type {
  Quote,
  Rejection,
  RouteRequest,
  ScoredQuote,
  ScoreResult,
} from "@dictum/shared";

export interface ScorerConfig {
  /** Now, unix ms. Injected so scoring is pure and testable. */
  now: number;
  /** Reject quotes older than this even if the venue says they haven't expired. */
  maxQuoteAgeMs: number;
  /** Cost of waiting, in basis points of gross output per hour of settlement time. */
  timePenaltyBpsPerHour: bigint;
  /** Hard cap on settlement time. Omit for no cap. */
  maxSettlementSeconds?: number;
}

const BPS = 10_000n;
const SECONDS_PER_HOUR = 3_600n;
const E18 = 10n ** 18n;

/** Ceiling division for non-negative bigints. Penalties round against the venue. */
function divCeil(a: bigint, b: bigint): bigint {
  return a === 0n ? 0n : (a - 1n) / b + 1n;
}

export function timePenalty(amountOut: bigint, settlementSeconds: number, bpsPerHour: bigint): bigint {
  if (amountOut <= 0n || settlementSeconds <= 0 || bpsPerHour <= 0n) return 0n;
  return divCeil(amountOut * bpsPerHour * BigInt(settlementSeconds), BPS * SECONDS_PER_HOUR);
}

/** Net buy units per one whole sell unit, scaled by 1e18. Rounds down. */
export function netRateE18(netOut: bigint, amountIn: bigint, sellDecimals: number, buyDecimals: number): bigint {
  if (amountIn <= 0n) return 0n;
  const num = netOut * E18 * 10n ** BigInt(sellDecimals);
  const den = amountIn * 10n ** BigInt(buyDecimals);
  return num / den;
}

function check(q: Quote, req: RouteRequest, cfg: ScorerConfig): Rejection | undefined {
  const r = (reason: Rejection["reason"], detail?: string): Rejection => ({ venueId: q.venueId, reason, detail, quote: q });
  if (q.sell !== req.sell.symbol || q.buy !== req.buy.symbol) return r("pair-mismatch", `${q.sell}->${q.buy}`);
  if (q.amountIn !== req.amountIn) return r("amount-mismatch", `${q.amountIn} != ${req.amountIn}`);
  if (cfg.now >= q.expiresAt) return r("expired", `expired ${cfg.now - q.expiresAt}ms ago`);
  if (cfg.now - q.quotedAt > cfg.maxQuoteAgeMs) return r("too-old", `${cfg.now - q.quotedAt}ms old`);
  if (q.maxAmountIn < req.amountIn) return r("insufficient-depth", `depth ${q.maxAmountIn} < ${req.amountIn}`);
  if (cfg.maxSettlementSeconds !== undefined && q.settlementSeconds > cfg.maxSettlementSeconds)
    return r("too-slow", `${q.settlementSeconds}s > ${cfg.maxSettlementSeconds}s`);
  return undefined;
}

/**
 * Deterministic ranking on all-in cost. Highest net output wins; ties break on
 * faster settlement, then venueId, so the same inputs always pick the same route.
 */
export function scoreQuotes(req: RouteRequest, quotes: readonly Quote[], cfg: ScorerConfig): ScoreResult {
  const ranked: ScoredQuote[] = [];
  const rejected: Rejection[] = [];

  for (const q of quotes) {
    const bad = check(q, req, cfg);
    if (bad) {
      rejected.push(bad);
      continue;
    }
    const penalty = timePenalty(q.amountOut, q.settlementSeconds, cfg.timePenaltyBpsPerHour);
    const netOut = q.amountOut - q.feeOut - q.gasCostOut - q.bridgeCostOut - penalty;
    if (netOut <= 0n) {
      rejected.push({ venueId: q.venueId, reason: "non-positive-net", detail: `net ${netOut}`, quote: q });
      continue;
    }
    ranked.push({
      quote: q,
      timePenaltyOut: penalty,
      netOut,
      netRateE18: netRateE18(netOut, q.amountIn, req.sell.decimals, req.buy.decimals),
    });
  }

  ranked.sort((a, b) => {
    if (a.netOut !== b.netOut) return a.netOut > b.netOut ? -1 : 1;
    if (a.quote.settlementSeconds !== b.quote.settlementSeconds)
      return a.quote.settlementSeconds - b.quote.settlementSeconds;
    return a.quote.venueId < b.quote.venueId ? -1 : a.quote.venueId > b.quote.venueId ? 1 : 0;
  });

  return { ranked, rejected, best: ranked[0] };
}
