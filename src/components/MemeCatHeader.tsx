import React from "react";
import { motion } from "motion/react";
import { Cat, Heart, MessageSquare, Coins, Sparkles } from "lucide-react";

export default function MemeCatHeader() {
  return (
    <div className="relative text-center py-8 px-4 overflow-hidden rounded-3xl bg-slate-950 border border-violet-900/40 shadow-2xl">
      {/* Decorative floating elements */}
      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        className="absolute top-6 left-8 text-pink-500/30 select-none hidden md:block"
      >
        <Cat size={48} />
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-6 right-8 text-emerald-500/30 select-none hidden md:block"
      >
        <Coins size={44} />
      </motion.div>
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute top-10 right-16 text-yellow-500/20 select-none"
      >
        <Sparkles size={28} />
      </motion.div>

      {/* Main Title and Badge */}
      <div className="relative z-10 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-4 shadow-inner"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          SOLANA CORE PROTOCOL ACTIVE • x402 SECURE
        </motion.div>

        {/* Playful Cat Logo */}
        <motion.div
          initial={{ rotate: -15, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 150, damping: 10 }}
          className="relative inline-block mb-6 group"
        >
          <div className="absolute inset-0 bg-violet-600/20 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative bg-slate-900 border-2 border-violet-800/40 p-6 rounded-full text-slate-100 shadow-2xl">
            <span className="text-6xl select-none">🐈</span>
          </div>
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
            className="absolute -bottom-2 -right-2 bg-violet-600 text-white p-1.5 rounded-full shadow-lg border border-slate-800"
          >
            <Heart size={16} fill="white" />
          </motion.span>
        </motion.div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
          THE <span className="text-amber-500">NFT CAT</span> DONATIONS
        </h1>

        <p className="text-slate-300 text-base md:text-lg mb-6 leading-relaxed">
          The legendary playful feline of Solana! Support **@theNFTcat_sol** with custom cat-themed memes and messages delivered on-chain via <strong className="text-purple-400">x402 protocol</strong>! 🚀
        </p>

        {/* Playful Stats grid */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
          <div className="text-center">
            <p className="text-slate-400 text-xs font-mono">SUPPORTERS</p>
            <p className="text-xl font-bold text-white mt-1">420+</p>
          </div>
          <div className="border-x border-slate-800 text-center">
            <p className="text-slate-400 text-xs font-mono">TOTAL DONATED</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">1,337 SOL</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-xs font-mono">GOAL METER</p>
            <p className="text-xl font-bold text-pink-400 mt-1">69% 🐾</p>
          </div>
        </div>
      </div>
    </div>
  );
}
