import { describe, expect, it } from "vitest";
import type { Quote, RouteRequest } from "@dictum/shared";
import { netRateE18, scoreQuotes, timePenalty, type ScorerConfig } from "../src/scoring/scorer.js";

const NOW = 1_800_000_000_000;
const req: RouteRequest = {
  paymentId: "pay-1",
  sell: { symbol: "NGN", decimals: 2 },
  buy: { symbol: "USDC", decimals: 6 },
  amountIn: 1_500_000_00n, // NGN 1.5m
};
const cfg: ScorerConfig = { now: NOW, maxQuoteAgeMs: 60_000, timePenaltyBpsPerHour: 0n };

function q(over: Partial<Quote> = {}): Quote {
  return {
    venueId: "v",
    venueKind: "offramp",
    sell: "NGN",
    buy: "USDC",
    amountIn: req.amountIn,
    amountOut: 1_000_000_000n, // 1000 USDC
    feeOut: 0n,
    gasCostOut: 0n,
    bridgeCostOut: 0n,
    settlementSeconds: 60,
    maxAmountIn: req.amountIn * 10n,
    quotedAt: NOW - 1_000,
    expiresAt: NOW + 30_000,
    ...over,
  };
}

describe("scoreQuotes ranking", () => {
  it("ranks on all-in net output, not headline rate", () => {
    const headline = q({ venueId: "headline", amountOut: 1_010_000_000n, feeOut: 15_000_000n }); // net 995
    const cheap = q({ venueId: "cheap", amountOut: 1_000_000_000n, feeOut: 1_000_000n }); // net 999
    const r = scoreQuotes(req, [headline, cheap], cfg);
    expect(r.best?.quote.venueId).toBe("cheap");
    expect(r.ranked.map((s) => s.netOut)).toEqual([999_000_000n, 995_000_000n]);
  });

  it("subtracts fee, gas, bridge and time penalty", () => {
    const quote = q({ feeOut: 1_000_000n, gasCostOut: 20_000n, bridgeCostOut: 500_000n, settlementSeconds: 3_600 });
    const r = scoreQuotes(req, [quote], { ...cfg, timePenaltyBpsPerHour: 10n });
    // penalty = 1000 USDC * 10bps * 1h = 1 USDC
    expect(r.best?.timePenaltyOut).toBe(1_000_000n);
    expect(r.best?.netOut).toBe(1_000_000_000n - 1_000_000n - 20_000n - 500_000n - 1_000_000n);
  });

  it("time penalty can flip the winner toward a faster venue", () => {
    const slow = q({ venueId: "slow", amountOut: 1_002_000_000n, settlementSeconds: 2 * 86_400 });
    const fast = q({ venueId: "fast", amountOut: 1_000_000_000n, settlementSeconds: 600 });
    expect(scoreQuotes(req, [slow, fast], cfg).best?.quote.venueId).toBe("slow");
    expect(scoreQuotes(req, [slow, fast], { ...cfg, timePenaltyBpsPerHour: 1n }).best?.quote.venueId).toBe("fast");
  });

  it("is independent of input order", () => {
    const qs = [q({ venueId: "a", amountOut: 3n * 10n ** 8n }), q({ venueId: "b", amountOut: 5n * 10n ** 8n }), q({ venueId: "c", amountOut: 4n * 10n ** 8n })];
    const ids = (xs: Quote[]) => scoreQuotes(req, xs, cfg).ranked.map((s) => s.quote.venueId);
    expect(ids(qs)).toEqual(["b", "c", "a"]);
    expect(ids([...qs].reverse())).toEqual(["b", "c", "a"]);
  });
});

describe("ties", () => {
  it("equal net breaks to faster settlement", () => {
    const r = scoreQuotes(req, [q({ venueId: "a", settlementSeconds: 900 }), q({ venueId: "b", settlementSeconds: 60 })], cfg);
    expect(r.best?.quote.venueId).toBe("b");
  });

  it("equal net and speed breaks to venueId, regardless of order", () => {
    const a = q({ venueId: "alpha" });
    const b = q({ venueId: "beta" });
    expect(scoreQuotes(req, [b, a], cfg).best?.quote.venueId).toBe("alpha");
    expect(scoreQuotes(req, [a, b], cfg).best?.quote.venueId).toBe("alpha");
  });

  it("different gross that nets to the same value is a tie", () => {
    const a = q({ venueId: "z-gross", amountOut: 1_005_000_000n, feeOut: 5_000_000n });
    const b = q({ venueId: "a-net", amountOut: 1_000_000_000n });
    const r = scoreQuotes(req, [a, b], cfg);
    expect(r.ranked[0]!.netOut).toBe(r.ranked[1]!.netOut);
    expect(r.best?.quote.venueId).toBe("a-net");
  });
});

