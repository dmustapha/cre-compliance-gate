/**
 * Debug-phase tests for config and contracts modules
 */
import { describe, it, expect } from "vitest";
import { config } from "@/lib/config";
import { COMPLIANCE_VAULT_ABI, vaultContract } from "@/lib/contracts";

describe("config", () => {
  it("has worldId section with defaults", () => {
    expect(config.worldId).toBeDefined();
    expect(config.worldId.action).toBe("deposit-compliance-check");
  });

  it("has contract section with correct chain ID default", () => {
    expect(config.contract.chainId).toBe(11155111); // Sepolia
  });

  it("vaultAddress defaults to 0x when env not set", () => {
    // It should be a hex string
    expect(config.contract.vaultAddress).toMatch(/^0x/);
  });
});

describe("contracts", () => {
  it("ABI has all required functions", () => {
    const functionNames = COMPLIANCE_VAULT_ABI
      .filter((item) => item.type === "function")
      .map((item) => item.name);

    expect(functionNames).toContain("deposit");
    expect(functionNames).toContain("withdraw");
    expect(functionNames).toContain("getBalance");
    expect(functionNames).toContain("balances");
    expect(functionNames).toContain("totalDeposits");
    expect(functionNames).toContain("creAddress");
  });

  it("ABI has Deposit and Withdrawal events", () => {
    const eventNames = COMPLIANCE_VAULT_ABI
      .filter((item) => item.type === "event")
      .map((item) => item.name);

    expect(eventNames).toContain("Deposit");
    expect(eventNames).toContain("Withdrawal");
  });

  it("vaultContract has address and abi", () => {
    expect(vaultContract.address).toBeDefined();
    expect(vaultContract.abi).toBeDefined();
    expect(vaultContract.abi.length).toBeGreaterThan(0);
  });

  it("deposit function is payable", () => {
    const deposit = COMPLIANCE_VAULT_ABI.find(
      (item) => item.type === "function" && item.name === "deposit"
    );
    expect(deposit).toBeDefined();
    expect(deposit!.stateMutability).toBe("payable");
  });

  it("getBalance is view function", () => {
    const getBalance = COMPLIANCE_VAULT_ABI.find(
      (item) => item.type === "function" && item.name === "getBalance"
    );
    expect(getBalance).toBeDefined();
    expect(getBalance!.stateMutability).toBe("view");
  });
});
