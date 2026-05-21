import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const SystemSettingsPanel: React.FC = () => {
  const [dailyCap, setDailyCap] = useState(500);
  const [announcement, setAnnouncement] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, 'system', 'settings'));
      if (snap.exists()) {
        const data = snap.data();
        setDailyCap(data.dailyPointsCap || 500);
        setAnnouncement(data.announcement || "");
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'system', 'settings'), {
        dailyPointsCap: dailyCap,
        announcement: announcement,
        lastUpdated: new Date()
      }, { merge: true });
      toast.success('System settings updated');
    } catch (e) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6 border-white/[0.05] bg-white/[0.01]">
      <div className="flex items-center gap-2 mb-6 text-primary">
        <Settings size={18} />
        <h3 className="text-xs font-bold uppercase tracking-widest">Protocol Settings</h3>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Daily Points Cap</label>
          <input
            type="number"
            value={dailyCap}
            onChange={(e) => setDailyCap(Number(e.target.value))}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Global Announcement</label>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Broadcast a message to all users..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors h-24 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 rounded-xl bg-primary text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? 'Updating...' : (
            <>
              <Save size={14} />
              Save Protocol Config
            </>
          )}
        </button>
      </div>
    </Card>
  );
};

export default SystemSettingsPanel;
