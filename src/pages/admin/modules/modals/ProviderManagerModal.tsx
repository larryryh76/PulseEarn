import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, X, Key, Globe, AlertTriangle,
  ChevronDown, ChevronRight,
  Save, Lock, DollarSign
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { safeFetch } from '../../../../utils/api';
import Button from '../../../../components/ui/Button';
import toast from 'react-hot-toast';
import { cn } from '../../../../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FraudRules {
  maxRewardsPerUserPerDay: number;
  maxRewardAmountPerDay: number;
  minTimeBetweenRewardsSec: number;
  blockVPN: boolean;
  blockDuplicateIp: boolean;
}

interface ProviderForm {
  id: string;
  name: string;
  enabled: boolean;
  affiliateId: string;
  apiKey: string;
  secret: string;
  callbackUrl: string;
  webhookUrl: string;
  rewardMultiplier: number;
  userSharePct: number;
  platformSharePct: number;
  minimumReward: number;
  maximumReward: number;
  fraudRules: FraudRules;
}

const DEFAULT_FRAUD_RULES: FraudRules = {
  maxRewardsPerUserPerDay: 50,
  maxRewardAmountPerDay: 10000,
  minTimeBetweenRewardsSec: 30,
  blockVPN: false,
  blockDuplicateIp: true,
};

const BLANK_FORM: ProviderForm = {
  id: '',
  name: '',
  enabled: true,
  affiliateId: '',
  apiKey: '',
  secret: '',
  callbackUrl: '',
  webhookUrl: '',
  rewardMultiplier: 1.0,
  userSharePct: 0.85,
  platformSharePct: 0.15,
  minimumReward: 1,
  maximumReward: 100000,
  fraudRules: DEFAULT_FRAUD_RULES,
};

const KNOWN_PROVIDERS = [
  { id: 'lootably', name: 'Lootably' },
  { id: 'bitlabs', name: 'BitLabs' },
  { id: 'cpxresearch', name: 'CPX Research' },
  { id: 'adgem', name: 'AdGem' },
  { id: 'offertoro', name: 'OfferToro' },
  { id: 'timewall', name: 'TimeWall' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  providerId?: string | null;
}

// ─── Section Collapse ─────────────────────────────────────────────────────────

const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-surface-bright hover:bg-surface-bright/80 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="text-primary">{icon}</span>
          <div className="text-left">
            <p className="text-[12px] font-bold text-text-primary uppercase tracking-widest">{title}</p>
            {subtitle && <p className="text-[10px] text-text-tertiary mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {open ? <ChevronDown size={15} className="text-text-tertiary" /> : <ChevronRight size={15} className="text-text-tertiary" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-4 space-y-4 bg-surface">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Field helpers ────────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, hint, required, children }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-tertiary flex items-center gap-1">
      {label}
      {required && <span className="text-danger">*</span>}
    </label>
    {children}
    {hint && <p className="text-[9px] text-text-tertiary/70 pl-1">{hint}</p>}
  </div>
);

const TextInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}> = ({ value, onChange, placeholder, type = 'text', mono }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className={cn(
      'w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-3 text-sm text-text-primary',
      'focus:border-primary/40 focus:ring-1 focus:ring-primary/20 outline-none transition-all',
      mono && 'font-mono'
    )}
  />
);

const NumInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}> = ({ value, onChange, min, max, step = 1, placeholder }) => (
  <input
    type="number"
    value={value}
    min={min}
    max={max}
    step={step}
    placeholder={placeholder}
    onChange={e => onChange(Number(e.target.value))}
    className="w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-3 text-sm text-text-primary font-mono focus:border-primary/40 outline-none transition-all"
  />
);

const Toggle: React.FC<{
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  subtitle?: string;
}> = ({ value, onChange, label, subtitle }) => (
  <div className="flex items-center justify-between p-3 bg-surface-bright border border-border rounded-xl">
    <div>
      <p className="text-[11px] font-bold text-text-primary">{label}</p>
      {subtitle && <p className="text-[9px] text-text-tertiary mt-0.5">{subtitle}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'w-11 h-6 rounded-full relative transition-all duration-200 shrink-0',
        value ? 'bg-primary' : 'bg-surface-accent border border-border'
      )}
    >
      <div className={cn(
        'absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
        value ? 'translate-x-5' : 'translate-x-0'
      )} />
    </button>
  </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────

