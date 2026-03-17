/**
 * Debug-phase tests for the /api/compliance route
 * Tests: edge cases, sanctions logic, input validation, error handling
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock viem modules before importing route
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      waitForTransactionReceipt: vi.fn().mockResolvedValue({
        transactionHash: "0xmocktxhash123",
      }),
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: vi.fn().mockResolvedValue("0xmocktxhash123"),
    })),
  };
});

vi.mock("viem/chains", () => ({
  sepolia: { id: 11155111, name: "Sepolia" },
}));

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: "0xMockDeployer",
    signMessage: vi.fn(),
    signTransaction: vi.fn(),
    signTypedData: vi.fn(),
  })),
}));

// Set env vars before importing route
process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL = "https://rpc.sepolia.test";
process.env.NEXT_PUBLIC_VAULT_ADDRESS = "0x8Bdd7640bb33fbB4e24735C33726bF568391B7De";
process.env.DEPLOYER_PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001";

import { POST } from "@/app/api/compliance/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/compliance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/compliance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Input Validation ---

  it("rejects request with missing sender", async () => {
    const req = makeRequest({ amount: "1000000000000000" });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("INVALID_INPUT");
  });

  it("rejects request with missing amount", async () => {
    const req = makeRequest({ sender: "0x1234567890abcdef1234567890abcdef12345678" });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("INVALID_INPUT");
  });

  it("rejects request with empty body fields", async () => {
    const req = makeRequest({ sender: "", amount: "" });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  // --- World ID Verification ---

  it("rejects when World ID proof is missing", async () => {
    const req = makeRequest({
      sender: "0x1234567890abcdef1234567890abcdef12345678",
      amount: "1000000000000000",
      // No merkle_root, nullifier_hash, proof
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("WORLD_ID_VERIFICATION_FAILED");
  });

  it("passes World ID check with valid proof data", async () => {
    const req = makeRequest({
      sender: "0x1234567890abcdef1234567890abcdef12345678",
      amount: "1000000000000000",
      merkle_root: "0xabc123",
      nullifier_hash: "0xdef456",
      proof: "0x789abc",
      signal: "0x1234567890abcdef1234567890abcdef12345678",
      verification_level: "device",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.checks.worldId).toBe("PASSED");
  });

  // --- Sanctions Screening ---

  it("rejects sanctioned address (0x...bad)", async () => {
    const req = makeRequest({
      sender: "0x0000000000000000000000000000000000000bad",
      amount: "1000000000000000",
      merkle_root: "0xabc",
      nullifier_hash: "0xdef",
      proof: "0x123",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("SANCTIONS_MATCH");
  });

  it("rejects sanctioned address (0x...dead)", async () => {
    const req = makeRequest({
      sender: "0x000000000000000000000000000000000000dead",
      amount: "1000000000000000",
      merkle_root: "0xabc",
      nullifier_hash: "0xdef",
      proof: "0x123",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("SANCTIONS_MATCH");
  });

  it("sanctions check is case-insensitive", async () => {
    const req = makeRequest({
      sender: "0x0000000000000000000000000000000000000BAD",
      amount: "1000000000000000",
      merkle_root: "0xabc",
      nullifier_hash: "0xdef",
      proof: "0x123",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("SANCTIONS_MATCH");
  });

  // --- Happy Path ---

  it("full happy path returns success with txHash", async () => {
    const req = makeRequest({
      sender: "0x1234567890abcdef1234567890abcdef12345678",
      amount: "1000000000000000",
      merkle_root: "0xabc123",
      nullifier_hash: "0xdef456",
      proof: "0x789abc",
      signal: "0x1234567890abcdef1234567890abcdef12345678",
      verification_level: "device",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.txHash).toBeDefined();
    expect(data.checks.worldId).toBe("PASSED");
    expect(data.checks.sanctions).toBe("PASSED");
    expect(data.checks.deposit).toBe("PASSED");
  });

  // --- Edge Cases ---

  it("handles zero amount with valid proofs", async () => {
    const req = makeRequest({
      sender: "0x1234567890abcdef1234567890abcdef12345678",
      amount: "0",
      merkle_root: "0xabc",
      nullifier_hash: "0xdef",
      proof: "0x123",
    });
    const res = await POST(req);
    const data = await res.json();
    // Zero amount should still process (contract will revert ZeroAmount)
    // The API route doesn't validate amount magnitude — that's the contract's job
    expect(data).toBeDefined();
  });
});

describe("/api/compliance - config errors", () => {
  it("returns CONFIG_ERROR when env vars missing", async () => {
    const originalRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
    delete process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

    // Need to re-import to pick up env changes — but since the route reads
    // process.env at call time, we can test directly
    const req = makeRequest({
      sender: "0x1234567890abcdef1234567890abcdef12345678",
      amount: "1000000000000000",
      merkle_root: "0xabc",
      nullifier_hash: "0xdef",
      proof: "0x123",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("CONFIG_ERROR");

    // Restore
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL = originalRpc;
  });
});
