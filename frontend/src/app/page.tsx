import { DepositForm } from "@/components/DepositForm";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-chainlink-dark/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chainlink-blue">
              <svg
                width="18"
                height="20"
                viewBox="0 0 18 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 0L17.6603 5V15L9 20L0.339746 15V5L9 0Z"
                  fill="white"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                CRE Compliance Gate
              </h1>
              <p className="text-xs text-gray-400">
                Powered by Chainlink CRE
              </p>
            </div>
          </div>
          <span className="rounded-full border border-gray-700 bg-surface-secondary px-3 py-1 text-xs font-medium text-gray-400">
            Sepolia Testnet
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg">
          <DepositForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/40 py-4 text-center text-xs text-gray-600">
        Built with Chainlink CRE &middot; World ID &middot; OFAC Screening
      </footer>
    </div>
  );
}
