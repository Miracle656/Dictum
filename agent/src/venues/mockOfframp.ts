import type { Asset, Quote, RouteRequest, VenueAdapter } from "@dictum/shared";

/**
 * MOCK. Simulates an NGN -> USD stablecoin off-ramp desk (bank wire, BDC, P2P,
 * licensed exchange). Spreads, fees, depth and latency are illustrative, not
 * live market data. A real adapter replaces this behind the same interface.
 */
export interface DeskConfig {
  id: string;
  /** Spread below the reference rate, in bps. */
  spreadBps: bigint;
  /** Percentage fee on output, in bps. */
  feeBps: bigint;
  /** Flat fee in buy-asset units (6dp for USDC/USDG). */
  flatFeeOut: bigint;
  settlementSeconds: number;
  /** Max NGN (kobo) the desk will fill. */
  depthIn: bigint;
  ttlMs: number;
  latencyMs: readonly [min: number, max: number];
  /** Random rate wobble applied per quote, +/- bps. */
  jitterBps: number;
  /** Probability [0,1) that the desk fails to answer. */
  failRate: number;
}

export interface MockOfframpOptions {
  /** NGN per 1 USD, 1e18 fixed point. */
  referenceRateE18: bigint;
  seed?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const BPS = 10_000n;
const E18 = 10n ** 18n;
const BUY_SYMBOLS = new Set(["USDC", "USDG"]);

/** mulberry32: tiny deterministic PRNG so a seeded demo replays identically. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class MockOfframpAdapter implements VenueAdapter {
  readonly kind = "offramp" as const;
  readonly id: string;
  private readonly rand: () => number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly desk: DeskConfig,
    private readonly opts: MockOfframpOptions,
  ) {
    this.id = desk.id;
    this.rand = prng((opts.seed ?? 1) ^ hashId(desk.id));
    this.now = opts.now ?? Date.now;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  supports(sell: Asset, buy: Asset): boolean {
    return sell.symbol === "NGN" && BUY_SYMBOLS.has(buy.symbol);
  }

  async quote(req: RouteRequest): Promise<Quote> {
    const [lo, hi] = this.desk.latencyMs;
    await this.sleep(lo + Math.floor(this.rand() * (hi - lo + 1)));
    if (this.rand() < this.desk.failRate) throw new Error(`${this.id}: desk unavailable`);

    // Integer bps jitter in [-jitterBps, +jitterBps]; a positive value makes the rate worse.
    const jitter = BigInt(Math.round((this.rand() * 2 - 1) * this.desk.jitterBps));
    const effectiveSpread = this.desk.spreadBps + jitter;

    // out = in(kobo) * 10^buyDec * 1e18 / (10^sellDec * NGN-per-USD e18), then less spread.
    const atRef =
      (req.amountIn * 10n ** BigInt(req.buy.decimals) * E18) /
      (10n ** BigInt(req.sell.decimals) * this.opts.referenceRateE18);
    const amountOut = (atRef * (BPS - effectiveSpread)) / BPS;
    const feeOut = (amountOut * this.desk.feeBps) / BPS + this.desk.flatFeeOut;

    const t = this.now();
    return {
      venueId: this.id,
      venueKind: this.kind,
      sell: req.sell.symbol,
      buy: req.buy.symbol,
      amountIn: req.amountIn,
      amountOut,
      feeOut,
      gasCostOut: 0n,
      bridgeCostOut: 0n,
      settlementSeconds: this.desk.settlementSeconds,
      maxAmountIn: this.desk.depthIn,
      quotedAt: t,
      expiresAt: t + this.desk.ttlMs,
      meta: { mock: true, spreadBps: Number(effectiveSpread) },
    };
  }
}

const NGN = (naira: bigint) => naira * 100n;
const USD = (dollars: bigint) => dollars * 1_000_000n;

/** Illustrative desk profiles. Numbers are plausible shapes, not sourced rates. */
export const DEFAULT_DESKS: readonly DeskConfig[] = [
  {
    id: "mock-bank-wire", spreadBps: 250n, feeBps: 50n, flatFeeOut: USD(25n), settlementSeconds: 2 * 86_400,
    depthIn: NGN(500_000_000n), ttlMs: 300_000, latencyMs: [400, 1_200], jitterBps: 10, failRate: 0,
  },
  {
    id: "mock-bdc", spreadBps: 150n, feeBps: 0n, flatFeeOut: 0n, settlementSeconds: 4 * 3_600,
    depthIn: NGN(50_000_000n), ttlMs: 120_000, latencyMs: [300, 900], jitterBps: 25, failRate: 0,
  },
  {
    id: "mock-p2p-desk", spreadBps: 80n, feeBps: 30n, flatFeeOut: 0n, settlementSeconds: 15 * 60,
    depthIn: NGN(20_000_000n), ttlMs: 60_000, latencyMs: [150, 600], jitterBps: 30, failRate: 0.05,
  },
  {
    id: "mock-exchange-offramp", spreadBps: 60n, feeBps: 50n, flatFeeOut: USD(1n), settlementSeconds: 10 * 60,
    depthIn: NGN(100_000_000n), ttlMs: 30_000, latencyMs: [100, 400], jitterBps: 15, failRate: 0,
  },
];

export function mockOfframpDesks(opts: MockOfframpOptions, desks: readonly DeskConfig[] = DEFAULT_DESKS) {
  return desks.map((d) => new MockOfframpAdapter(d, opts));
}
