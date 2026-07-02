import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WalletState, DonationPayload, PaymentRequirements } from "./types";
import DonationForm from "./components/DonationForm";
import PaymentChallengePortal from "./components/PaymentChallengePortal";
import { registerChallengeHandler, securedFetch } from "./utils/api";
import { ShieldCheck, Heart, ArrowRight } from "lucide-react";

export default function App() {
  // Navigation states: "landing" | "checkout"
  const [view, setView] = useState<"landing" | "checkout">("landing");

  // Live prices with Helius status tracking
  const [solPrice, setSolPrice] = useState<number>(140.0);
  const [heliusUsed, setHeliusUsed] = useState<boolean>(false);
  const [heliusError, setHeliusError] = useState<string>("");
  const [priceSource, setPriceSource] = useState<string>("fallback");

  // Payment challenge states managed via global interceptor
  const [challenge, setChallenge] = useState<PaymentRequirements | null>(null);
  const [resolver, setResolver] = useState<{
    resolve: (val: { signature: string; donorWallet: string }) => void;
    reject: (err: string) => void;
  } | null>(null);

  const fetchLivePrices = async () => {
    try {
      const res = await fetch("/api/prices");
      if (res.ok) {
        const data = await res.json();
        if (data.SOL && typeof data.SOL === "number") {
          setSolPrice(data.SOL);
          setHeliusUsed(!!data.heliusUsed);
          setHeliusError(data.heliusError || "");
          setPriceSource(data.source || "fallback");
          console.log("[Live Price Sync] Updated SOL price to:", data.SOL, "Source:", data.source, "Helius:", data.heliusUsed, "Error:", data.heliusError);
        }
      }
    } catch (err) {
      console.error("[Live Price Sync Error]:", err);
    }
  };

  // Mount the global interceptor and register challenge resolver on startup
  useEffect(() => {
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 30000);

    registerChallengeHandler((requirements) => {
      return new Promise<{ signature: string; donorWallet: string }>((resolve, reject) => {
        setChallenge(requirements);
        setResolver({ resolve, reject });
      });
    });

    return () => clearInterval(interval);
  }, []);

  const [walletState, setWalletState] = useState<WalletState>({
    publicKey: null,
    connected: false,
    type: null,
    connecting: false,
  });

  const [loadingStage, setLoadingStage] = useState<
    "idle" | "requesting_requirements" | "signing" | "settling" | "completed" | "error"
  >("idle");
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleWalletChange = (newState: WalletState) => {
    setWalletState(newState);
    setLoadingStage("idle");
    setErrorMessage(null);
  };

  const handleDonationSubmit = async (payload: DonationPayload) => {
    setErrorMessage(null);
    setLoadingStage("settling");
    setLoadingMessage("Initiating secure on-chain donation access request...");

    try {
      // The first POST doesn't contain a wallet signature or donorWallet.
      // The global Fetch interceptor will catch the 402 Payment Required status code,
      // pause execution, pop up the stateless Wallet Portal, prompt the signature,
      // and automatically retry the POST request with the signatures attached, returning the final result transparently!
      const res = await securedFetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setLoadingStage("completed");
      } else {
        throw new Error(result.error || "Failed to settle payment on-chain.");
      }
    } catch (err: any) {
      setLoadingStage("error");
      setErrorMessage(err.message || "An unexpected error occurred during the transaction.");
    }
  };

  const handleReset = () => {
    setLoadingStage("idle");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top clean minimal navigation */}
      <header className="w-full border-b border-slate-900 bg-[#07090e]/80 backdrop-blur-md py-4 px-6 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐈</span>
          <span className="font-bold text-sm tracking-wider text-white font-mono">theNFTcat</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <ShieldCheck size={14} className="text-blue-500" />
          <span className="hidden sm:inline">Verified System Terminal</span>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-12 flex flex-col justify-center items-center">
        <AnimatePresence mode="wait">
          {view === "landing" ? (
            /* PAGE 1: DEEP LANDING & SIMPLE DONATE NOW */
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-2xl text-center space-y-8"
            >
              {/* Discrete indicator badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Active On-Chain Contribution Gateway</span>
              </div>

              {/* Title & Slogan */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                  Support the <span className="text-blue-500">NFT Cat</span> Ecosystem
                </h1>
                <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-lg mx-auto">
                  Directly empower decentralized feline art, creative on-chain milestones, and community-led meme assets built securely on Solana.
                </p>
              </div>

              {/* Primary Interactive Trigger */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => {
                    fetchLivePrices();
                    setView("checkout");
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm tracking-wide transition-all shadow-lg shadow-blue-900/10 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Donate now</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              {/* Minimal Trust Features */}
              <div className="grid grid-cols-3 gap-4 pt-10 border-t border-slate-900 max-w-md mx-auto text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-black block">Security</span>
                  <p className="text-[11px] text-slate-400 font-mono leading-tight">x402 Verified</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-black block">Settlement</span>
                  <p className="text-[11px] text-slate-400 font-mono leading-tight">PayAI Gateway</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-black block">Network</span>
                  <p className="text-[11px] text-slate-400 font-mono leading-tight">Solana High-Speed</p>
                </div>
              </div>
            </motion.div>
          ) : (
            /* PAGES 2 & 3: STRIPE-STYLE CHECKOUT INTERFACE */
            <motion.div
              key="checkout"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <DonationForm
                walletState={walletState}
                onWalletChange={handleWalletChange}
                onSubmit={handleDonationSubmit}
                loadingStage={loadingStage}
                loadingMessage={loadingMessage}
                errorMessage={errorMessage}
                onReset={handleReset}
                onGoBackToLanding={() => setView("landing")}
                solPrice={solPrice}
                heliusUsed={heliusUsed}
                heliusError={heliusError}
                priceSource={priceSource}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <PaymentChallengePortal
        isOpen={challenge !== null}
        onClose={() => {
          if (resolver) {
            resolver.reject("Payment challenge canceled by user.");
          }
          setChallenge(null);
          setResolver(null);
          setLoadingStage("idle");
        }}
        requirements={challenge || { paymentId: "", messageToSign: "", receiver: "", amount: 0, currency: "SOL" }}
        onSuccess={(signature, donorWallet) => {
          if (resolver) {
            resolver.resolve({ signature, donorWallet });
          }
          setChallenge(null);
          setResolver(null);
        }}
        onFailure={(err) => {
          if (resolver) {
            resolver.reject(err);
          }
          setChallenge(null);
          setResolver(null);
        }}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 px-6 md:px-8 text-center text-[10px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#07090e]">
        <p>© 2026 The NFT Cat Project. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <span className="text-slate-700">|</span>
          <span className="uppercase text-slate-500 font-bold tracking-widest text-[9px]">
            Secured by PayAI Facilitator Network
          </span>
        </div>
      </footer>
    </div>
  );
}