describe("stale quotes", () => {
  it("rejects a quote at exactly its expiry instant", () => {
    const r = scoreQuotes(req, [q({ expiresAt: NOW })], cfg);
    expect(r.best).toBeUndefined();
    expect(r.rejected[0]?.reason).toBe("expired");
  });

  it("accepts a quote 1ms before expiry", () => {
    expect(scoreQuotes(req, [q({ expiresAt: NOW + 1 })], cfg).best).toBeDefined();
  });

  it("rejects quotes older than maxQuoteAgeMs even if the venue says still valid", () => {
    const r = scoreQuotes(req, [q({ quotedAt: NOW - 60_001, expiresAt: NOW + 3_600_000 })], cfg);
    expect(r.rejected[0]?.reason).toBe("too-old");
  });

  it("accepts a quote exactly maxQuoteAgeMs old", () => {
    expect(scoreQuotes(req, [q({ quotedAt: NOW - 60_000 })], cfg).best).toBeDefined();
  });

  it("a stale better quote loses to a fresh worse one", () => {
    const stale = q({ venueId: "stale", amountOut: 2_000_000_000n, expiresAt: NOW - 1 });
    const fresh = q({ venueId: "fresh" });
    const r = scoreQuotes(req, [stale, fresh], cfg);
    expect(r.best?.quote.venueId).toBe("fresh");
    expect(r.rejected.map((x) => x.venueId)).toEqual(["stale"]);
  });
});

describe("insufficient depth", () => {
  it("rejects when depth is one unit short", () => {
    const r = scoreQuotes(req, [q({ maxAmountIn: req.amountIn - 1n })], cfg);
    expect(r.rejected[0]?.reason).toBe("insufficient-depth");
  });

  it("accepts depth exactly equal to amountIn", () => {
    expect(scoreQuotes(req, [q({ maxAmountIn: req.amountIn })], cfg).best).toBeDefined();
  });

  it("a shallow better quote loses to a deep worse one", () => {
    const shallow = q({ venueId: "shallow", amountOut: 2_000_000_000n, maxAmountIn: 0n });
    const deep = q({ venueId: "deep" });
    expect(scoreQuotes(req, [shallow, deep], cfg).best?.quote.venueId).toBe("deep");
  });
});

describe("other rejections", () => {
  it("rejects wrong pair and wrong amount", () => {
    const r = scoreQuotes(req, [q({ venueId: "pair", buy: "USDT" }), q({ venueId: "amt", amountIn: 1n })], cfg);
    expect(r.rejected.map((x) => x.reason)).toEqual(["pair-mismatch", "amount-mismatch"]);
  });

  it("rejects when costs eat the whole output", () => {
    const r = scoreQuotes(req, [q({ feeOut: 1_000_000_000n })], cfg);
    expect(r.rejected[0]?.reason).toBe("non-positive-net");
  });

  it("enforces maxSettlementSeconds", () => {
    const r = scoreQuotes(req, [q({ settlementSeconds: 86_401 })], { ...cfg, maxSettlementSeconds: 86_400 });
    expect(r.rejected[0]?.reason).toBe("too-slow");
  });

  it("empty input yields no best and no throw", () => {
    expect(scoreQuotes(req, [], cfg)).toEqual({ ranked: [], rejected: [], best: undefined });
  });
});

describe("maths helpers", () => {
  it("time penalty rounds up, so a venue never benefits from rounding", () => {
    // 1 unit * 1bps * 1s / (10000 * 3600) = tiny, rounds to 1
    expect(timePenalty(1n, 1, 1n)).toBe(1n);
    expect(timePenalty(0n, 3_600, 100n)).toBe(0n);
    expect(timePenalty(1_000_000n, 0, 100n)).toBe(0n);
  });

  it("netRateE18 is USD per whole NGN", () => {
    // 1000 USDC for NGN 1.5m -> 1/1500 USD per naira
    const r = netRateE18(1_000_000_000n, 1_500_000_00n, 2, 6);
    expect(r).toBe(10n ** 18n / 1500n);
  });

  it("netRateE18 handles sell decimals above buy decimals", () => {
    // 2000 USDC for 1 WETH
    expect(netRateE18(2_000_000_000n, 10n ** 18n, 18, 6)).toBe(2000n * 10n ** 18n);
  });
});
