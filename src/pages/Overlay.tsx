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
  const [seenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const pollFeed = async () => {
      try {
        const res = await fetch('/api/overlay-feed');
        const data = await res.json();
        if (data && data.length > 0) {
          const latest = data[data.length - 1];
          if (!seenIds.has(latest.id)) {
            seenIds.add(latest.id);
            setActiveAlert(latest);
            setTimeout(() => setActiveAlert(null), 6000); // Hide after 6s
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    const interval = setInterval(pollFeed, 3000);
    return () => clearInterval(interval);
  }, [seenIds]);

  // Crucial: Keep frame 100% transparent and hidden by default
  if (!activeAlert) return <div className="fixed inset-0 bg-transparent pointer-events-none" />;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-transparent flex items-start justify-center pt-20 font-mono select-none pointer-events-none">
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-[400px] bg-black/95 border border-green-500 rounded p-5 text-center shadow-[0_0_20px_rgba(34,197,94,0.3)] text-green-400"
          >
            {/* Line 1: Name - Donation */}
            <div className="text-lg font-bold text-white tracking-wide">
              {activeAlert.name} — <span className="text-yellow-400 font-black">{activeAlert.amount}</span>
            </div>
            
            {/* Line 2: Message */}
            {activeAlert.message && (
              <div className="mt-2 text-sm text-gray-300 italic border-t border-b border-green-900/30 py-2">
                {activeAlert.message}
              </div>
            )}
            
            {/* Line 3: Social Link */}
            {activeAlert.socials && (
              <div className="mt-2 text-xs text-blue-400 tracking-wider">
                {activeAlert.socials}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
