import { arbitrum, arbitrumSepolia } from "viem/chains";
import { defineChain, type Chain } from "viem";

/**
 * Robinhood Chain values verified against https://docs.robinhood.com/chain/connecting
 * on 2026-10-05. Robinhood Chain is an Arbitrum Orbit L2 settling to Ethereum
 * (testnet settles to Ethereum Sepolia) — a sibling of Arbitrum One, not an L3.
 */
export const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" },
  },
  testnet: true,
});

export type Network = "arbitrum" | "arbitrumSepolia" | "robinhood" | "robinhoodTestnet";

export const CHAINS: Record<Network, Chain> = {
  arbitrum,
  arbitrumSepolia,
  robinhood,
  robinhoodTestnet,
};

/** Env var that overrides each chain's public RPC. */
export const RPC_ENV: Record<Network, string> = {
  arbitrum: "ARBITRUM_ONE_RPC_URL",
  arbitrumSepolia: "ARBITRUM_SEPOLIA_RPC_URL",
  robinhood: "ROBINHOOD_RPC_URL",
  robinhoodTestnet: "ROBINHOOD_TESTNET_RPC_URL",
};

export function rpcUrl(network: Network, env: Record<string, string | undefined> = process.env): string {
  return env[RPC_ENV[network]] || CHAINS[network].rpcUrls.default.http[0]!;
}

export function txUrl(network: Network, hash: string): string {
  return `${CHAINS[network].blockExplorers!.default.url}/tx/${hash}`;
}
