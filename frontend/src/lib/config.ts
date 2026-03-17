// File: frontend/src/lib/config.ts

export const config = {
  worldId: {
    appId: process.env.NEXT_PUBLIC_WORLD_ID_APP_ID ?? "",
    action: process.env.NEXT_PUBLIC_WORLD_ID_ACTION ?? "deposit-compliance-check",
  },
  cre: {
    workflowUrl: process.env.NEXT_PUBLIC_CRE_WORKFLOW_URL ?? "",
  },
  contract: {
    vaultAddress: (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "0x") as `0x${string}`,
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111"),
  },
  rpc: {
    sepoliaUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "",
  },
} as const;
