import type { Address, PublicClient } from "viem";
import type { Asset, Quote, RouteRequest, VenueAdapter } from "@dictum/shared";

const QUOTER_V2_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export interface TokenInfo {
  address: Address;
  decimals: number;
}

export interface UniswapV3Options {
  client: PublicClient;
  quoter: Address;
  /** Symbol -> token. Must include WETH to price gas in the buy asset. */
  tokens: Record<string, TokenInfo>;
  feeTiers?: readonly number[];
  /** Report zero depth if price impact versus a small probe exceeds this. */
  maxImpactBps?: bigint;
  /** Gas added on top of the quoter estimate for router overhead and the L1 data component. */
  gasOverhead?: bigint;
  ttlMs?: number;
  settlementSeconds?: number;
  id?: string;
  now?: () => number;
}

interface SingleQuote {
  amountOut: bigint;
  gasEstimate: bigint;
  fee: number;
}

const BPS = 10_000n;
const E18 = 10n ** 18n;

export class UniswapV3Adapter implements VenueAdapter {
  readonly kind = "onchain-dex" as const;
  readonly id: string;
  private readonly feeTiers: readonly number[];
  private readonly now: () => number;

  constructor(private readonly o: UniswapV3Options) {
    this.id = o.id ?? "uniswap-v3";
    this.feeTiers = o.feeTiers ?? [100, 500, 3000];
    this.now = o.now ?? Date.now;
  }

  supports(sell: Asset, buy: Asset): boolean {
    return sell.symbol !== buy.symbol && sell.symbol in this.o.tokens && buy.symbol in this.o.tokens;
  }

  private async quoteSingle(tokenIn: Address, tokenOut: Address, amountIn: bigint, fee: number): Promise<SingleQuote> {
    const { result } = await this.o.client.simulateContract({
      address: this.o.quoter,
      abi: QUOTER_V2_ABI,
      functionName: "quoteExactInputSingle",
      args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
    });
    const [amountOut, , , gasEstimate] = result;
    return { amountOut, gasEstimate, fee };
  }

  /** Best output across fee tiers; tiers without a pool revert and are skipped. */
  private async best(tokenIn: Address, tokenOut: Address, amountIn: bigint): Promise<SingleQuote> {
    const tries = await Promise.allSettled(this.feeTiers.map((f) => this.quoteSingle(tokenIn, tokenOut, amountIn, f)));
    let best: SingleQuote | undefined;
    for (const t of tries) if (t.status === "fulfilled" && (!best || t.value.amountOut > best.amountOut)) best = t.value;
    if (!best) throw new Error(`${this.id}: no pool for ${tokenIn}->${tokenOut}`);
    return best;
  }

  async quote(req: RouteRequest): Promise<Quote> {
    const tIn = this.o.tokens[req.sell.symbol]!;
    const tOut = this.o.tokens[req.buy.symbol]!;
    const weth = this.o.tokens.WETH;
    if (!weth) throw new Error(`${this.id}: WETH missing from token map`);

    const main = await this.best(tIn.address, tOut.address, req.amountIn);
    const probeIn = req.amountIn / 1000n > 0n ? req.amountIn / 1000n : 1n;
    const [probe, gasPrice, ethPriceOut] = await Promise.all([
      this.quoteSingle(tIn.address, tOut.address, probeIn, main.fee),
      this.o.client.getGasPrice(),
      tOut.address === weth.address
        ? Promise.resolve(E18)
        : this.best(weth.address, tOut.address, E18).then((q) => q.amountOut),
    ]);

    // impact = 1 - (main rate / probe rate), in bps, clamped at zero.
    const ratioBps = probe.amountOut === 0n ? 0n : (main.amountOut * probeIn * BPS) / (probe.amountOut * req.amountIn);
    const impactBps = ratioBps >= BPS ? 0n : BPS - ratioBps;
    const maxImpact = this.o.maxImpactBps ?? 100n;

    const gasUnits = main.gasEstimate + (this.o.gasOverhead ?? 60_000n);
    const gasWei = gasUnits * gasPrice;
    const gasCostOut = gasWei === 0n ? 0n : (gasWei * ethPriceOut - 1n) / E18 + 1n; // round up

    const t = this.now();
    return {
      venueId: this.id,
      venueKind: this.kind,
      sell: req.sell.symbol,
      buy: req.buy.symbol,
      amountIn: req.amountIn,
      amountOut: main.amountOut,
      feeOut: 0n, // pool fee is already netted into amountOut
      gasCostOut,
      bridgeCostOut: 0n,
      settlementSeconds: this.o.settlementSeconds ?? 5,
      maxAmountIn: impactBps <= maxImpact ? req.amountIn : 0n,
      quotedAt: t,
      expiresAt: t + (this.o.ttlMs ?? 30_000),
      meta: {
        feeTier: main.fee,
        impactBps: Number(impactBps),
        gasUnits: Number(gasUnits),
        gasPriceWei: gasPrice.toString(),
      },
    };
  }
}
