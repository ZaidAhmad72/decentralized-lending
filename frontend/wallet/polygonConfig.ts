/**
 * polygonConfig.ts
 * Network configuration for Polygon Amoy testnet.
 * Switch POLYGON_NETWORK to "mainnet" for production.
 */

export type PolygonNetwork = "amoy" | "mainnet";

export const POLYGON_NETWORK: PolygonNetwork = "amoy";

export const POLYGON_NETWORKS = {
  amoy: {
    name: "Polygon Amoy Testnet",
    chainId: 80002,
    currency: "MATIC",
    rpcUrl:
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL ??
      "https://rpc-amoy.polygon.technology",
    explorerUrl: "https://amoy.polygonscan.com",
    faucetUrl: "https://faucet.polygon.technology",
  },
  mainnet: {
    name: "Polygon Mainnet",
    chainId: 137,
    currency: "POL",
    rpcUrl:
      process.env.NEXT_PUBLIC_POLYGON_RPC_URL ??
      "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    faucetUrl: null,
  },
} as const;

export const ACTIVE_NETWORK = POLYGON_NETWORKS[POLYGON_NETWORK];
