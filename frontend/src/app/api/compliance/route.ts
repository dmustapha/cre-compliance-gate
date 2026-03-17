/**
 * Mock CRE Compliance Workflow API Route
 *
 * Simulates the CRE workflow behavior for development/demo purposes.
 * In production, the frontend would POST directly to the CRE HTTP trigger URL.
 * This mock performs the same 3 steps:
 * 1. World ID verification (via World ID API)
 * 2. Sanctions screening (via OpenSanctions API)
 * 3. On-chain deposit (via direct contract call as CRE proxy)
 *
 * DEVIATION: This replaces the actual CRE DON deployment which requires
 * CapabilityRegistry registration and DON node infrastructure.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const VAULT_ABI = parseAbi([
  "function deposit(address depositor) payable",
  "function creAddress() view returns (address)",
]);

// Sanctioned test addresses for demo (mock list)
const MOCK_SANCTIONED_ADDRESSES = [
  "0x0000000000000000000000000000000000000bad",
  "0x000000000000000000000000000000000000dead",
].map((a) => a.toLowerCase());

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sender, amount, merkle_root, nullifier_hash, proof, signal, verification_level } = body;

    if (!sender || !amount) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Missing sender or amount" },
        { status: 400 }
      );
    }

    // Validate sender is a valid Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(sender)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INPUT", message: "Invalid sender address format" },
        { status: 400 }
      );
    }

    // --- Step 1: World ID Verification ---
    // In a real CRE workflow, this is an HTTPClient call to World ID API.
    // For demo: accept all proofs (World ID simulator doesn't have real proofs).
    let worldIdPassed = true;
    if (merkle_root && nullifier_hash && proof) {
      // We have proof data — in production CRE, this would verify via HTTPClient
      // For demo, we accept all valid-looking proofs
      worldIdPassed = true;
    } else {
      worldIdPassed = false;
    }

    if (!worldIdPassed) {
      return NextResponse.json({
        success: false,
        error: "WORLD_ID_VERIFICATION_FAILED",
        message: "World ID verification failed. No valid proof provided.",
      });
    }

    // --- Step 2: Sanctions Screening ---
    // In a real CRE workflow, this is an HTTPClient call to OpenSanctions API.
    // For demo: check against mock sanctioned address list.
    const isSanctioned = MOCK_SANCTIONED_ADDRESSES.includes(sender.toLowerCase());

    if (isSanctioned) {
      return NextResponse.json({
        success: false,
        error: "SANCTIONS_MATCH",
        message: "Address flagged for compliance violation.",
      });
    }

    // --- Step 3: Execute Deposit on ComplianceVault ---
    // In a real CRE workflow, this is an EVMClient.writeReport call.
    // For demo: we call the contract directly using the deployer key
    // (who should be set as the CRE address on the vault).
    const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
    const vaultAddress = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`;
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;

    if (!rpcUrl || !vaultAddress || !deployerKey) {
      return NextResponse.json({
        success: false,
        error: "CONFIG_ERROR",
        message: "Server configuration missing. Check environment variables.",
      });
    }

    const account = privateKeyToAccount(deployerKey);
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });

    // Execute deposit
    const txHash = await walletClient.writeContract({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: "deposit",
      args: [sender as `0x${string}`],
      value: BigInt(amount),
      gas: 500000n,
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    });

    return NextResponse.json({
      success: true,
      txHash: receipt.transactionHash,
      checks: {
        worldId: "PASSED",
        sanctions: "PASSED",
        deposit: "PASSED",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "EXECUTION_ERROR", message },
      { status: 500 }
    );
  }
}
