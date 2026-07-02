import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  X, 
  Coins, 
  ArrowUpRight,
  Info,
  Loader2,
  Clock,
  Sparkles
} from "lucide-react";
import { PaymentRequirements, WalletState } from "../types";
import { handleX402Challenge } from "../utils/wallet";

interface PaymentChallengePortalProps {
  isOpen: boolean;
  onClose: () => void;
  requirements: PaymentRequirements;
  onSuccess: (signature: string, donorWallet: string) => void;
  onFailure: (error: string) => void;
}

export default function PaymentChallengePortal({
  isOpen,
  onClose,
  requirements,
  onSuccess,
  onFailure,
}: PaymentChallengePortalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [portalError, setPortalError] = useState<string | null>(null);

  // Programmatically resolve active Solana provider to achieve "There should be no wallet connection UI or manual connect options"
  const getActiveSolanaProviderDetails = () => {
    if (typeof window === "undefined") {
      return { id: "playground", name: "Solana Sandbox Simulator", icon: "🐈" };
    }
    
    // Explicitly scan for Solana providers, bypassing EVM/MetaMask
    if (window.phantom?.solana || window.solana?.isPhantom) {
      return { id: "phantom", name: "Phantom Wallet (Injected)", icon: "👻" };
    }
    if (window.solflare) {
      return { id: "solflare", name: "Solflare Wallet (Injected)", icon: "🔥" };
    }
    if (window.backpack) {
      return { id: "backpack", name: "Backpack (Injected)", icon: "🎒" };
    }
    if (window.solana && !window.solana.isMetaMask) {
      return { id: "solana", name: "Injected Solana Wallet", icon: "⚡" };
    }
    
    // Always fall back to the secure playground sandbox simulator for AI Studio preview
    return { id: "playground", name: "Solana Sandbox Simulator", icon: "🐈" };
  };

  const activeProvider = getActiveSolanaProviderDetails();

  const handleSignAndPay = async () => {
    setPortalError(null);
    setLoading(true);
    setLoadingMessage("Authorizing and securing on-chain transaction...");

    try {
      // Step A: Use handleX402Challenge to isolate EVM, connect to the correct Solana wallet and sign the payload
      setLoadingMessage(`Initiating secure handshake via ${activeProvider.name}...`);
      const { signature, donorWallet, headerValue } = await handleX402Challenge(requirements, activeProvider.id);
      
      // Step B: Trigger success callback passing the true mapped x402 headerValue
      setLoading(false);
      onSuccess(headerValue, donorWallet);
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.message || "User declined the secure signature request.";
      setPortalError(errMsg);
      onFailure(errMsg);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 6)}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        {/* Ambient Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Challenge Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-[#07090e] border border-slate-800/90 rounded-2xl p-6 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)] z-10 overflow-hidden ring-1 ring-white/[0.04]"
        >
          {/* Subtle background gradients */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/[0.07] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-600/[0.04] rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-100 font-mono tracking-widest uppercase flex items-center gap-1.5">
                  <span>x402 Payment Challenge</span>
                  <span className="bg-blue-500/15 text-blue-400 text-[8px] px-1.5 py-0.5 rounded-full border border-blue-500/20">Active</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Off-Chain Verification & Settlement</p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Terms block (Not a login screen, pure payment specifications) */}
          <div className="mt-5 bg-[#0a0c12] border border-slate-800/85 rounded-xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Contribution Access Code</span>
              <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                {requirements.paymentId}
              </span>
            </div>

            {/* Large Payment Value display */}
            <div className="text-center py-4 border-y border-slate-800/50">
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Required Settlement Value</p>
              <div className="flex items-center justify-center gap-1.5">
                <Coins className="text-blue-500" size={20} />
                <span className="text-3xl font-black text-white font-mono tracking-tight">
                  {requirements.amount}
                </span>
                <span className="text-base font-black text-blue-400 font-mono">
                  {requirements.currency}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-2 flex items-center justify-center gap-1">
                <Clock size={11} />
                <span>Expires in 10 minutes • Secured via PayAI Facilitator</span>
              </p>
            </div>

            {/* Payee Info */}
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Target Payee</span>
                <span className="text-slate-200 truncate max-w-[200px]" title={requirements.receiver}>
                  {formatAddress(requirements.receiver)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Network Layer</span>
                <span className="text-slate-200">Solana Ledger (Mainnet/Devnet)</span>
              </div>
            </div>
          </div>

          {/* Resolved Settlement Engine row (Stateless, on-the-fly, no manual selections) */}
          <div className="mt-5 space-y-2.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Resolved Settlement Provider
            </label>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-600/5 border border-blue-500/15">
              <div className="flex items-center gap-3">
                <span className="text-xl">{activeProvider.icon}</span>
                <div>
                  <span className="text-xs font-bold text-slate-100 font-mono block">
                    {activeProvider.name}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                    Isolating EVM pollution • Direct Solana challenge channel
                  </span>
                </div>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
          </div>

          {/* Feedback/Error messages */}
          {portalError && (
            <div className="mt-4 p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] font-mono rounded-lg flex items-start gap-2 leading-relaxed">
              <span className="text-xs shrink-0">⚠️</span>
              <span>{portalError}</span>
            </div>
          )}

          {/* Action Trigger */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col gap-3">
            <button
              onClick={handleSignAndPay}
              disabled={loading}
              type="button"
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-850 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold font-mono text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-900/15 active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer border border-blue-500/30"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Processing Handshake...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-blue-200" />
                  <span>Sign & Pay {requirements.amount} {requirements.currency}</span>
                  <ArrowUpRight size={14} />
                </>
              )}
            </button>

            {loading && (
              <p className="text-[9px] text-center font-mono text-slate-400 animate-pulse">
                {loadingMessage}
              </p>
            )}

            <div className="p-3 bg-blue-950/10 border border-blue-900/15 rounded-xl flex gap-2.5 text-[9px] text-slate-400 leading-normal font-mono">
              <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
              <span>
                This is a stateless payment challenge. Your wallet will only be prompted to authorize this specific transaction. No persistent login session will be established.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
