import { describe, expect, it } from "vitest";
import type { Quote, RouteRequest, VenueAdapter } from "@dictum/shared";
import { DEFAULT_DESKS, MockOfframpAdapter, mockOfframpDesks } from "../src/venues/mockOfframp.js";
import { gatherQuotes } from "../src/gather.js";
import { quoteSetHash } from "../src/scoring/quoteSetHash.js";
import { scoreQuotes } from "../src/scoring/scorer.js";

const NOW = 1_800_000_000_000;
const RATE = 1500n * 10n ** 18n; // NGN per USD
const req: RouteRequest = {
  paymentId: "pay-1",
  sell: { symbol: "NGN", decimals: 2 },
  buy: { symbol: "USDC", decimals: 6 },
  amountIn: 15_000_000_00n, // NGN 15m ~= $10k
};
const opts = { referenceRateE18: RATE, seed: 7, now: () => NOW, sleep: async () => {} };

describe("mock off-ramp", () => {
  it("converts at reference rate less spread, with fees separate", async () => {
    const desk = { ...DEFAULT_DESKS[0]!, jitterBps: 0, failRate: 0 };
    const quote = await new MockOfframpAdapter(desk, opts).quote(req);
    // $10,000 at reference, less 250bps spread = $9,750
    expect(quote.amountOut).toBe(9_750_000_000n);
    // 50bps of 9,750 + $25 flat
    expect(quote.feeOut).toBe(48_750_000n + 25_000_000n);
    expect(quote.expiresAt - quote.quotedAt).toBe(desk.ttlMs);
  });

  it("is deterministic for a given seed", async () => {
    const a = await Promise.all(mockOfframpDesks(opts).map((d) => d.quote(req)));
    const b = await Promise.all(mockOfframpDesks(opts).map((d) => d.quote(req)));
    expect(a).toEqual(b);
  });

  it("only supports NGN into USD stablecoins", () => {
    const d = mockOfframpDesks(opts)[0]!;
    expect(d.supports(req.sell, req.buy)).toBe(true);
    expect(d.supports(req.sell, { symbol: "USDG", decimals: 6 })).toBe(true);
    expect(d.supports({ symbol: "USDT", decimals: 6 }, req.buy)).toBe(false);
  });
});

describe("gather + score", () => {
  const failing: VenueAdapter = {
    id: "broken", kind: "offramp", supports: () => true,
    quote: async () => { throw new Error("boom"); },
  };
  const hanging: VenueAdapter = {
    id: "hang", kind: "offramp", supports: () => true,
    quote: () => new Promise<Quote>(() => {}),
  };

  it("collects failures and timeouts without blocking healthy venues", async () => {
    const { quotes, failures } = await gatherQuotes(req, [...mockOfframpDesks(opts), failing, hanging], 50);
    expect(failures.map((f) => f.venueId).sort()).toEqual(["broken", "hang"]);
    expect(quotes.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects desks too shallow for the payment", async () => {
    const big = { ...req, amountIn: 60_000_000_00n }; // NGN 60m: beyond BDC (50m) and P2P (20m)
    const { quotes } = await gatherQuotes(big, mockOfframpDesks(opts), 1_000);
    const r = scoreQuotes(big, quotes, { now: NOW, maxQuoteAgeMs: 60_000, timePenaltyBpsPerHour: 0n });
    const shallow = r.rejected.filter((x) => x.reason === "insufficient-depth").map((x) => x.venueId).sort();
    expect(shallow).toEqual(expect.arrayContaining(["mock-bdc"]));
    expect(r.best).toBeDefined();
  });
});

describe("quoteSetHash", () => {
  it("is order independent and sensitive to any field", async () => {
    const { quotes } = await gatherQuotes(req, mockOfframpDesks({ ...opts }).slice(0, 2), 1_000);
    expect(quoteSetHash(quotes)).toBe(quoteSetHash([...quotes].reverse()));
    const tweaked = [{ ...quotes[0]!, amountOut: quotes[0]!.amountOut + 1n }, quotes[1]!];
    expect(quoteSetHash(tweaked)).not.toBe(quoteSetHash(quotes));
  });
});
