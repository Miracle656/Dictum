# Dictum

An agentic FX settlement router for Nigerian businesses paying overseas suppliers.

A *dictum* is a thing said. Before Dictum executes a payment it writes onchain the
rate it will achieve, backed by a bond. After execution it writes the outcome.
One payment, one dictum, one outcome record: open both on a block explorer and
compare the promise with the result.

- **Arbitrum One / Sepolia**: escrow, dictums, agent bond, identity (the settlement record)
- **Robinhood Chain**: USDG treasury between payments

## Layout

```
contracts/  Foundry: PaymentIntent, DictumRegistry, AgentBond, TreasuryVault   (M2)
agent/      venue adapters, scorer, executor, policy guards, LLM layer
web/        Next.js landing page + dashboard
shared/     types, chain config, addresses
docs/       PROGRESS.md
```

## Quick start

```bash
pnpm install
pnpm test          # scorer + venue unit tests
pnpm quote         # live Uniswap v3 quote on Arbitrum One + mock off-ramp desks (read-only)
pnpm quote --verify   # also checks token addresses/decimals onchain
pnpm --filter @dictum/web dev   # landing page on http://localhost:3000
```

Copy `.env.example` to `.env` to override RPCs. No keys are needed for M1.

## Principles

- Route selection is deterministic, unit-tested TypeScript. The LLM explains; it never does money maths.
- All amounts are `bigint` in smallest units. No floats.
- Testnet first. No keys in the repo.

See [docs/PROGRESS.md](docs/PROGRESS.md) for status.
