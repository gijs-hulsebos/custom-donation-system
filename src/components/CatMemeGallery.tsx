import React from "react";
import { motion } from "motion/react";
import { MessageSquare, Heart, RefreshCw, Star, ArrowRight } from "lucide-react";

interface MemeCard {
  id: number;
  emoji: string;
  caption: string;
  sub: string;
  likes: string;
  retweets: string;
}

const MEMES: MemeCard[] = [
  {
    id: 1,
    emoji: "😿",
    caption: "When you sold your SOL at $150 and now it's $300.",
    sub: "Depressed trading cat",
    likes: "4.2K",
    retweets: "1.2K",
  },
  {
    id: 2,
    emoji: "😼",
    caption: "Waiting for the exact moment to buy the dip with my catnip allowance.",
    sub: "Financial mastermind cat",
    likes: "6.9K",
    retweets: "3.2K",
  },
  {
    id: 3,
    emoji: "😹",
    caption: "Telling my normie friends how x402 payment protocol is the future of feline donations.",
    sub: "Web3 evangelist cat",
    likes: "8.8K",
    retweets: "4.5K",
  },
];

export default function CatMemeGallery() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🐾</span> Latest Meme Feed
        </h3>
        <span className="text-xs font-mono text-purple-400 animate-pulse">LIVE FROM @theNFTcat_sol</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MEMES.map((meme, idx) => (
          <motion.div
            key={meme.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4.5 flex flex-col justify-between"
          >
            <div>
              {/* Card top */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-lg select-none">
                    🐱
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">The NFT Cat</h4>
                    <p className="text-[10px] text-slate-500 font-mono">@theNFTcat_sol</p>
                  </div>
                </div>
                <div className="text-[10px] bg-purple-950/40 text-purple-400 px-2 py-0.5 rounded-md border border-purple-900/40 font-mono">
                  {meme.sub}
                </div>
              </div>

              {/* Meme Illustration */}
              <div className="aspect-square w-full rounded-xl bg-slate-950 border border-slate-850 flex flex-col items-center justify-center p-6 mb-4 text-center select-none relative overflow-hidden group">
                <div className="absolute inset-0 bg-slate-900/40"></div>
                <span className="text-6xl mb-3 relative z-10 transition duration-300 group-hover:scale-125 group-hover:rotate-6">
                  {meme.emoji}
                </span>
                <p className="text-xs text-slate-300 font-medium relative z-10 italic px-2">
                  "{meme.caption}"
                </p>
              </div>
            </div>

            {/* Fake Twitter actions */}
            <div className="flex items-center justify-between text-slate-500 text-xs border-t border-slate-850 pt-3">
              <button className="flex items-center gap-1.5 hover:text-pink-500 transition cursor-pointer">
                <Heart size={14} />
                <span className="font-mono text-[10px]">{meme.likes}</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-green-500 transition cursor-pointer">
                <RefreshCw size={12} />
                <span className="font-mono text-[10px]">{meme.retweets}</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-blue-400 transition cursor-pointer">
                <MessageSquare size={13} />
                <span className="font-mono text-[10px]">Reply</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Info card describing the protocol */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-violet-900/40">
        <h4 className="text-sm font-bold text-slate-100 mb-1.5 flex items-center gap-1.5">
          <Star size={16} className="text-yellow-400 animate-pulse" fill="currentColor" />
          The x402 Protocol & PayAI Integration
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          The **x402 (Payment Required)** standard turns normal HTTP transactions into secure on-chain payments. First, our backend issues a cryptographic challenge. Once signed by your private key, the request is retried and validated securely by our nodes via the **PayAI facilitator network**. No seed phrases are shared, keeping your wallet safe! 🔒
        </p>
      </div>
    </div>
  );
}
