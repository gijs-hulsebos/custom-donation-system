import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface DonationAlert {
  id: string;
  name: string;
  amount: string;
  message: string;
  socials: string;
}

export default function Overlay() {
  const [activeAlert, setActiveAlert] = useState<DonationAlert | null>(null);
  const [seenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkFeed = async () => {
      try {
        const res = await fetch('/api/overlay-feed');
        if (res.ok) {
          const feed: DonationAlert[] = await res.json();
          
          if (feed && feed.length > 0) {
            const latest = feed[feed.length - 1];
            // If we haven't animated this unique alert ID yet
            if (!seenIds.has(latest.id)) {
              seenIds.add(latest.id);
              setActiveAlert(latest);
              
              // Keep alert on screen for 7 seconds, then clear it
              setTimeout(() => {
                setActiveAlert(null);
              }, 7000);
            }
          }
        }
      } catch (err) {
        console.error("Failed to poll overlay feed:", err);
      }
    };

    // Run immediately and then poll every 3 seconds
    checkFeed();
    const interval = setInterval(checkFeed, 3000);
    return () => clearInterval(interval);
  }, [seenIds]);

  return (
    <div className="w-screen h-screen bg-transparent flex items-start justify-center pt-10 overflow-hidden font-mono select-none">
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-[450px] bg-black/90 border-2 border-green-500 rounded-lg p-6 shadow-[0_0_25px_rgba(34,197,94,0.4)] text-green-400 text-center"
          >
            {/* Headline Tag */}
            <div className="text-xs uppercase tracking-widest text-green-500/70 mb-3 animate-pulse">
              📡 [ Incoming Onchain Transmission ]
            </div>

            {/* Name & Amount Row */}
            <div className="text-xl font-bold text-white tracking-wide">
              {activeAlert.name} <span className="text-green-500">—</span> <span className="text-yellow-400">{activeAlert.amount}</span>
            </div>

            {/* Custom Message Body */}
            {activeAlert.message && (
              <div className="mt-3 text-base text-gray-200 border-t border-b border-green-900/50 py-2 italic font-sans">
                "{activeAlert.message}"
              </div>
            )}

            {/* Social Links Sub-layer */}
            {activeAlert.socials && (
              <div className="mt-3 text-sm text-blue-400 font-sans font-medium flex items-center justify-center gap-1">
                <span>{activeAlert.socials}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
