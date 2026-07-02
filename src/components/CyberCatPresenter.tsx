import React from "react";
import { motion } from "motion/react";
import { Users, Coins, Percent, Shield, ArrowUpRight, Cpu } from "lucide-react";
// @ts-ignore
import cyberCatImg from "../assets/images/cyber_cat_hero_1782946639889.jpg";

export default function CyberCatPresenter() {
  return (
    <div className="relative rounded-3xl bg-slate-950/80 border border-violet-900/40 p-6 md:p-8 overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.1)] backdrop-blur-xl group">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-600/20 transition-all duration-700"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-amber-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Futuristic Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Cyber Cat Centerpiece */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Decorative cyber scanner line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500/50 animate-pulse pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden border-2 border-amber-600/40 shadow-[0_0_40px_rgba(245,158,11,0.15)] group/avatar"
        >
          {/* Brushed copper corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500"></div>

          {/* Premium Glass reflection */}
          <div className="absolute inset-0 bg-white/5 pointer-events-none z-10"></div>

          {/* 3D Rendered Cyber Cat */}
          <img
            src={cyberCatImg}
            alt="3D Cybernetic NFT Cat"
            className="w-full h-full object-cover transform scale-100 group-hover/avatar:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />

          {/* Glowing Status badge */}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md border border-violet-500/30 px-3.5 py-1.5 rounded-xl flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300">SYSTEM: ONLINE</span>
            </div>
            <span className="text-[9px] font-mono text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">NFT CAT CORES</span>
          </div>
        </motion.div>

        {/* Interlocking Statistics Rings */}
        <div className="w-full mt-8 space-y-6">
          <div className="text-center md:text-left">
            <h4 className="text-xs font-mono font-bold text-slate-400 tracking-widest uppercase flex items-center justify-center md:justify-start gap-1.5 mb-1">
              <Cpu size={12} className="text-violet-400" /> SYSTEM STATUS & PROGRESS
            </h4>
            <h3 className="text-lg font-bold text-white">Ecosystem Milestones</h3>
          </div>

          {/* Interlocking Rings Visual Layout */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* Ring 1: Supporters */}
            <div className="relative group/ring flex items-center gap-4 bg-slate-900/40 border border-slate-800 p-3.5 rounded-2xl w-full sm:w-auto sm:flex-1">
              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    className="stroke-slate-800"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    className="stroke-violet-500 transition-all duration-1000"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={150}
                    strokeDashoffset={30}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-violet-400">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Supporters</p>
                <p className="text-base font-bold text-white">420+ Cats</p>
                <p className="text-[9px] font-mono text-violet-400 flex items-center gap-0.5">
                  Live Feed <ArrowUpRight size={8} />
                </p>
              </div>
            </div>

            {/* Ring 2: Total Donated */}
            <div className="relative group/ring flex items-center gap-4 bg-slate-900/40 border border-slate-800 p-3.5 rounded-2xl w-full sm:w-auto sm:flex-1">
              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    className="stroke-slate-800"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    className="stroke-amber-500 transition-all duration-1000"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={150}
                    strokeDashoffset={15}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-amber-500">
                  <Coins size={16} />
                </div>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Donated</p>
                <p className="text-base font-bold text-amber-400">1,337 SOL</p>
                <p className="text-[9px] font-mono text-amber-500/80">On-chain verified</p>
              </div>
            </div>

            {/* Ring 3: Goal progress */}
            <div className="relative group/ring flex items-center gap-4 bg-slate-900/40 border border-slate-800 p-3.5 rounded-2xl w-full sm:w-auto sm:flex-1">
              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    className="stroke-slate-800"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    className="stroke-pink-500 transition-all duration-1000"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={150}
                    strokeDashoffset={45}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-pink-400">
                  <Percent size={14} />
                </div>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Goal Meter</p>
                <p className="text-base font-bold text-pink-400">69% Completed</p>
                <p className="text-[9px] font-mono text-pink-400">Next milestone: Meme Party</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
