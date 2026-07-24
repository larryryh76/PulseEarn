import * as React from 'react';
import { Target, Zap, Plus, Archive, RotateCcw, X, CheckCircle, Trash2, AlertTriangle, Edit3, Copy } from 'lucide-react';
import { db, auth } from '../../../firebase/config';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import DataTable from '../../../components/admin/common/DataTable';
import { Task } from '../../../types';
import { safeFetch } from '../../../utils/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils';

const TASK_TYPES = ['manual', 'automated', 'referral', 'campaign', 'welcome', 'level', 'mission'] as const;

const EditTaskModal: React.FC<{ task: Task; onClose: () => void }> = ({ task, onClose }) => {
  const [form, setForm] = React.useState({
    title: task.title || '',
    description: task.description || '',
    type: (task.type || 'manual') as typeof TASK_TYPES[number],
    rewardAmount: String(task.rewardAmount || 0),
    xpReward: String(task.xpReward || 0),
    proofLabel: task.proofLabel || task.proofRequirements || '',
    proofPlaceholder: task.proofPlaceholder || '',
    maxCompletions: task.maxCompletions !== undefined && task.maxCompletions !== null ? String(task.maxCompletions) : '',
    cooldownHours: String(task.cooldownHours ?? task.cooldownPeriod ?? 0),
    url: task.url || task.actionUrl || '',
  });
  const [saving, setSaving] = React.useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return toast.error('Task title is required.');
    }
    const rewardVal = Number(form.rewardAmount);
    if (!Number.isFinite(rewardVal) || rewardVal < 1) {
      return toast.error('Reward amount must be a valid number of at least 1 PTS.');
    }
    const xpVal = form.xpReward.trim() ? Number(form.xpReward) : 0;
    if (!Number.isFinite(xpVal) || xpVal < 0) {
      return toast.error('XP reward must be a valid non-negative number.');
    }
    setSaving(true);
    const load = toast.loading('Saving changes...');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const res = await safeFetch(`/api/admin/tasks/${task.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          rewardAmount: rewardVal,
          xpReward: xpVal,
          proofLabel: form.proofLabel.trim() || 'Proof',
          proofPlaceholder: form.proofPlaceholder.trim() || 'Paste your proof link here',
          maxCompletions: form.maxCompletions ? Number(form.maxCompletions) : null,
          cooldownHours: Number(form.cooldownHours) || 0,
          url: form.url.trim() || null,
        }),
      });
      if (res.success) {
        toast.success('Task updated successfully.');
        onClose();
      } else {
        toast.error(res.error || res.message || 'Update failed.');
      }
    } catch (err) {
      toast.error('Network error.');
    } finally {
      setSaving(false);
      toast.dismiss(load);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#12121A] border border-[#1E1E2E] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#1E1E2E]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Edit3 size={16} className="text-primary" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Edit Objective</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={18} className="text-white/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Title *</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Follow our page on X"
                required
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe what users need to do..."
                rows={3}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Type *</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-colors"
              >
                {TASK_TYPES.map(t => (
                  <option key={t} value={t} className="bg-[#12121A]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Task URL (optional)</label>
              <input
                value={form.url}
                onChange={e => set('url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Reward (PTS) *</label>
              <input
                type="number"
                value={form.rewardAmount}
                onChange={e => set('rewardAmount', e.target.value)}
                placeholder="e.g. 100"
                required
                min="1"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">XP Reward</label>
              <input
                type="number"
                value={form.xpReward}
                onChange={e => set('xpReward', e.target.value)}
                placeholder="e.g. 50"
                min="0"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Max Completions (blank = unlimited)</label>
              <input
                type="number"
                value={form.maxCompletions}
                onChange={e => set('maxCompletions', e.target.value)}
                placeholder="Unlimited"
                min="1"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Cooldown (hours, 0 = one-time)</label>
              <input
                type="number"
                value={form.cooldownHours}
                onChange={e => set('cooldownHours', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            {form.type === 'manual' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Proof Field Label</label>
                  <input
                    value={form.proofLabel}
                    onChange={e => set('proofLabel', e.target.value)}
                    placeholder="e.g. Screenshot URL"
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Proof Field Placeholder</label>
                  <input
                    value={form.proofPlaceholder}
                    onChange={e => set('proofPlaceholder', e.target.value)}
                    placeholder="e.g. Paste your screenshot link"
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
                  />
                </div>
              </>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#1E1E2E] text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><CheckCircle size={14} /> Update Task</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateTaskModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    type: 'manual' as typeof TASK_TYPES[number],
    rewardAmount: '',
    xpReward: '',
    proofLabel: '',
    proofPlaceholder: '',
    maxCompletions: '',
    cooldownHours: '0',
    url: '',
  });
  const [saving, setSaving] = React.useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return toast.error('Task title is required.');
    }
    const rewardVal = Number(form.rewardAmount);
    if (!Number.isFinite(rewardVal) || rewardVal < 1) {
      return toast.error('Reward amount must be a valid number of at least 1 PTS.');
    }
    const xpVal = form.xpReward.trim() ? Number(form.xpReward) : 0;
    if (!Number.isFinite(xpVal) || xpVal < 0) {
      return toast.error('XP reward must be a valid non-negative number.');
    }
    setSaving(true);
    const load = toast.loading('Creating task...');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const res = await safeFetch('/api/admin/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          rewardAmount: rewardVal,
          xpReward: xpVal,
          proofLabel: form.proofLabel.trim() || 'Proof',
          proofPlaceholder: form.proofPlaceholder.trim() || 'Paste your proof link here',
          maxCompletions: form.maxCompletions ? Number(form.maxCompletions) : null,
          cooldownHours: Number(form.cooldownHours) || 0,
          url: form.url.trim() || null,
          active: true,
        }),
      });
      if (res.success) {
        toast.success('Task created and live.');
        onClose();
      } else {
        toast.error(res.error || res.message || 'Create failed.');
      }
    } catch (err) {
      toast.error('Network error.');
    } finally {
      setSaving(false);
      toast.dismiss(load);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#12121A] border border-[#1E1E2E] rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#1E1E2E]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus size={16} className="text-primary" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">New Objective</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={18} className="text-white/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Title *</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Follow our page on X"
                required
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe what users need to do..."
                rows={3}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Type *</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-colors"
              >
                {TASK_TYPES.map(t => (
                  <option key={t} value={t} className="bg-[#12121A]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Task URL (optional)</label>
              <input
                value={form.url}
                onChange={e => set('url', e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Reward (PTS) *</label>
              <input
                type="number"
                value={form.rewardAmount}
                onChange={e => set('rewardAmount', e.target.value)}
                placeholder="e.g. 100"
                required
                min="1"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">XP Reward</label>
              <input
                type="number"
                value={form.xpReward}
                onChange={e => set('xpReward', e.target.value)}
                placeholder="e.g. 50"
                min="0"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Max Completions (blank = unlimited)</label>
              <input
                type="number"
                value={form.maxCompletions}
                onChange={e => set('maxCompletions', e.target.value)}
                placeholder="Unlimited"
                min="1"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Cooldown (hours, 0 = one-time)</label>
              <input
                type="number"
                value={form.cooldownHours}
                onChange={e => set('cooldownHours', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
              />
            </div>

            {form.type === 'manual' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Proof Field Label</label>
                  <input
                    value={form.proofLabel}
                    onChange={e => set('proofLabel', e.target.value)}
                    placeholder="e.g. Screenshot URL"
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Proof Field Placeholder</label>
                  <input
                    value={form.proofPlaceholder}
                    onChange={e => set('proofPlaceholder', e.target.value)}
                    placeholder="e.g. Paste your screenshot link"
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-primary/50 outline-none transition-colors"
                  />
                </div>
              </>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#1E1E2E] text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><CheckCircle size={14} /> Deploy Task</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WipeAllModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [confirmText, setConfirmText] = React.useState('');
  const [wiping, setWiping] = React.useState(false);
  const PHRASE = 'DELETE ALL TASKS';

  const handleWipe = async () => {
    if (confirmText !== PHRASE) return;
    setWiping(true);
    const load = toast.loading('Wiping all task data...');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const res = await safeFetch('/api/admin/tasks/wipe-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ confirm: PHRASE }),
      });
      if (res.success) {
        const d = res.deleted || {};
        const total = Object.values(d).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
        toast.success(`Wiped ${total} records. Offerwall preserved.`);
        onClose();
      } else {
        toast.error(res.reason || res.error || 'Wipe failed.');
      }
    } catch {
      toast.error('Network error during wipe.');
    } finally {
      setWiping(false);
      toast.dismiss(load);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#12121A] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-[#1E1E2E]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Delete All Tasks</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={18} className="text-white/40" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-xs text-white/60 leading-relaxed">
            This permanently deletes <strong className="text-white">every task, campaign, and mission</strong> plus
            all user progress and claims. Offerwall data and user balances are preserved. This cannot be undone.
          </p>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/40">
              Type <span className="text-red-400">{PHRASE}</span> to confirm
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={PHRASE}
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-red-500/50 outline-none transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#1E1E2E] text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleWipe}
              disabled={confirmText !== PHRASE || wiping}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {wiping ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 size={14} /> Wipe Everything</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OpsTasks: React.FC = () => {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [archived, setArchived] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [tab, setTab] = React.useState<'active' | 'archived'>('active');
  const [actioningId, setActioningId] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showWipe, setShowWipe] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<'all' | typeof TASK_TYPES[number]>('all');

  React.useEffect(() => {
    const q = query(collection(db, 'tasks'), where('active', '==', true), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task))));
  }, []);

  React.useEffect(() => {
    const q = query(collection(db, 'tasks'), where('active', '==', false), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      setArchived(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    });
  }, []);

  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [purging, setPurging] = React.useState(false);

  const handleDuplicate = async (taskId: string) => {
    setActioningId(taskId);
    const load = toast.loading('Duplicating task...');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const res = await safeFetch(`/api/admin/tasks/${taskId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.success) {
        toast.success('Task duplicated successfully.');
      } else {
        toast.error(res.error || 'Duplicate failed.');
      }
    } catch {
      toast.error('Network error during duplicate.');
    } finally {
      setActioningId(null);
      toast.dismiss(load);
    }
  };
  const handlePurgeMissions = async () => {
    if (!window.confirm('Permanently delete all legacy missions ("Network Builder" etc.) and their progress? Standard tasks and offerwall are not affected.')) return;
    setPurging(true);
    const load = toast.loading('Purging legacy missions...');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const res = await safeFetch('/api/admin/missions/purge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.success) {
        const total = Object.values(res.deleted || {}).reduce((a: number, b: any) => a + Number(b || 0), 0);
        toast.success(`Purged ${total} legacy mission record(s).`);
      } else {
        toast.error(res.error || 'Purge failed.');
      }
    } catch {
      toast.error('Network error during purge.');
    } finally {
      toast.dismiss(load);
      setPurging(false);
    }
  };

  const handleArchive = async (taskId: string) => {
    setActioningId(taskId);
    const load = toast.loading('Archiving...');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const res = await safeFetch(`/api/admin/tasks/${taskId}/disable`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      if (res.success) toast.success('Task archived — removed from user view.');
      else toast.error(res.error || 'Archive failed.');
    } finally {
      setActioningId(null);
      toast.dismiss(load);
    }
  };

  const handleRestore = async (taskId: string) => {
    setActioningId(taskId);
    const load = toast.loading('Restoring...');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const res = await safeFetch(`/api/admin/tasks/${taskId}/enable`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      if (res.success) toast.success('Task restored — visible to users.');
      else toast.error(res.error || 'Restore failed.');
    } finally {
      setActioningId(null);
      toast.dismiss(load);
    }
  };

  const handleDelete = async (taskId: string) => {
    setActioningId(taskId);
    const load = toast.loading('Deleting...');
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const res = await safeFetch(`/api/admin/tasks/${taskId}/delete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      if (res.success) toast.success('Task permanently deleted.');
      else toast.error(res.reason || res.error || 'Delete failed.');
    } finally {
      setActioningId(null);
      toast.dismiss(load);
    }
  };

  const display = (tab === 'active' ? tasks : archived)
    .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(t => typeFilter === 'all' || ((t as any).type || 'manual') === typeFilter);

  return (
    <>
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
      {showWipe && <WipeAllModal onClose={() => setShowWipe(false)} />}

      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-primary" />
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">Task Library</h1>
            </div>
            <p className="text-xs text-white/40 font-medium">
              Active tasks sync in real-time to the user task page. Archived tasks are hidden immediately.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <button
              onClick={handlePurgeMissions}
              disabled={purging}
              title='Delete legacy missions like "Network Builder" (merged into Tasks)'
              className="w-full md:w-auto px-6 py-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} /> Purge Legacy Missions
            </button>
            <button
              onClick={() => setShowWipe(true)}
              className="w-full md:w-auto px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={16} /> Delete All
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Plus size={16} /> New Task
            </button>
          </div>
        </header>

        {/* Tab Bar + Type Filter */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-1 p-1 bg-[#12121A] border border-[#1E1E2E] rounded-xl w-fit">
            {(['active', 'archived'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  tab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'
                )}
              >
                {t === 'active' ? `Active (${tasks.length})` : `Archived (${archived.length})`}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="bg-[#12121A] border border-[#1E1E2E] rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/70 focus:border-primary/50 outline-none transition-colors"
          >
            <option value="all" className="bg-[#12121A]">All Types</option>
            {TASK_TYPES.map(t => (
              <option key={t} value={t} className="bg-[#12121A]">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <DataTable
          columns={[
            {
              header: 'Task',
              accessor: (task: Task) => (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Target size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{task.title}</p>
                    <p className="text-[9px] font-mono text-white/30 mt-0.5">{task.id}</p>
                  </div>
                </div>
              )
            },
            {
              header: 'Type',
              accessor: (task: Task) => (
                <span className="px-2 py-1 rounded-md bg-white/5 text-white/60 text-[9px] font-black uppercase tracking-widest border border-white/10">
                  {(task as any).type || 'manual'}
                </span>
              )
            },
            {
              header: 'Reward',
              accessor: (task: Task) => (
                <div className="flex items-center gap-1.5">
                  <Zap size={12} className="text-yellow-400" />
                  <span className="text-xs font-mono font-bold text-white">{task.rewardAmount.toLocaleString()} PTS</span>
                </div>
              )
            },
            {
              header: 'Completions',
              accessor: (task: Task) => (
                <span className="text-xs font-mono text-white/50">{(task as any).completionCount || 0}</span>
              )
            },
            {
              header: 'Action',
              accessor: (task: Task) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); setEditingTask(task); }}
                    title="Edit task"
                    className="px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 size={12} />
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDuplicate(task.id); }}
                    disabled={actioningId === task.id}
                    title="Duplicate task"
                    className="px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    <Copy size={12} />
                  </button>
                  {tab === 'active' ? (
                    <button
                      onClick={e => { e.stopPropagation(); handleArchive(task.id); }}
                      disabled={actioningId === task.id}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      {actioningId === task.id ? <div className="w-3 h-3 border border-amber-400/50 border-t-amber-400 rounded-full animate-spin" /> : <Archive size={12} />}
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); handleRestore(task.id); }}
                      disabled={actioningId === task.id}
                      className="px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      {actioningId === task.id ? <div className="w-3 h-3 border border-green-400/50 border-t-green-400 rounded-full animate-spin" /> : <RotateCcw size={12} />}
                      Restore
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                    disabled={actioningId === task.id}
                    title="Permanently delete"
                    className="px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            }
          ]}
          data={display}
          isLoading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search tasks..."
        />
      </div>

      {editingTask && (
        <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </>
  );
};

export default OpsTasks;
