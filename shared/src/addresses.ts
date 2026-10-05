import type { Address } from "viem";

/**
 * Uniswap v3 deployments, verified against
 * https://developers.uniswap.org/docs/protocols/v3/deployments/v3-arbitrum-deployments
 * on 2026-10-05.
 */
export const UNISWAP_V3 = {
  arbitrum: {
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  },
  arbitrumSepolia: {
    factory: "0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e",
    quoterV2: "0x2779a0CC1c3e0E44D2542EC3e79e3864Ae93Ef0B",
    swapRouter02: "0x101F443B4d1b059569D643917553c771E1b9663E",
  },
} as const satisfies Record<string, Record<string, Address>>;

/**
 * Tokens. USDC (Arbitrum One) verified against
 * https://docs.arbitrum.io/arbitrum-bridge/usdc-arbitrum-one on 2026-10-05.
 * Others are checked onchain (symbol/decimals) by `pnpm quote --verify`.
 */
export const TOKENS = {
  arbitrum: {
    USDC: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    USDT: { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
    WETH: { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18 },
  },
} as const satisfies Record<string, Record<string, { address: Address; decimals: number }>>;
