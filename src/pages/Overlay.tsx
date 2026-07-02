import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface DonationAlert {
  id: string;
  amount: number | string;
  name?: string;
  message?: string;
  socials?: string;
  timestamp: number;
}

export default function Overlay() {
  const [queue, setQueue] = useState<DonationAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<DonationAlert | null>(null);
  const seenAlertIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef<boolean>(true);

  const fetchOverlayFeed = async () => {
    try {
      const res = await fetch("/api/overlay-feed");
      if (res.ok) {
        const data: DonationAlert[] = await res.json();
        
        // On first load, we populate seenAlertIds with existing historical alerts
        // so that old alerts do not spam the overlay when it is loaded.
        if (isFirstLoad.current) {
          data.forEach((alert) => seenAlertIds.current.add(alert.id));
          isFirstLoad.current = false;
          return;
        }

        // Find any alerts we haven't seen yet
        const newAlerts = data.filter((alert) => !seenAlertIds.current.has(alert.id));

        if (newAlerts.length > 0) {
          newAlerts.forEach((alert) => {
            seenAlertIds.current.add(alert.id);
          });
          // Add them to our queue
          setQueue((prev) => [...prev, ...newAlerts]);
        }
      }
    } catch (err) {
      console.error("[Overlay Feed Fetch Error]:", err);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchOverlayFeed();

    // 3-second interval poll
    const interval = setInterval(fetchOverlayFeed, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeAlert && queue.length > 0) {
      // Pull next alert from the queue
      const nextAlert = queue[0];
      setQueue((prev) => prev.slice(1));
      setActiveAlert(nextAlert);

      // Auto-Dismiss Timer Loop: clear after 6 seconds
      const timer = setTimeout(() => {
        setActiveAlert(null);
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [queue, activeAlert]);

  return (
    <div className="bg-transparent h-screen w-screen overflow-hidden relative p-12 flex justify-center items-start select-none pointer-events-none">
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ y: -120, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -120, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="border border-green-500 bg-black/80 backdrop-blur-md p-6 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.5)] max-w-md w-full text-green-400 font-mono pointer-events-auto"
          >
            <div className="text-xl font-bold uppercase tracking-wider mb-2 text-center text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
              [ NEW DONATION RECEIVED ]
            </div>
            
            <div className="space-y-3">
              <div className="text-white text-lg">
                <span className="text-green-400 font-semibold">From:</span> {activeAlert.name || "Anonymous"}
              </div>
              
              <div className="text-3xl font-black text-yellow-400 my-1 tracking-tight filter drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">
                {typeof activeAlert.amount === "number" || !activeAlert.amount?.toString().match(/[a-zA-Z]/)
                  ? `${activeAlert.amount} SOL`
                  : activeAlert.amount}
              </div>
              
              {activeAlert.message && (
                <div className="text-gray-300 italic my-2 bg-black/40 border border-green-950 p-2.5 rounded text-sm">
                  "{activeAlert.message}"
                </div>
              )}
              
              {activeAlert.socials && (
                <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                  <span>🔗</span>
                  <span className="hover:underline">{activeAlert.socials}</span>
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-green-600 border-t border-green-950 mt-4 pt-2 flex justify-between">
              <span>LEDGER SETTLED</span>
              <span>REF: {activeAlert.id}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