const ProviderManagerModal: React.FC<Props> = ({ isOpen, onClose, providerId }) => {
  const { currentUser } = useAuth();
  const isNew = !providerId;

  const [form, setForm] = useState<ProviderForm>({ ...BLANK_FORM });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCustomId, setUseCustomId] = useState(false);

  // Derive callback URL from provider id
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${origin}/api/offerwall/callback/${form.id || '[provider-id]'}`;

  // Load existing provider data when editing
  const loadProvider = useCallback(async () => {
    if (!providerId || !currentUser) return;
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/providers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) {
        const found = (res.providers || []).find((p: any) => p.id === providerId);
        if (found) {
          setForm({
            id: found.id || '',
            name: found.name || '',
            enabled: found.enabled ?? true,
            affiliateId: found.affiliateId || '',
            apiKey: '',   // never pre-populated for security
            secret: '',   // never pre-populated for security
            callbackUrl: found.callbackUrl || '',
            webhookUrl: found.webhookUrl || '',
            rewardMultiplier: found.rewardMultiplier ?? 1.0,
            userSharePct: found.userSharePct ?? 0.85,
            platformSharePct: found.platformSharePct ?? 0.15,
            minimumReward: found.minimumReward ?? 1,
            maximumReward: found.maximumReward ?? 100000,
            fraudRules: { ...DEFAULT_FRAUD_RULES, ...(found.fraudRules || {}) },
          });
        }
      }
    } catch {
      toast.error('Failed to load provider config');
    } finally {
      setLoading(false);
    }
  }, [providerId, currentUser]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (isNew) {
        setForm({ ...BLANK_FORM });
        setUseCustomId(false);
      } else {
        loadProvider();
      }
    }
  }, [isOpen, isNew, loadProvider]);

  const set = (field: keyof ProviderForm, value: any) =>
    setForm(f => ({ ...f, [field]: value }));

  const setFraud = (field: keyof FraudRules, value: any) =>
    setForm(f => ({ ...f, fraudRules: { ...f.fraudRules, [field]: value } }));

  // Auto-fill name from known provider
  const handleKnownProvider = (id: string) => {
    const known = KNOWN_PROVIDERS.find(p => p.id === id);
    setForm(f => ({
      ...f,
      id,
      name: known?.name || id,
      callbackUrl: `${origin}/api/offerwall/callback/${id}`,
    }));
  };

  const validate = (): string | null => {
    if (!form.id.trim()) return 'Provider ID is required';
    if (!form.name.trim()) return 'Provider name is required';
    if (!form.affiliateId.trim()) return 'Affiliate ID is required';
    if (!form.callbackUrl.trim() && !callbackUrl) return 'Callback URL is required';
    if (!form.webhookUrl.trim()) return 'Webhook URL is required';
    
    const sum = form.userSharePct + form.platformSharePct;
    if (Math.abs(sum - 1.0) > 0.001) return `User + Platform share must equal 100% (currently ${(sum * 100).toFixed(1)}%)`;
    if (form.minimumReward < 0) return 'Minimum reward cannot be negative';
    if (form.maximumReward <= 0) return 'Maximum reward must be greater than 0';
    if (form.minimumReward >= form.maximumReward) return 'Minimum reward must be less than maximum reward';
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    if (!currentUser) return;

    setError(null);
    setSubmitting(true);
    try {
      const token = await currentUser.getIdToken();

      // Build payload — only include secret/apiKey if non-empty (edit mode blanks them for security)
      const payload: Record<string, any> = {
        name: form.name.trim(),
        enabled: form.enabled,
        affiliateId: form.affiliateId.trim(),
        callbackUrl: form.callbackUrl.trim() || callbackUrl,
        webhookUrl: form.webhookUrl.trim(),
        rewardMultiplier: form.rewardMultiplier,
        userSharePct: form.userSharePct,
        platformSharePct: form.platformSharePct,
        minimumReward: form.minimumReward,
        maximumReward: form.maximumReward,
        fraudRules: form.fraudRules,
      };
      if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim();
      if (form.secret.trim()) payload.secret = form.secret.trim();

      const targetId = form.id.trim().toLowerCase().replace(/\s+/g, '_');
      const res = await safeFetch(`/api/offerwall/providers/${targetId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.success) {
        const errorType = res.error || 'UNKNOWN_ERROR';
        const reason = res.reason || res.message || 'Unknown error';
        
        let message = `Save failed: ${reason}`;
        if (errorType === 'WRITE_VERIFICATION_FAILED') {
          message = `Save failed: ${reason}. Provider was not persisted to Firestore. Please try again.`;
        } else if (errorType === 'CONNECTIVITY_ERROR') {
          message = 'Connection error. Please check your internet and try again.';
        } else if (errorType === 'COMMUNICATION_ERROR') {
          message = 'Communication error. The server returned an invalid response. Please try again.';
        }
        
        throw new Error(message);
      }
      
      const successMsg = res.message || (isNew ? 'Provider created successfully' : 'Provider updated successfully');
      toast.success(successMsg);
      
      // Small delay to allow Firestore listener to update the provider list
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to save provider. Please try again.';
      console.error('[ProviderManagerModal] Save error:', errorMsg);
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const sharePctError =
    Math.abs(form.userSharePct + form.platformSharePct - 1.0) > 0.001
      ? `${((form.userSharePct + form.platformSharePct) * 100).toFixed(1)}% / 100%`
      : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/85 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    {isNew ? 'Add Provider' : `Configure: ${form.name || providerId}`}
                  </h3>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-widest">
                    {isNew ? 'Offerwall Provider Setup' : 'Provider Configuration'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-text-tertiary hover:bg-surface-bright hover:text-text-primary transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}

            {/* Form */}
            {!loading && (
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

                  {/* Identity section */}
                  <Section icon={<Globe size={15} />} title="Identity" subtitle="Provider slug, display name, and status">
                    {isNew && (
                      <>
                        <Field label="Known Provider" hint="Select from the built-in provider list or enter a custom ID below">
                          <div className="grid grid-cols-3 gap-2">
                            {KNOWN_PROVIDERS.map(p => (
                              <button
                                type="button"
                                key={p.id}
                                onClick={() => { handleKnownProvider(p.id); setUseCustomId(false); }}
                                className={cn(
                                  'px-3 py-2 rounded-xl text-[10px] font-bold border transition-all',
                                  form.id === p.id && !useCustomId
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'border-border text-text-tertiary hover:border-primary/30 hover:text-text-primary'
                                )}
                              >
                                {p.name}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => { setUseCustomId(true); setForm(f => ({ ...f, id: '', name: '' })); }}
                              className={cn(
                                'px-3 py-2 rounded-xl text-[10px] font-bold border transition-all',
                                useCustomId
                                  ? 'bg-primary text-white border-primary'
                                  : 'border-border border-dashed text-text-tertiary hover:border-primary/30'
                              )}
                            >
                              Custom
                            </button>
                          </div>
                        </Field>

                        {useCustomId && (
                          <Field label="Provider ID" hint="Lowercase slug, no spaces (e.g. myprovider)" required>
                            <TextInput
                              value={form.id}
                              onChange={v => set('id', v.toLowerCase().replace(/\s+/g, '_'))}
                              placeholder="e.g. myprovider"
                              mono
                            />
                          </Field>
                        )}
                      </>
                    )}

                    {!isNew && (
                      <div className="px-4 py-3 bg-surface-bright border border-border rounded-xl flex items-center gap-3">
                        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Provider ID</span>
                        <span className="text-[12px] font-mono text-text-primary">{providerId}</span>
                      </div>
                    )}

                    <Field label="Display Name" required>
                      <TextInput value={form.name} onChange={v => set('name', v)} placeholder="e.g. Lootably" />
                    </Field>

                    <Toggle
                      value={form.enabled}
                      onChange={v => set('enabled', v)}
                      label="Provider Enabled"
                      subtitle="Disabled providers silently acknowledge but ignore all callbacks"
                    />
                  </Section>

                  {/* Credentials */}
                  <Section icon={<Key size={15} />} title="Credentials" subtitle="API keys and secrets — stored securely, never returned to client">
                    <Field label="Affiliate ID" hint="Your publisher/affiliate ID with this provider">
                      <TextInput value={form.affiliateId} onChange={v => set('affiliateId', v)} placeholder="pub_xxxxx" mono />
                    </Field>
                    <Field
                      label={isNew ? 'API Key' : 'API Key (leave blank to keep existing)'}
                      hint="Used for server-to-server API calls if required by this provider"
                    >
                      <TextInput value={form.apiKey} onChange={v => set('apiKey', v)} placeholder={isNew ? 'sk_live_xxxxx' : '••••••••'} type="password" mono />
                    </Field>
                    <Field
                      label={isNew ? 'Callback Secret' : 'Callback Secret (leave blank to keep existing)'}
                      hint="Used for HMAC/MD5/SHA signature verification on incoming callbacks"
                      required={isNew}
                    >
                      <TextInput value={form.secret} onChange={v => set('secret', v)} placeholder={isNew ? 'your_secret_here' : '••••••••'} type="password" mono />
                    </Field>
                  </Section>

                  {/* Endpoints */}
                  <Section icon={<Globe size={15} />} title="Endpoints" subtitle="Callback and webhook URLs to register with the provider" defaultOpen={false}>
                    <div className="px-4 py-3 bg-primary/5 border border-primary/15 rounded-xl space-y-1">
                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Auto-generated Callback URL</p>
                      <p className="text-[11px] font-mono text-primary break-all">{callbackUrl}</p>
                      <p className="text-[9px] text-text-tertiary">Register this URL in the provider dashboard as your postback/callback endpoint.</p>
                    </div>
                    <Field label="Custom Callback URL" hint="Override the auto-generated URL if you use a custom domain or proxy">
                      <TextInput value={form.callbackUrl} onChange={v => set('callbackUrl', v)} placeholder={callbackUrl} mono />
                    </Field>
                    <Field label="Webhook URL" hint="For providers that push server events (not callbacks)">
                      <TextInput value={form.webhookUrl} onChange={v => set('webhookUrl', v)} placeholder="https://..." mono />
                    </Field>
                  </Section>

                  {/* Economy */}
                  <Section icon={<DollarSign size={15} />} title="Economy" subtitle="Reward multiplier, user/platform split, and reward caps">
                    <Field label="Reward Multiplier" hint="Multiplies raw provider amount before splitting (1.0 = no change, 2.0 = double)">
                      <NumInput value={form.rewardMultiplier} onChange={v => set('rewardMultiplier', v)} min={0.01} max={100} step={0.1} />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="User Share %" hint="Fraction paid to the user (0–1)">
                        <NumInput value={form.userSharePct} onChange={v => set('userSharePct', v)} min={0} max={1} step={0.01} />
                      </Field>
                      <Field label="Platform Share %" hint="Fraction kept by platform (0–1)">
                        <NumInput value={form.platformSharePct} onChange={v => set('platformSharePct', v)} min={0} max={1} step={0.01} />
                      </Field>
                    </div>

                    {/* Share sum indicator */}
                    <div className={cn(
                      'flex items-center justify-between px-4 py-2.5 rounded-xl border text-[11px] font-semibold',
                      sharePctError
                        ? 'bg-danger/5 border-danger/15 text-danger'
                        : 'bg-success/5 border-success/15 text-success'
                    )}>
                      <span>Total Distribution</span>
                      <span className="font-mono font-bold">
                        {((form.userSharePct + form.platformSharePct) * 100).toFixed(1)}%
                        {sharePctError ? ` — must be 100%` : ' — OK'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Minimum Reward (PTS)" hint="Callbacks below this value are rejected">
                        <NumInput value={form.minimumReward} onChange={v => set('minimumReward', v)} min={0} step={1} />
                      </Field>
                      <Field label="Maximum Reward (PTS)" hint="Callbacks above this value are capped or rejected">
                        <NumInput value={form.maximumReward} onChange={v => set('maximumReward', v)} min={1} step={100} />
                      </Field>
                    </div>
                  </Section>

                  {/* Fraud Rules */}
                  <Section icon={<Lock size={15} />} title="Fraud Rules" subtitle="Per-user rate limits and anti-fraud controls" defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Max Rewards / User / Day">
                        <NumInput
                          value={form.fraudRules.maxRewardsPerUserPerDay}
                          onChange={v => setFraud('maxRewardsPerUserPerDay', v)}
                          min={1} step={1}
                        />
                      </Field>
                      <Field label="Max Points / User / Day">
                        <NumInput
                          value={form.fraudRules.maxRewardAmountPerDay}
                          onChange={v => setFraud('maxRewardAmountPerDay', v)}
                          min={0} step={100}
                        />
                      </Field>
                    </div>
                    <Field label="Min Time Between Rewards (sec)">
                      <NumInput
                        value={form.fraudRules.minTimeBetweenRewardsSec}
                        onChange={v => setFraud('minTimeBetweenRewardsSec', v)}
                        min={0} step={5}
                      />
                    </Field>
                    <div className="space-y-2">
                      <Toggle
                        value={form.fraudRules.blockVPN}
                        onChange={v => setFraud('blockVPN', v)}
                        label="Block VPN / Proxy"
                        subtitle="Reject callbacks from known VPN/proxy IPs"
                      />
                      <Toggle
                        value={form.fraudRules.blockDuplicateIp}
                        onChange={v => setFraud('blockDuplicateIp', v)}
                        label="Block Duplicate IPs"
                        subtitle="Reject multiple rewards from the same IP per session"
                      />
                    </div>
                  </Section>

                </div>

                {/* Error */}
                {error && (
                  <div className="mx-6 mb-2 flex items-center gap-2 px-4 py-3 bg-danger/8 border border-danger/15 rounded-xl">
                    <AlertTriangle size={14} className="text-danger shrink-0" />
                    <p className="text-[11px] font-semibold text-danger">{error}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-border text-text-tertiary hover:text-text-primary hover:bg-surface-bright transition-all text-[11px] font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    isLoading={submitting}
                    className="flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest"
                  >
                    <Save size={13} className="mr-1.5" />
                    {isNew ? 'Create Provider' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProviderManagerModal;
