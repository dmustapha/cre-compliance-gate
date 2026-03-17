"use client";

export type CheckStatus = "idle" | "pending" | "passed" | "failed";

export interface ComplianceStatus {
  worldId: CheckStatus;
  sanctions: CheckStatus;
  deposit: CheckStatus;
  txHash: string | null;
  error: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  worldId: "World ID Verification",
  sanctions: "Sanctions Screening",
  deposit: "On-Chain Deposit",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  worldId: "Proof of personhood via World ID",
  sanctions: "OFAC sanctions list check",
  deposit: "Execute compliant deposit to vault",
};

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "idle":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 ring-1 ring-gray-700">
          <div className="h-2 w-2 rounded-full bg-gray-600" />
        </div>
      );
    case "pending":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-warning-muted/30 ring-1 ring-status-warning/30">
          <svg className="h-4 w-4 animate-spin text-status-warning" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      );
    case "passed":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-success-muted/30 ring-1 ring-status-success/30">
          <svg className="h-4 w-4 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      );
    case "failed":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-error-muted/30 ring-1 ring-status-error/30">
          <svg className="h-4 w-4 text-status-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
  }
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const styles: Record<CheckStatus, string> = {
    idle: "bg-gray-800 text-gray-500",
    pending: "bg-status-warning-muted/30 text-status-warning",
    passed: "bg-status-success-muted/30 text-status-success",
    failed: "bg-status-error-muted/30 text-status-error",
  };
  const labels: Record<CheckStatus, string> = {
    idle: "Waiting",
    pending: "Checking",
    passed: "Passed",
    failed: "Failed",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

interface StatusPanelProps {
  status: ComplianceStatus;
}

export function StatusPanel({ status }: StatusPanelProps) {
  const steps = ["worldId", "sanctions", "deposit"] as const;

  const allPassed = steps.every((s) => status[s] === "passed");
  const hasFailed = steps.some((s) => status[s] === "failed");

  return (
    <div className={`card p-6 ${hasFailed ? "border-status-error/20" : allPassed ? "border-status-success/20" : ""}`}>
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Compliance Status
        </h3>
        {allPassed && (
          <span className="rounded-full bg-status-success-muted/30 px-2.5 py-0.5 text-xs font-semibold text-status-success">
            All Checks Passed
          </span>
        )}
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step}>
            <div className="flex items-center gap-3">
              {/* Step connector line */}
              <div className="relative">
                <StatusIcon status={status[step]} />
                {index < steps.length - 1 && (
                  <div className={`absolute left-1/2 top-8 h-4 w-px -translate-x-1/2 ${
                    status[step] === "passed" ? "bg-status-success/30" : "bg-gray-800"
                  }`} />
                )}
              </div>
              <div className="flex flex-1 items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">{STATUS_LABELS[step]}</p>
                  <p className="text-xs text-gray-500">{STATUS_DESCRIPTIONS[step]}</p>
                </div>
                <StatusBadge status={status[step]} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {status.txHash && (
        <div className="mt-5 rounded-lg border border-status-success/20 bg-status-success-muted/10 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-status-success">
              Deposit confirmed
            </p>
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${status.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-chainlink-blue hover:text-chainlink-blue-light"
          >
            View on Etherscan
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      )}

      {status.error && (
        <div className="mt-5 rounded-lg border border-status-error/20 bg-status-error-muted/10 p-4">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-status-error">{status.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
