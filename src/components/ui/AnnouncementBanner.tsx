import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { Megaphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnnouncementBanner: React.FC = () => {
  const { userData } = useAuth();
  const [announcement, setAnnouncement] = useState<{ content: string, type: string } | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Listen to global settings for announcement
    const unsubscribe = onSnapshot(doc(db, 'system', 'settings'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.announcement && data.announcement.trim() !== "") {
          setAnnouncement({
            content: data.announcement,
            type: data.announcementType || 'info'
          });
          setIsVisible(true);
        } else {
          setAnnouncement(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (!userData || !announcement || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xl"
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl group-hover:bg-primary/30 transition-all" />
          <div className="relative bg-[#0D0D14]/80 backdrop-blur-xl border border-primary/20 p-4 rounded-2xl flex items-center gap-4 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Megaphone size={18} className="text-primary animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-0.5">System Update</p>
              <p className="text-xs text-white/80 font-medium line-clamp-2 leading-relaxed">
                {announcement.content}
              </p>
            </div>

            <button
              onClick={() => setIsVisible(false)}
              className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-white/20 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
