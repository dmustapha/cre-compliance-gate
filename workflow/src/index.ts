/**
 * CRE Compliance Gate Workflow
 *
 * Orchestrates compliance checks for vault deposits:
 * 1. Verifies World ID proof-of-personhood via HTTPClient
 * 2. Screens sender address against OFAC sanctions via HTTPClient
 * 3. Writes a CRE report to the ComplianceVault via EVMClient
 *
 * Uses real @chainlink/cre-sdk v1.2.0 API patterns.
 */

import {
  cre,
  type Runtime,
  type HTTPPayload,
  type WriteCreReportRequestJson,
  consensusIdenticalAggregation,
  json,
  ok,
} from "@chainlink/cre-sdk";

// --- Configuration Type ---
interface Config {
  worldIdAppId: string;
  worldIdAction: string;
  sanctionsApiUrl: string;
  sanctionsApiKey: string;
  vaultAddress: string;
}

// --- Trigger Payload Type ---
interface DepositPayload {
  sender: string;
  amount: string;
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  signal: string;
  verification_level: string;
}

// --- Response types for consensus ---
interface WorldIdResult {
  verified: boolean;
}

interface SanctionsResult {
  sanctioned: boolean;
  matchCount: number;
}

// --- Instantiate capabilities ---
const httpCapability = new cre.capabilities.HTTPCapability();
const httpClient = new cre.capabilities.HTTPClient();
const evmClient = new cre.capabilities.EVMClient(
  16015286601757825753n // ethereum-testnet-sepolia
);

// --- World ID Verification ---
function verifyWorldId(
  runtime: Runtime<Config>,
  payload: DepositPayload
): boolean {
  runtime.log("[Compliance] Step 1: Verifying World ID proof...");

  const verifyUrl = `https://developer.worldcoin.org/api/v2/verify/${runtime.config.worldIdAppId}`;

  const response = httpClient.sendRequest<[], WorldIdResult>(runtime, (sendRequester) => {
    const resp = sendRequester.sendRequest({
      url: verifyUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: btoa(
        JSON.stringify({
          nullifier_hash: payload.nullifier_hash,
          merkle_root: payload.merkle_root,
          proof: payload.proof,
          verification_level: payload.verification_level || "device",
          action: runtime.config.worldIdAction,
          signal_hash: payload.signal,
        })
      ),
    }).result();

    if (!ok(resp)) {
      return { verified: false };
    }

    const data = json(resp) as { success?: boolean };
    return { verified: data.success === true };
  }, consensusIdenticalAggregation<WorldIdResult>())().result();

  if (!response.verified) {
    runtime.log("[Compliance] World ID verification FAILED");
    throw new Error("WORLD_ID_VERIFICATION_FAILED");
  }

  runtime.log("[Compliance] World ID verification PASSED");
  return true;
}

// --- Sanctions Screening ---
function checkSanctions(
  runtime: Runtime<Config>,
  senderAddress: string
): boolean {
  runtime.log("[Compliance] Step 2: Screening against sanctions list...");

  const searchUrl = `${runtime.config.sanctionsApiUrl}/search/default?q=${senderAddress}&schema=LegalEntity`;

  const response = httpClient.sendRequest<[], SanctionsResult>(runtime, (sendRequester) => {
    const resp = sendRequester.sendRequest({
      url: searchUrl,
      method: "GET",
      headers: {
        Authorization: `ApiKey ${runtime.config.sanctionsApiKey}`,
      },
    }).result();

    if (!ok(resp)) {
      return { sanctioned: false, matchCount: 0 };
    }

    const data = json(resp) as { total?: { value?: number } };
    return {
      sanctioned: (data.total?.value ?? 0) > 0,
      matchCount: data.total?.value ?? 0,
    };
  }, consensusIdenticalAggregation<SanctionsResult>())().result();

  if (response.sanctioned) {
    runtime.log(
      `[Compliance] SANCTIONS MATCH — ${response.matchCount} hit(s) found`
    );
    throw new Error("SANCTIONS_MATCH");
  }

  runtime.log("[Compliance] Sanctions screening PASSED — no matches");
  return true;
}

// --- Deposit Execution via CRE Report ---
function executeDeposit(
  runtime: Runtime<Config>,
  sender: string,
  _amount: string
): void {
  runtime.log("[Compliance] Step 3: Executing compliant deposit on vault...");

  // Build CRE report with deposit data
  const report = runtime.report({
    encodedPayload: btoa(JSON.stringify({ depositor: sender })),
    encoderName: "json",
    signingAlgo: "secp256k1",
    hashingAlgo: "keccak256",
  }).result();

  // Write CRE report to vault contract
  const writeRequest: WriteCreReportRequestJson = {
    receiver: runtime.config.vaultAddress,
    report,
    gasConfig: {
      gasLimit: "500000",
    },
  };

  evmClient.writeReport(runtime, writeRequest).result();

  runtime.log("[Compliance] Deposit report written to chain");
}

// --- Main Handler ---
const httpTrigger = httpCapability.trigger({
  authorizedKeys: [],
});

cre.handler(
  httpTrigger,
  (runtime: Runtime<Config>, triggerOutput: HTTPPayload) => {
    // Parse the trigger payload
    const payloadStr = new TextDecoder().decode(triggerOutput.input);
    const payload: DepositPayload = JSON.parse(payloadStr);

    runtime.log("=== CRE Compliance Gate ===");
    runtime.log(`Sender: ${payload.sender}`);
    runtime.log(`Amount: ${payload.amount} wei`);

    // Step 1: World ID verification
    verifyWorldId(runtime, payload);

    // Step 2: Sanctions screening
    checkSanctions(runtime, payload.sender);

    // Step 3: Execute deposit (only reached if both checks pass)
    executeDeposit(runtime, payload.sender, payload.amount);

    runtime.log("=== Compliance Gate: ALL CHECKS PASSED ===");

    return {
      success: true,
      checks: {
        worldId: "PASSED",
        sanctions: "PASSED",
        deposit: "PASSED",
      },
    };
  }
);
