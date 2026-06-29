import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, Zap, Target, Save } from 'lucide-react';
import { db } from '../../../../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { SystemTaskDefinition } from '../../../../types';
import Button from '../../../../components/ui/Button';
import toast from 'react-hot-toast';

interface MissionBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMission: SystemTaskDefinition | null;
}

const MissionBuilderModal: React.FC<MissionBuilderModalProps> = ({ isOpen, onClose, initialMission }) => {
  const [formData, setFormData] = useState<Partial<SystemTaskDefinition>>({
    title: '',
    description: '',
    category: 'WELCOME',
    trigger: 'daily_login',
    conditionField: '',
    targetValue: 1,
    rewardPoints: 0,
    rewardXp: 0,
    active: true,
    period: 'ONCE',
    repeatable: false,
    priority: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialMission) {
      setFormData(initialMission);
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'WELCOME',
        trigger: 'daily_login',
        conditionField: '',
        targetValue: 1,
        rewardPoints: 0,
        rewardXp: 0,
        active: true,
        period: 'ONCE',
        repeatable: false,
        priority: 0
      });
    }
  }, [initialMission, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.trigger) return toast.error('Required fields missing');

    setIsSubmitting(true);
    try {
      const missionId = initialMission?.id || `mission_${Date.now()}`;
      const missionRef = doc(db, 'system_task_definitions', missionId);

      const payload = {
        ...formData,
        id: missionId,
        updatedAt: serverTimestamp(),
        createdAt: initialMission?.createdAt || serverTimestamp()
      };

      await setDoc(missionRef, payload, { merge: true });
      toast.success('Mission settings saved');
      onClose();
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/90 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative w-full max-w-2xl bg-surface border border-border-bright rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
          >
            <div className="p-10 border-b border-border flex items-center justify-between bg-surface-bright/50">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                  <Trophy size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text-primary tracking-tight uppercase italic leading-none mb-2">
                    {initialMission ? 'Edit Mission' : 'New Mission'}
                  </h3>
                  <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none">Automated Progression Settings</p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-10 overflow-y-auto max-h-[70vh] space-y-10 no-scrollbar">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Mission Details</h4>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Mission Title</label>
                    <input
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Forecasting Pioneer"
                      className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-bold uppercase italic"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Mission Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      placeholder="Describe the objective for the user..."
                      className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-medium resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Configuration</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Trigger Event</label>
                    <select
                      value={formData.trigger}
                      onChange={e => setFormData({...formData, trigger: e.target.value as any})}
                      className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest appearance-none"
                    >
                      <option value="daily_login">Daily Login</option>
                      <option value="prediction_submitted">Prediction Placed</option>
                      <option value="prediction_completed">Prediction Settled</option>
                      <option value="referral_completed">Referral Success</option>
                      <option value="campaign_task_completed">Campaign Task</option>
                      <option value="level_up">Level Milestone</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Frequency</label>
                    <select
                      value={formData.period}
                      onChange={e => setFormData({...formData, period: e.target.value as any})}
                      className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest appearance-none"
                    >
                      <option value="ONCE">Once</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Tracking Field</label>
                    <input
                      value={formData.conditionField}
                      onChange={e => setFormData({...formData, conditionField: e.target.value})}
                      placeholder="e.g. stats.predictionsCount"
                      className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Goal Number</label>
                    <input
                      type="number"
                      value={formData.targetValue}
                      onChange={e => setFormData({...formData, targetValue: Number(e.target.value)})}
                      className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Sort Order</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={e => setFormData({...formData, priority: Number(e.target.value)})}
                      className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Rewards</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Point Reward</label>
                    <div className="relative">
                      <Zap size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                      <input
                        type="number"
                        value={formData.rewardPoints}
                        onChange={e => setFormData({...formData, rewardPoints: Number(e.target.value)})}
                        className="w-full bg-surface-bright border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-mono font-bold text-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">XP Reward</label>
                    <div className="relative">
                      <Target size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                      <input
                        type="number"
                        value={formData.rewardXp}
                        onChange={e => setFormData({...formData, rewardXp: Number(e.target.value)})}
                        className="w-full bg-surface-bright border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-mono font-bold text-indigo-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button type="submit" isLoading={isSubmitting} className="flex-1 py-6 rounded-2xl shadow-2xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3">
                  <Save size={18} /> Save Mission
                </Button>
                <button type="button" onClick={onClose} className="px-10 py-6 rounded-2xl bg-surface-bright border border-border-bright text-text-tertiary hover:text-text-primary transition-colors font-black uppercase tracking-widest text-[10px]">
                  Abort
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MissionBuilderModal;
