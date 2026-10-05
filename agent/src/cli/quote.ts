/**
 * pnpm quote            -> quote a sample NGN->USDC payment (mock desks) and USDT->USDC (live Uniswap, Arbitrum One)
 * pnpm quote --verify   -> also check token symbols/decimals onchain against shared/addresses.ts
 *
 * Read-only: no signer, no transactions.
 */
import { createPublicClient, erc20Abi, formatUnits, http, type PublicClient } from "viem";
import { CHAINS, rpcUrl, TOKENS, UNISWAP_V3, type RouteRequest, type ScoreResult, type VenueAdapter } from "@dictum/shared";
import { gatherQuotes } from "../gather.js";
import { scoreQuotes } from "../scoring/scorer.js";
import { quoteSetHash } from "../scoring/quoteSetHash.js";
import { mockOfframpDesks } from "../venues/mockOfframp.js";
import { UniswapV3Adapter } from "../venues/uniswapV3.js";

const client = createPublicClient({ chain: CHAINS.arbitrum, transport: http(rpcUrl("arbitrum")) }) as PublicClient;
const tokens = TOKENS.arbitrum;

async function verifyTokens() {
  for (const [symbol, t] of Object.entries(tokens)) {
    const [onchainSymbol, decimals] = await Promise.all([
      client.readContract({ address: t.address, abi: erc20Abi, functionName: "symbol" }),
      client.readContract({ address: t.address, abi: erc20Abi, functionName: "decimals" }),
    ]);
    const ok = decimals === t.decimals;
    console.log(`${ok ? "ok  " : "FAIL"} ${symbol.padEnd(5)} ${t.address} onchain=${onchainSymbol}/${decimals}`);
    if (!ok) process.exitCode = 1;
  }
}

function print(req: RouteRequest, r: ScoreResult, hash: string) {
  const out = (v: bigint) => formatUnits(v, req.buy.decimals);
  console.log(`\n${req.paymentId}: sell ${formatUnits(req.amountIn, req.sell.decimals)} ${req.sell.symbol} -> ${req.buy.symbol}`);
  console.log(`quote set hash ${hash}`);
  for (const [i, s] of r.ranked.entries()) {
    const q = s.quote;
    console.log(
      `${i === 0 ? "*" : " "} ${q.venueId.padEnd(22)} gross ${out(q.amountOut).padStart(14)}  fee ${out(q.feeOut).padStart(10)}` +
        `  gas ${out(q.gasCostOut).padStart(9)}  wait ${out(s.timePenaltyOut).padStart(9)}  net ${out(s.netOut).padStart(14)}  ${q.settlementSeconds}s`,
    );
  }
  for (const x of r.rejected) console.log(`x ${x.venueId.padEnd(22)} ${x.reason}${x.detail ? ` (${x.detail})` : ""}`);
}

async function run(req: RouteRequest, adapters: readonly VenueAdapter[]) {
  const { quotes, failures } = await gatherQuotes(req, adapters, 5_000);
  const r = scoreQuotes(req, quotes, { now: Date.now(), maxQuoteAgeMs: 60_000, timePenaltyBpsPerHour: 2n });
  r.rejected.push(...failures);
  print(req, r, quoteSetHash(quotes));
}

if (process.argv.includes("--verify")) await verifyTokens();

const uniswap = new UniswapV3Adapter({ client, quoter: UNISWAP_V3.arbitrum.quoterV2, tokens });
const desks = mockOfframpDesks({ referenceRateE18: 1500n * 10n ** 18n, seed: 42 });

await run(
  { paymentId: "demo-ngn", sell: { symbol: "NGN", decimals: 2 }, buy: { symbol: "USDC", decimals: 6 }, amountIn: 15_000_000_00n },
  [...desks, uniswap],
);
await run(
  { paymentId: "demo-usdt", sell: { symbol: "USDT", decimals: 6 }, buy: { symbol: "USDC", decimals: 6 }, amountIn: 10_000_000_000n },
  [...desks, uniswap],
);
