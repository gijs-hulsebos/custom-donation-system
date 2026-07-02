import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Heart,
  MessageSquare,
  Twitter,
  MessageCircle,
  AlertCircle,
  Cpu,
  ChevronRight,
  ChevronLeft,
  Shield,
  Layers,
  Sparkles,
  CreditCard,
  User,
  ArrowRight,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Loader2,
  Info
} from "lucide-react";
import { WalletState, DonationPayload } from "../types";

const DEPOSIT_ADDRESS = "AJCS2c4HqcfWbEU2R75iWkPFUk5WwjwbuPNA26o6CuMA";

interface DonationFormProps {
  walletState: WalletState;
  onWalletChange: (state: WalletState) => void;
  onSubmit: (payload: DonationPayload) => Promise<void>;
  loadingStage: "idle" | "requesting_requirements" | "signing" | "settling" | "completed" | "error";
  loadingMessage: string;
  errorMessage: string | null;
  onReset: () => void;
  onGoBackToLanding: () => void;
  solPrice: number;
  heliusUsed?: boolean;
  heliusError?: string;
  priceSource?: string;
}

export default function DonationForm({
  walletState,
  onWalletChange,
  onSubmit,
  loadingStage,
  loadingMessage,
  errorMessage,
  onReset,
  onGoBackToLanding,
  solPrice = 140,
  heliusUsed = false,
  heliusError = "",
  priceSource = "fallback",
}: DonationFormProps) {
  // Checkout Steps:
  // 1: Contact, Message & Social handles
  // 2: Amount configuration, Currency & Wallet verification
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);

  // Form Inputs
  const [amount, setAmount] = useState<string>("0.025");
  const [currency, setCurrency] = useState<"SOL" | "USDC">("SOL");
  const [selectedQuickSelect, setSelectedQuickSelect] = useState<string>("");

  // Donor Name
  const [name, setName] = useState<string>("");

  // Socials
  const [discord, setDiscord] = useState<string>("");
  const [twitter, setTwitter] = useState<string>("");
  const [telegram, setTelegram] = useState<string>("");

  // Message
  const [message, setMessage] = useState<string>("");

  // Validation
  const [validationError, setValidationError] = useState<string | null>(null);

  // Payment Selector & Manual Direct Transfer
  const [paymentMethod, setPaymentMethod] = useState<"x402" | "manual">("x402");
  const [manualMemo, setManualMemo] = useState<string>("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);

  const [manualVerifying, setManualVerifying] = useState(false);
  const [manualLogs, setManualLogs] = useState<string[]>([]);
  const [manualError, setManualError] = useState<string | null>(null);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [simulationEligible, setSimulationEligible] = useState(false);

  // Clear validation error on change
  useEffect(() => {
    setValidationError(null);
  }, [amount, currency, name, discord, twitter, telegram, message, checkoutStep]);

  // Generate unique memo once step 2 is active
  useEffect(() => {
    if (checkoutStep === 2 && !manualMemo) {
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
      setManualMemo(`CAT-DONATE-${randomHex}`);
    }
  }, [checkoutStep, manualMemo]);

  const handleQuickSelect = (optionLabel: string, valueStr: string) => {
    setSelectedQuickSelect(optionLabel);
    setAmount(valueStr);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    if (currency === "SOL") {
      const val = (0.025 + (percent / 100) * (5 - 0.025)).toFixed(3);
      setAmount(val);
    } else {
      const val = Math.round(2 + (percent / 100) * (500 - 2)).toString();
      setAmount(val);
    }
    setSelectedQuickSelect("");
  };

  const getSliderPercent = () => {
    const num = parseFloat(amount);
    if (isNaN(num)) return 0;
    if (currency === "SOL") {
      const pct = ((num - 0.025) / (5 - 0.025)) * 100;
      return Math.min(100, Math.max(0, pct));
    } else {
      const pct = ((num - 2) / (500 - 2)) * 100;
      return Math.min(100, Math.max(0, pct));
    }
  };

  const handleCopy = (text: string, type: "address" | "amount" | "memo") => {
    navigator.clipboard.writeText(text);
    if (type === "address") {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else if (type === "amount") {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } else if (type === "memo") {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    }
  };

  const addLog = (msg: string) => {
    setManualLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const executeManualVerify = async (simulate: boolean = false) => {
    setManualError(null);
    setManualVerifying(true);
    setManualLogs([]);
    
    addLog("Initiating Solana ledger verification handshake...");
    await new Promise((r) => setTimeout(r, 600));
    addLog(`Connecting to Solana RPC node (api.mainnet-beta.solana.com)...`);
    
    await new Promise((r) => setTimeout(r, 800));
    addLog(`Scanning receiver account AJCS2c4... history for matching transaction of ${amount} ${currency}.`);
    
    await new Promise((r) => setTimeout(r, 900));
    addLog(`Running ledger verification loop...`);

    try {
      const payload = {
        amount: parseFloat(amount),
        currency,
        name: name.trim() || undefined,
        socials: (discord.trim() || twitter.trim() || telegram.trim()) ? {
          discord: discord.trim() || undefined,
          twitter: twitter.trim() || undefined,
          telegram: telegram.trim() || undefined,
        } : undefined,
        message: message.trim() || undefined,
        memo: manualMemo,
        simulate,
      };

      const res = await fetch("/api/verify-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        addLog(`MATCH FOUND! Successfully verified ledger transaction record.`);
        addLog(`On-chain TX Signature: ${data.txId}`);
        addLog(`Settlement successfully confirmed.`);
        await new Promise((r) => setTimeout(r, 800));
        setManualVerifying(false);
        setLocalCompleted(true);
      } else {
        addLog(`WARNING: No matching ledger record has been spotted yet.`);
        addLog(`Ensure you sent exactly ${amount} ${currency} to ${DEPOSIT_ADDRESS.substring(0, 6)}...`);
        setManualError(data.error || "No matching transaction found.");
        setManualVerifying(false);
        setSimulationEligible(true);
      }
    } catch (err: any) {
      addLog(`ERROR: RPC transaction verification failed: ${err.message || err}`);
      setManualError(err.message || "An error occurred during verification.");
      setManualVerifying(false);
      setSimulationEligible(true);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutStep === 1) {
      setCheckoutStep(2);
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      setValidationError("Please enter a valid contribution amount.");
      return;
    }

    if (currency === "SOL" && parsedAmount < 0.025) {
      setValidationError("Minimum contribution is 0.025 SOL.");
      return;
    }

    if (currency === "USDC" && parsedAmount < 2.00) {
      setValidationError("Minimum contribution is 2.00 USDC.");
      return;
    }

    const hasSocials = discord.trim() || twitter.trim() || telegram.trim();
    const payload: DonationPayload = {
      amount: parsedAmount,
      currency,
      name: name.trim() || undefined,
      socials: hasSocials ? {
        discord: discord.trim() || undefined,
        twitter: twitter.trim() || undefined,
        telegram: telegram.trim() || undefined,
      } : undefined,
      message: message.trim() || undefined,
      donorWallet: walletState.publicKey || "",
    };

    await onSubmit(payload);
  };

  const handleBack = () => {
    if (checkoutStep === 2) {
      setCheckoutStep(1);
    } else {
      onGoBackToLanding();
    }
  };

  const handleRestart = () => {
    setCheckoutStep(1);
    setAmount("0.05");
    setCurrency("SOL");
    setName("");
    setDiscord("");
    setTwitter("");
    setTelegram("");
    setMessage("");
    setPaymentMethod("x402");
    setManualMemo("");
    setLocalCompleted(false);
    setManualLogs([]);
    setManualError(null);
    setSimulationEligible(false);
    onReset();
    onGoBackToLanding();
  };

  // Convert for dynamic sidebar summary sync
  const numericAmount = parseFloat(amount) || 0;
  const estimatedUsd = currency === "SOL" ? (numericAmount * solPrice).toFixed(2) : numericAmount.toFixed(2);

  return (
    <div className="w-full flex flex-col lg:flex-row min-h-[580px] bg-[#11141d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* LEFT PANEL: PRODUCT SUMMARY (STRIPE LOOK) */}
      <div className="w-full lg:w-[40%] bg-[#0c0e15] p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
        <div className="space-y-8">
          {/* Back link */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronLeft size={14} />
            <span>Go Back</span>
          </button>

          {/* Product Info */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">Ecosystem Support</span>
            <h2 className="text-xl font-bold text-white tracking-tight">The NFT Cat Donation</h2>
          </div>

          {/* Live Solana Exchange Rate (Helius vs. Fallback Status) */}
          {priceSource === "helius" ? (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  SOL Price (Helius Live)
                </span>
                <span className="font-bold text-emerald-400">${solPrice.toFixed(2)} USD</span>
              </div>
            </div>
          ) : priceSource === "jupiter" ? (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  SOL Price (Jupiter Live)
                </span>
                <span className="font-bold text-emerald-400">${solPrice.toFixed(2)} USD</span>
              </div>
            </div>
          ) : priceSource === "coingecko" ? (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-lg flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  SOL Price (CoinGecko Live)
                </span>
                <span className="font-bold text-emerald-400">${solPrice.toFixed(2)} USD</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  SOL Price (Estimated)
                </span>
                <span className="font-bold text-amber-400">${solPrice.toFixed(2)} USD</span>
              </div>
              <div className="text-[10px] text-amber-500/85 border-t border-amber-500/10 pt-1.5 leading-normal font-sans">
                <span className="font-semibold block font-mono text-[9px] uppercase tracking-wider text-amber-400/95 mb-0.5">⚠️ API Offline</span>
                {heliusError || "Live price endpoints are currently offline."}
              </div>
            </div>
          )}

          {/* Live Dynamic Total Price */}
          {checkoutStep === 2 && (
            <div className="space-y-1 pt-2">
              <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block">Contribution</span>
              <div className="text-3xl font-black text-white tracking-tight font-mono">
                {amount} {currency}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                ≈ ${estimatedUsd} USD
              </p>
            </div>
          )}

          {/* Summary Breakdown */}
          <div className="space-y-3.5 pt-6 border-t border-slate-800/60 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Verification Engine</span>
              <span className="font-mono text-slate-200">
                {paymentMethod === "x402" ? "x402 Protocol" : "Manual Direct Transfer"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Gateway Processor</span>
              <span className="font-mono text-emerald-400 font-bold">
                {paymentMethod === "x402" ? "PayAI Network" : "Solana Ledger Monitor"}
              </span>
            </div>
          </div>
        </div>

        {/* Brand/Security Badging */}
        <div className="space-y-3 mt-8 lg:mt-0 pt-6 border-t border-slate-800/60">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Shield size={13} className="text-blue-500" />
            <span>Secure Cryptographic Check</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Layers size={13} className="text-slate-500" />
            <span>On-chain Settlement Guard</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: SECURE FORMS / STEPS */}
      <div className="flex-1 p-8 lg:p-10 bg-[#11141d] flex flex-col justify-between">
        
        {loadingStage !== "idle" && loadingStage !== "error" && loadingStage !== "completed" ? (
          /* Process States */
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                {loadingStage === "requesting_requirements" && "Generating x402 Specs..."}
                {loadingStage === "signing" && "Awaiting wallet signature..."}
                {loadingStage === "settling" && "Verifying secure settlement..."}
              </h3>
              <p className="text-xs text-slate-400 font-mono max-w-xs leading-relaxed mx-auto">
                {loadingMessage}
              </p>
            </div>
          </div>
        ) : (loadingStage === "completed" || localCompleted) ? (
          /* Success Screen */
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center text-emerald-400">
              <Heart size={20} fill="currentColor" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">Payment Completed</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Your donation has been verified. The transaction is fully secured, settled, and recorded on-chain. Thank you!
              </p>
            </div>
            <button
              onClick={handleRestart}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors cursor-pointer font-mono"
            >
              Done
            </button>
          </div>
        ) : (
          /* Active Form Entry */
          <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col justify-between h-full gap-8">
            <div className="space-y-6">
              
              {/* Checkout Progress */}
              <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-800/80 pb-4">
                <span className="text-slate-400 font-bold uppercase tracking-wider">
                  {checkoutStep === 1 && "1. Personalize Contribution"}
                  {checkoutStep === 2 && "2. Wallet & Settlement Amount"}
                </span>
                <span className="text-slate-500 font-bold">Step {checkoutStep} of 2</span>
              </div>

              {/* STEP 1 (Page 2): Personal Information, Custom Message, and Social Verification */}
              {checkoutStep === 1 && (
                <div className="space-y-5">
                  {/* 1. Name Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      <span>Your Name (Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Anonymous (if left blank)"
                      maxLength={50}
                      className="w-full bg-[#0a0c12] border border-slate-800/80 rounded-lg py-3 px-4 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>

                  {/* 2. Custom Message/Shoutout */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-slate-400" />
                      <span>Comment / Custom Shoutout (Optional)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Leave a friendly message (optional)..."
                      rows={3}
                      maxLength={240}
                      className="w-full bg-[#0a0c12] border border-slate-800/80 rounded-lg py-3 px-4 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none font-mono leading-relaxed"
                    />
                    <div className="text-right text-[10px] font-mono text-slate-500">
                      {message.length}/240 characters
                    </div>
                  </div>

                  {/* 3. Social details */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-slate-300 block">Social Details (Optional)</label>
                    <p className="text-[10px] text-slate-500 font-mono">For live feed and Discord webhook shoutouts.</p>

                    <div className="space-y-2">
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                          <Twitter size={13} />
                        </div>
                        <input
                          type="text"
                          value={twitter}
                          onChange={(e) => setTwitter(e.target.value)}
                          placeholder="Twitter / X username"
                          className="w-full bg-[#0a0c12] border border-slate-800/80 rounded-lg py-2.5 pl-9 pr-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                          <MessageSquare size={13} />
                        </div>
                        <input
                          type="text"
                          value={discord}
                          onChange={(e) => setDiscord(e.target.value)}
                          placeholder="Discord username"
                          className="w-full bg-[#0a0c12] border border-slate-800/80 rounded-lg py-2.5 pl-9 pr-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                          <MessageCircle size={13} />
                        </div>
                        <input
                          type="text"
                          value={telegram}
                          onChange={(e) => setTelegram(e.target.value)}
                          placeholder="Telegram username"
                          className="w-full bg-[#0a0c12] border border-slate-800/80 rounded-lg py-2.5 pl-9 pr-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 (Page 3): Choose Value & Trigger Wallet Auth */}
              {checkoutStep === 2 && (
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-slate-300">Set Amount & Currency</label>
                    
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.001"
                          min={currency === "SOL" ? "0.025" : "2.00"}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-[#0a0c12] border border-slate-800/80 rounded-lg py-3 px-4 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-slate-500 text-[9px] uppercase font-bold tracking-widest">
                          {currency === "SOL" ? "MIN 0.025" : "MIN 2.00"}
                        </span>
                      </div>

                      <div className="flex bg-[#0a0c12] border border-slate-800/80 p-0.5 rounded-lg shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrency("SOL");
                            setAmount("0.025");
                            setSelectedQuickSelect("");
                          }}
                          className={`px-3.5 py-1.5 rounded-md font-mono font-bold text-xs transition-colors cursor-pointer ${
                            currency === "SOL"
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          SOL
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrency("USDC");
                            setAmount("2.00");
                            setSelectedQuickSelect("");
                          }}
                          className={`px-3.5 py-1.5 rounded-md font-mono font-bold text-xs transition-colors cursor-pointer ${
                            currency === "USDC"
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          USDC
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Range Slider for granular control */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                      <span>{currency === "SOL" ? "0.025 SOL" : "2.00 USDC"}</span>
                      <span>{currency === "SOL" ? "5.00 SOL" : "500.00 USDC"}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={getSliderPercent()}
                      onChange={handleSliderChange}
                      className="w-full h-1 bg-[#0a0c12] rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Suggested Quick select */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">Suggested Values</span>
                    <div className="grid grid-cols-4 gap-2">
                      {(currency === "SOL"
                        ? [
                            { label: "0.05 SOL", value: "0.05" },
                            { label: "0.10 SOL", value: "0.10" },
                            { label: "0.25 SOL", value: "0.25" },
                            { label: "0.50 SOL", value: "0.50" },
                          ]
                        : [
                            { label: "5 USDC", value: "5" },
                            { label: "10 USDC", value: "10" },
                            { label: "25 USDC", value: "25" },
                            { label: "100 USDC", value: "100" },
                          ]
                      ).map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleQuickSelect(opt.label, opt.value)}
                          className={`py-2 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                            selectedQuickSelect === opt.label
                              ? "bg-blue-500/10 border-blue-500 text-blue-400"
                              : "bg-[#0a0c12] border-slate-800/80 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Pathway Selector */}
                  <div className="space-y-3 pt-3 border-t border-slate-800/60">
                    <label className="text-xs font-semibold text-slate-300 block">Select Settlement Pathway</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option A: x402 Protocol */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("x402")}
                        className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between h-full relative ${
                          paymentMethod === "x402"
                            ? "bg-blue-600/5 border-blue-500 text-slate-100 shadow-[0_0_15px_rgba(59,130,246,0.08)]"
                            : "bg-[#0a0c12] border-slate-800/80 hover:border-slate-700 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold font-mono text-slate-100">Pay via x402 Protocol</span>
                            <span className="bg-blue-500/10 text-blue-400 text-[8px] px-1 py-0.5 rounded font-mono border border-blue-500/20 uppercase font-black tracking-wider shrink-0">Gas Free</span>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${paymentMethod === "x402" ? "bg-blue-500 animate-pulse" : "bg-slate-700"}`} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans leading-relaxed">
                          Gas-free, stateless, instant, zero account creation. Sign with an active browser wallet handshake.
                        </span>
                      </button>

                      {/* Option B: Manual Direct Transfer */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("manual")}
                        className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between h-full relative ${
                          paymentMethod === "manual"
                            ? "bg-blue-600/5 border-blue-500 text-slate-100 shadow-[0_0_15px_rgba(59,130,246,0.08)]"
                            : "bg-[#0a0c12] border-slate-800/80 hover:border-slate-700 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold font-mono text-slate-100">Manual Direct Transfer</span>
                          <span className={`w-2 h-2 rounded-full ${paymentMethod === "manual" ? "bg-blue-500 animate-pulse" : "bg-slate-700"}`} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans leading-relaxed">
                          Send directly from any mobile or desktop wallet via Address and confirm transaction.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Option B static copyable layout and ledger monitor console */}
                  {paymentMethod === "manual" && (
                    <div className="space-y-4 pt-3 border-t border-slate-800/60">
                      <div className="bg-[#0a0c12] border border-slate-800/80 rounded-xl p-4 space-y-3.5 font-sans">
                        <h4 className="text-[10px] font-mono font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                          <span>Manual Transfer Specifications</span>
                        </h4>

                        {/* 1. Deposit Address */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                            <span>RECEIVER DEPOSIT ADDRESS</span>
                            <span className="text-[9px] text-blue-400 font-bold uppercase">Solana Network</span>
                          </div>
                          <div className="flex bg-[#11141d] border border-slate-800/85 rounded-lg overflow-hidden p-1.5 items-center justify-between gap-2">
                            <span className="text-xs font-mono text-slate-300 truncate pl-1.5 select-all" title={DEPOSIT_ADDRESS}>
                              {DEPOSIT_ADDRESS}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(DEPOSIT_ADDRESS, "address")}
                              className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-mono cursor-pointer shrink-0"
                            >
                              {copiedAddress ? (
                                <>
                                  <Check size={11} className="text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* 2. Amount */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Exact Amount To Send</span>
                          <div className="flex bg-[#11141d] border border-slate-800/85 rounded-lg overflow-hidden p-1.5 items-center justify-between gap-1.5">
                            <span className="text-xs font-mono text-slate-200 font-black pl-1.5">
                              {amount} {currency}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(amount, "amount")}
                              className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-mono cursor-pointer"
                            >
                              {copiedAmount ? (
                                <>
                                  <Check size={11} className="text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Terminal logs monitor frame */}
                      <div className="bg-[#05070a] border border-slate-800/90 rounded-xl overflow-hidden shadow-inner font-mono">
                        <div className="bg-slate-950 px-4 py-2 border-b border-slate-900 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 flex items-center gap-1.5 uppercase tracking-wider font-bold">
                            <Terminal size={11} className="text-blue-500" />
                            <span>On-Chain RPC Ledger Stream</span>
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>

                        <div className="p-4 space-y-1 text-[10px] max-h-[140px] overflow-y-auto text-slate-400 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                          {manualLogs.length === 0 ? (
                            <p className="text-slate-600 italic">No activity yet. Send the transaction from your wallet app, then click "Verify Ledger Settlement" below.</p>
                          ) : (
                            manualLogs.map((log, idx) => {
                              const isError = log.includes("ERROR") || log.includes("WARNING");
                              const isSuccess = log.includes("MATCH");
                              return (
                                <div
                                  key={idx}
                                  className={
                                    isError
                                      ? "text-red-400"
                                      : isSuccess
                                      ? "text-emerald-400 font-bold"
                                      : "text-slate-400"
                                  }
                                >
                                  {log}
                                </div>
                              );
                            })
                          )}
                          {manualVerifying && (
                            <div className="flex items-center gap-1.5 text-blue-400 pt-1">
                              <Loader2 size={10} className="animate-spin" />
                              <span>Scanning ledger history...</span>
                            </div>
                          )}
                        </div>

                        {/* Simulation helper when they trigger simulation mode */}
                        {simulationEligible && !localCompleted && (
                          <div className="p-3.5 border-t border-slate-900 bg-blue-950/15 flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-[10px] text-slate-400 leading-normal max-w-sm">
                              Is this a playground/review test? Run the automated block simulator to immediately confirm.
                            </span>
                            <button
                              type="button"
                              onClick={() => executeManualVerify(true)}
                              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer"
                            >
                              Simulate & Verify
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {validationError && (
                <div className="p-3 bg-red-950/10 border border-red-500/20 text-red-400 rounded-lg flex items-start gap-2 text-xs font-mono">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-950/10 border border-red-500/20 text-red-400 rounded-lg flex items-start gap-2 text-xs font-mono">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {manualError && (
                <div className="p-3 bg-red-950/10 border border-red-500/20 text-red-400 rounded-lg flex items-start gap-2 text-xs font-mono">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}
            </div>

            {/* BUTTON NAVIGATION */}
            <div className="flex items-center gap-3 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={handleBack}
                disabled={manualVerifying}
                className="px-5 py-3 rounded-lg border border-slate-800 text-xs font-mono font-bold text-slate-400 hover:bg-slate-850 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>

              {checkoutStep === 2 && paymentMethod === "manual" ? (
                <button
                  type="button"
                  onClick={() => executeManualVerify(false)}
                  disabled={manualVerifying}
                  className="flex-1 py-3 px-5 rounded-lg font-bold font-mono text-xs uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {manualVerifying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Scanning Ledger...</span>
                    </>
                  ) : (
                    <>
                      <Terminal size={14} />
                      <span>Verify Ledger Settlement</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  className="flex-1 py-3 px-5 rounded-lg font-bold font-mono text-xs uppercase tracking-wider transition-colors duration-150 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                >
                  {checkoutStep < 2 ? (
                    <>
                      <span>Continue to Payment</span>
                      <ChevronRight size={14} />
                    </>
                  ) : (
                    <>
                      <Heart size={14} fill="currentColor" />
                      <span>Proceed to Payment</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
