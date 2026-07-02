import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wallet, 
  LogOut, 
  ChevronDown, 
  Award, 
  X, 
  Info, 
  Download,
  AlertCircle,
  Search
} from "lucide-react";
import { WalletState } from "../types";
import {
  DetectedWallet,
  detectInjectedWallets,
  connectWallet,
  getProviderForWallet,
  getPlaygroundPublicKey,
} from "../utils/wallet";

interface WalletConnectButtonProps {
  walletState: WalletState;
  onWalletChange: (state: WalletState) => void;
}

export default function WalletConnectButton({
  walletState,
  onWalletChange,
}: WalletConnectButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // List of detected/available wallets
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);

  // Scan wallets periodically to handle late injections or newly opened wallets
  useEffect(() => {
    const scan = () => {
      const detected = detectInjectedWallets();
      setWallets(detected);
    };

    scan();
    const interval = setInterval(scan, 1500);
    return () => clearInterval(interval);
  }, []);

  // Eager preloading & session restoration on mount
  useEffect(() => {
    const autoPreload = async () => {
      const savedType = localStorage.getItem("nft_cat_connected_wallet_type");
      if (!savedType) return;

      if (savedType === "playground") {
        try {
          const pk = await getPlaygroundPublicKey();
          onWalletChange({
            publicKey: pk,
            connected: true,
            type: "playground",
            connecting: false,
          });
        } catch (e) {
          console.log("[Wallet Preload] Sandbox auto-connect skipped.");
        }
        return;
      }

      // Restore active injected extension session
      const provider = getProviderForWallet(savedType);
      if (provider) {
        try {
          // Attempt eager connect (handshake check only if already trusted)
          const resp = await provider.connect({ onlyIfTrusted: true });
          const pubKey = resp?.publicKey || provider.publicKey || resp;
          if (pubKey) {
            onWalletChange({
              publicKey: pubKey.toString(),
              connected: true,
              type: savedType,
              connecting: false,
            });
          }
        } catch (e) {
          console.log(`[Wallet Preload] ${savedType} eager auto-connect skipped or untrusted.`);
        }
      }
    };

    const timer = setTimeout(autoPreload, 300);
    return () => clearTimeout(timer);
  }, [onWalletChange]);

  const handleConnect = async (type: string) => {
    setError(null);
    onWalletChange({ ...walletState, connecting: true });

    try {
      const publicKey = await connectWallet(type);
      onWalletChange({
        publicKey,
        connected: true,
        type,
        connecting: false,
      });
      localStorage.setItem("nft_cat_connected_wallet_type", type);
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || `Failed to authorize connection with ${type}.`);
      onWalletChange({ ...walletState, connecting: false });
    }
  };

  const handleDisconnect = () => {
    onWalletChange({
      publicKey: null,
      connected: false,
      type: null,
      connecting: false,
    });
    localStorage.removeItem("nft_cat_connected_wallet_type");
    setError(null);
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 6)}`;
  };

  // Split scanned wallets
  const installedWallets = wallets.filter((w) => w.isInstalled);
  const uninstalledWallets = wallets.filter((w) => !w.isInstalled && w.downloadUrl);

  const activeWalletObj = wallets.find(w => w.id === walletState.type);

  // Filtered lists based on search
  const filteredInstalled = installedWallets.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredUninstalled = uninstalledWallets.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full" id="wallet-selector-root">
      {walletState.connected ? (
        /* 1. CONNECTED STATE UI */
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl shadow-xl w-full">
          <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <span className="text-base">{activeWalletObj?.icon || "🐈"}</span>
            </div>
            <div className="text-left truncate">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {walletState.type === "playground" ? (
                  <span className="text-yellow-400 font-bold flex items-center gap-1">
                    <Award size={10} /> DEMO PLAYGROUND
                  </span>
                ) : (
                  <span className="capitalize text-slate-300 font-bold">
                    {activeWalletObj?.name || walletState.type} Active
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-100 font-mono truncate tracking-wide mt-0.5">
                {formatAddress(walletState.publicKey)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsModalOpen(true)}
              type="button"
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-[10px] font-mono transition duration-200 cursor-pointer flex-1 sm:flex-initial"
            >
              Change
            </button>
            <button
              onClick={handleDisconnect}
              type="button"
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700/80 hover:border-red-500/30 text-[10px] font-mono transition duration-200 cursor-pointer flex-1 sm:flex-initial"
            >
              <LogOut size={12} />
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        /* 2. DISCONNECTED STATE UI (CLICK TRIGGER) */
        <div className="w-full">
          <button
            onClick={() => {
              setError(null);
              setSearchQuery("");
              setIsModalOpen(true);
            }}
            type="button"
            className="w-full group flex items-center justify-between py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono border border-blue-500/30 shadow-lg shadow-blue-900/10 transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Wallet size={15} className="group-hover:rotate-6 transition-transform" />
              <span>Select Solana Wallet</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {installedWallets.length > 0 ? (
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                  {installedWallets.length} Wallet{installedWallets.length > 1 ? "s" : ""} Scanned
                </span>
              ) : (
                <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-700/60">
                  Scan Extensions
                </span>
              )}
              <ChevronDown size={14} className="opacity-70 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </button>

          {/* Quick status message */}
          <p className="text-[10px] text-slate-500 font-mono mt-2 text-center">
            Automatically scan browser extension wallets or play in sandbox.
          </p>
        </div>
      )}

      {/* 3. MODAL POPUP SELECTION OVERLAY */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!walletState.connecting) setIsModalOpen(false);
              }}
              className="absolute inset-0 bg-[#020408]/85 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ type: "spring", damping: 28, stiffness: 400 }}
              className="relative w-full max-w-md bg-[#07090e] border border-slate-800/90 rounded-2xl p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] z-10 overflow-hidden ring-1 ring-white/[0.05]"
            >
              {/* Dynamic radial ambient glow */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/[0.08] rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-violet-600/[0.05] rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/55">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 shadow-inner">
                    <span className="text-sm">🔑</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-100 font-mono tracking-widest uppercase">Select Wallet Portal</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Secure on-chain settlement gateway</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={walletState.connecting}
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-800 border border-slate-800/60 text-slate-400 hover:text-slate-100 transition-all duration-150 cursor-pointer disabled:opacity-50"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Error block */}
              {error && (
                <div className="mt-4 p-3 bg-red-950/20 border border-red-500/20 text-red-400 text-xs rounded-xl font-mono flex items-start gap-2.5 animate-fadeIn">
                  <span className="text-xs">⚠️</span>
                  <div className="flex-1 text-[11px] leading-relaxed">{error}</div>
                </div>
              )}

              {/* Search input field */}
              {!walletState.connecting && (
                <div className="mt-4 relative">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search standard & detected extension wallets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-950/60 border border-slate-800/70 hover:border-slate-700/80 focus:border-blue-500/50 rounded-xl text-[11px] font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[9px] font-mono cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Connecting Overlay/State inside modal */}
              {walletState.connecting ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-16 h-16 border border-blue-500/10 rounded-full animate-ping"></div>
                    <div className="w-14 h-14 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="absolute text-xl animate-pulse">⚡</span>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-mono font-bold text-white tracking-wide">Awaiting Signature...</p>
                    <p className="text-[10px] text-slate-400 font-mono max-w-[280px] mx-auto leading-normal">
                      Please sign the handshake request in your wallet extension pop-up.
                    </p>
                  </div>
                </div>
              ) : (
                /* Wallet Options list */
                <div className="mt-5 space-y-5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                  
                  {/* Category Header 1: Injected/Detected Wallets */}
                  <div>
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase tracking-wider font-extrabold pb-2">
                      <span>Detected Active Extensions ({filteredInstalled.length})</span>
                      <span>Handshake Status</span>
                    </div>

                    <div className="space-y-2">
                      {filteredInstalled.length > 0 ? (
                        filteredInstalled.map((wallet) => (
                          <button
                            key={wallet.id}
                            onClick={() => handleConnect(wallet.id)}
                            type="button"
                            className="w-full text-left p-3.5 rounded-xl border bg-slate-900/30 hover:bg-slate-900/95 border-emerald-500/10 hover:border-emerald-500/35 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)] transition-all duration-200 flex items-center justify-between cursor-pointer group/item"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg group-hover/item:scale-105 transition-transform">
                                {wallet.icon}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-100 font-mono block">{wallet.name}</span>
                                <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                                  Injected provider ready to sign
                                </span>
                              </div>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono tracking-wider flex items-center gap-1 shadow-inner">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              SCAN OK
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-3.5 bg-slate-950/40 border border-slate-900/60 rounded-xl flex items-center gap-2.5 text-[9px] text-slate-500 font-mono">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>
                            {searchQuery ? "No matching injected wallets active." : "No active injected wallet extensions scanned. Use links below or Sandbox!"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Header 2: Supported Wallets to Install */}
                  {filteredUninstalled.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase tracking-wider font-extrabold pb-2">
                        <span>Get Extension Wallets ({filteredUninstalled.length})</span>
                        <span>Setup Link</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {filteredUninstalled.map((wallet) => (
                          <a
                            key={wallet.id}
                            href={wallet.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-900 bg-slate-950/30 hover:bg-slate-900/40 hover:border-slate-800 transition-all duration-150"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm shrink-0">{wallet.icon}</span>
                              <span className="text-[10px] text-slate-300 font-mono font-bold truncate">{wallet.name}</span>
                            </div>
                            <Download size={10} className="text-slate-500 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sandbox / Testing Category (Placed at the very bottom) */}
                  {(!searchQuery || "sandbox playground demo".includes(searchQuery.toLowerCase())) && (
                    <div>
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase tracking-wider font-extrabold pb-2 pt-1 border-t border-slate-900 mt-4">
                        <span className="mt-2">Testing & Sandbox Simulation</span>
                        <span className="mt-2">No Install Required</span>
                      </div>

                      {/* Playground Simulation Option */}
                      <button
                        onClick={() => handleConnect("playground")}
                        type="button"
                        className="w-full text-left p-3.5 rounded-xl border bg-slate-900/20 hover:bg-slate-900/80 border-yellow-500/10 hover:border-yellow-500/35 hover:shadow-[0_0_20px_rgba(234,179,8,0.06)] transition-all duration-200 flex items-center justify-between cursor-pointer group/item"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/15 flex items-center justify-center text-lg group-hover/item:scale-105 transition-transform">
                            🐈
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-yellow-500/90 font-mono">Play Sandbox Wallet</span>
                              <span className="bg-yellow-500/10 text-yellow-400 text-[8px] font-bold px-1.5 py-0.2 rounded font-mono">DEMO OK</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">Instant cryptographic playground simulation</span>
                          </div>
                        </div>
                        <span className="bg-yellow-500/10 text-yellow-400 text-[8px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/20 font-mono tracking-wider">
                          ACTIVE READY
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Informational help note */}
                  <div className="mt-4 p-3.5 bg-blue-950/15 border border-blue-900/20 rounded-xl flex gap-3 text-[9px] text-slate-400 leading-normal font-mono">
                    <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
                    <span>
                      The system auto-scans for standard Solana providers in real-time. If you have any active Solana-compatible browser extension installed, it will automatically register and show up in the <strong>Detected</strong> section above!
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
