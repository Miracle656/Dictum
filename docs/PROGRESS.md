# Progress

_Last updated 2026-10-05_

## Done

**Landing page** (`web/`): the Dictum Landing design implemented as a Next.js page, built
statically and ready for Vercel. The quotes, tx hashes and blocks on it are examples, and
are labelled that way.

**M1: quotes and scoring**
- pnpm monorepo: `shared`, `agent`, `web`.
- Chain config for Arbitrum One (42161), Arbitrum Sepolia (421614), Robinhood Chain (4663),
  and Robinhood Chain Testnet (46630). Robinhood values were verified against
  docs.robinhood.com/chain/connecting.
- `Quote`, `RouteRequest` and `VenueAdapter` types. All amounts are bigint.
- `UniswapV3Adapter`: a live QuoterV2 quote across fee tiers, with a price-impact
  depth check and gas priced in the buy asset. Addresses were verified against
  Uniswap's deployment docs.
- `MockOfframpAdapter`: **MOCK**. Seeded NGN→USDC/USDG desks (bank wire, BDC, P2P,
  exchange) with illustrative spreads, fees, depth, latency and failure rate.
- Scorer: ranks on all-in net output (gross − fees − gas − bridge − time penalty).
  It rejects stale quotes, quotes that are too old, insufficient depth, wrong
  pair or amount, settlement that is too slow, and non-positive net. Ties break on
  faster settlement, then venueId.
- `quoteSetHash`: an order-independent keccak of all quotes considered (it goes into the dictum).
- 28 vitest tests (scorer, ties, staleness, depth, gather timeouts, hash).

## Next

- M2: Foundry contracts (PaymentIntent, DictumRegistry, AgentBond), with fuzzing on the shortfall maths. Deploy to Arbitrum Sepolia.

## Open questions / assumptions to verify by hand

- **What NGN is onchain.** The off-ramp leg is mocked. We need to decide whether an
  NGN stablecoin (for example cNGN) exists on Arbitrum, or whether NGN stays offchain
  and only the USD leg is onchain.
- **Uniswap on Arbitrum Sepolia.** The contracts exist (verified), but pool liquidity
  is unknown. M1 quotes Arbitrum One mainnet read-only.
- **Robinhood Chain testnet.** USDG availability, bridge support (Across, CCIP or
  Relay for 46630) and any lending market are all unverified. Check before M4 and mock
  whatever is missing.
- The Uniswap gas estimate adds a fixed 60k overhead for router and L1 data cost. This is approximate.
