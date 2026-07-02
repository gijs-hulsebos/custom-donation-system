// @ts-nocheck
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import DonationForm from "../src/components/DonationForm";
import { signMessage } from "../src/utils/wallet";
import { WalletState, DonationPayload, PaymentRequirements } from "../src/types";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function Home() {
  const [view, setView] = useState<"landing" | "checkout">("landing");

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
    setLoadingStage("requesting_requirements");
    setLoadingMessage("Fetching secure on-chain x402 payment specifications...");

    try {
      // 1. Send the metadata and amount to get x402 requirements (HTTP 402)
      const initialRes = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (initialRes.status === 402) {
        const requirements: PaymentRequirements = await initialRes.json();

        // 2. Request cryptographic signature from wallet
        setLoadingStage("signing");
        setLoadingMessage(
          `Please authorize the cryptographic verification inside your wallet. Message: "${requirements.messageToSign}"`
        );

        if (!walletState.type) {
          throw new Error("No active wallet connection found.");
        }

        let signature = "";
        try {
          signature = await signMessage(
            requirements.messageToSign,
            walletState.type,
            walletState.publicKey
          );
        } catch (signErr: any) {
          setLoadingStage("error");
          setErrorMessage(signErr.message || "User declined the signature request.");
          return;
        }

        // 3. Retry the request with the signature in the custom X-PAYMENT-SIGNATURE header
        setLoadingStage("settling");
        setLoadingMessage("Validating payload and completing PayAI network settlement...");

        const retryRes = await fetch("/api/donate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT-SIGNATURE": signature,
          },
          body: JSON.stringify({
            ...payload,
            paymentId: requirements.paymentId,
          }),
        });

        const result = await retryRes.json();

        if (retryRes.ok && result.success) {
          setLoadingStage("completed");
        } else {
          throw new Error(result.error || "Failed to settle payment on-chain.");
        }
      } else {
        const errData = await initialRes.json();
        throw new Error(errData.error || `Server responded with status ${initialRes.status}`);
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
                <span>Active On-Chain Gateway</span>
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
                  onClick={() => setView("checkout")}
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 px-6 md:px-8 text-center text-[10px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#07090e]">
        <p>© 2026 The NFT Cat Project. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <span className="text-slate-750">|</span>
          <span className="uppercase text-slate-500 font-bold tracking-widest text-[9px]">
            Secured by PayAI Facilitator Network
          </span>
        </div>
      </footer>
    </div>
  );
}
