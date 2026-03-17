"use client";

import { useState, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { IDKitWidget, type ISuccessResult, VerificationLevel } from "@worldcoin/idkit";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { config } from "@/lib/config";
import { vaultContract } from "@/lib/contracts";
import {
  StatusPanel,
  type ComplianceStatus,
} from "@/components/StatusPanel";

export function DepositForm() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<ComplianceStatus>({
    worldId: "idle",
    sanctions: "idle",
    deposit: "idle",
    txHash: null,
    error: null,
  });

  // Read user's vault balance
  const { data: vaultBalance } = useReadContract({
    ...vaultContract,
    functionName: "getBalance",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Handle World ID verification success
  const handleWorldIdSuccess = useCallback(
    async (result: ISuccessResult) => {
      if (!address || !amount) return;

      setIsProcessing(true);
      setStatus({
        worldId: "passed",
        sanctions: "pending",
        deposit: "idle",
        txHash: null,
        error: null,
      });

      try {
        // Send deposit request to CRE workflow (or mock API)
        const response = await fetch(config.cre.workflowUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: address,
            amount: parseEther(amount).toString(),
            merkle_root: result.merkle_root,
            nullifier_hash: result.nullifier_hash,
            proof: result.proof,
            signal: address,
            verification_level: result.verification_level,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus({
            worldId: "passed",
            sanctions: "passed",
            deposit: "passed",
            txHash: data.txHash,
            error: null,
          });
        } else {
          const errorStep =
            data.error === "SANCTIONS_MATCH" ? "sanctions" : "deposit";
          setStatus((prev) => ({
            ...prev,
            [errorStep]: "failed",
            error:
              data.error === "SANCTIONS_MATCH"
                ? "Address flagged for compliance violation. Deposit rejected."
                : `Deposit failed: ${data.error}`,
          }));
        }
      } catch (err) {
        setStatus((prev) => ({
          ...prev,
          deposit: "failed",
          error: `Network error: ${err instanceof Error ? err.message : "Unknown error"}`,
        }));
      } finally {
        setIsProcessing(false);
      }
    },
    [address, amount]
  );

  const hasActivity = status.worldId !== "idle" || status.sanctions !== "idle" || status.deposit !== "idle";

  return (
    <div className="space-y-5">
      {/* Wallet Connection */}
      {!isConnected ? (
        <div className="card-elevated p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-chainlink-blue/10">
            <svg className="h-7 w-7 text-chainlink-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-white">
            Connect Your Wallet
          </h2>
          <p className="mb-6 text-sm text-gray-400">
            Connect to start making compliance-verified deposits
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <>
          {/* Connected wallet bar */}
          <div className="flex items-center justify-between rounded-lg bg-surface-secondary/50 px-4 py-2.5">
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="address"
            />
          </div>

          {/* Vault Balance */}
          {vaultBalance !== undefined && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Vault Balance
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-white">
                    {formatEther(vaultBalance as bigint)}{" "}
                    <span className="text-base font-normal text-gray-400">ETH</span>
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-chainlink-blue/10">
                  <svg className="h-5 w-5 text-chainlink-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Deposit Form */}
          <div className="card-elevated p-6">
            <h2 className="mb-1 text-base font-semibold text-white">
              Deposit ETH
            </h2>
            <p className="mb-5 text-sm text-gray-400">
              Verify identity and pass compliance checks before depositing
            </p>

            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Amount
            </label>
            <div className="relative mb-5">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isProcessing}
                className="input-field pr-14 text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                ETH
              </span>
            </div>

            {/* World ID + Deposit Button */}
            <IDKitWidget
              app_id={config.worldId.appId as `app_${string}`}
              action={config.worldId.action}
              signal={address}
              onSuccess={handleWorldIdSuccess}
              verification_level={VerificationLevel.Device}
            >
              {({ open }: { open: () => void }) => (
                <button
                  onClick={open}
                  disabled={
                    isProcessing || !amount || parseFloat(amount) <= 0
                  }
                  className="btn-primary"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing Compliance Checks...
                    </span>
                  ) : (
                    "Verify & Deposit"
                  )}
                </button>
              )}
            </IDKitWidget>

            <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-gray-600">
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-chainlink-blue" />
                Chainlink CRE
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-chainlink-blue" />
                World ID
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-chainlink-blue" />
                OFAC Screening
              </span>
            </div>
          </div>

          {/* Status Panel — only show when there's activity */}
          {hasActivity && <StatusPanel status={status} />}
        </>
      )}
    </div>
  );
}
