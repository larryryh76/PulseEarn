import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import Card from '../ui/Card';
import { Bell, Volume2, Smartphone, Shield, Loader2, User } from 'lucide-react';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

const SettingsPanel: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  if (!userData || !currentUser) return null;

  const updatePreference = async (key: string, value: any) => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        [`preferences.${key}`]: value
      });
      toast.success('Preference updated');
    } catch (e) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = async (updates: any) => {
     setIsSaving(true);
     try {
       const userRef = doc(db, 'users', currentUser.uid);
       await updateDoc(userRef, updates);
       toast.success('Profile updated');
     } catch (e) {
       toast.error('Update failed');
     } finally {
       setIsSaving(false);
     }
  };

  const avatarSeeds = ['Spooky', 'Ginger', 'Felix', 'Jasper', 'Milo', 'Luna'];

  return (
    <div className="space-y-8 pb-20">
      {/* Account Section */}
      <div className="space-y-4">
         <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">Identity & Node</h3>
         <Card className="p-6 border-white/[0.03] bg-white/[0.01] space-y-6">
            <div className="flex flex-col gap-4">
               <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Global Avatar Seed</label>
               <div className="flex flex-wrap gap-3">
                  {avatarSeeds.map(seed => (
                    <button
                      key={seed}
                      onClick={() => updateProfile({ avatarUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}` })}
                      className={cn(
                        "w-12 h-12 rounded-xl border-2 transition-all p-1",
                        userData.avatarUrl?.includes(seed) ? "border-primary bg-primary/10" : "border-transparent bg-white/5 hover:bg-white/10"
                      )}
                    >
                       <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${seed}`} alt={seed} className="w-full h-full" />
                    </button>
                  ))}
               </div>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Display Name</label>
                  <div className="relative">
                     <input
                       type="text"
                       defaultValue={userData.username}
                       onBlur={(e) => userData.username !== e.target.value && updateProfile({ username: e.target.value })}
                       className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                     />
                     <User size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10" />
                  </div>
               </div>
            </div>
         </Card>
      </div>

      {/* System Preferences */}
      <div className="space-y-4">
         <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] ml-1">System Feedback</h3>
         <Card className="p-0 overflow-hidden border-white/[0.03] bg-white/[0.01]">
            <div className="divide-y divide-white/[0.02]">
               {[
                 { id: 'notifications', label: 'Push Notifications', icon: Bell, val: userData.preferences?.notifications },
                 { id: 'soundEnabled', label: 'Sound FX', icon: Volume2, val: userData.preferences?.soundEnabled },
                 { id: 'vibrationEnabled', label: 'Haptic Feedback', icon: Smartphone, val: userData.preferences?.vibrationEnabled },
                 { id: 'privacyMode', label: 'Stealth Mode (Private Stats)', icon: Shield, val: userData.preferences?.privacyMode }
               ].map((pref) => (
                 <div key={pref.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/40">
                          <pref.icon size={18} />
                       </div>
                       <span className="text-sm font-bold text-white/80">{pref.label}</span>
                    </div>
                    <button
                      onClick={() => updatePreference(pref.id, !pref.val)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        pref.val ? "bg-primary" : "bg-white/10"
                      )}
                    >
                       <div className={cn(
                         "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                         pref.val ? "left-7" : "left-1"
                       )} />
                    </button>
                 </div>
               ))}
            </div>
         </Card>
      </div>

      {isSaving && (
        <div className="fixed bottom-24 right-8 bg-primary px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 z-50 animate-bounce">
           <Loader2 size={14} className="animate-spin" />
           <span className="text-[10px] font-bold uppercase tracking-widest">Syncing to Protocol...</span>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
