import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, X, Key, Globe, AlertTriangle,
  ChevronDown, ChevronRight,
  Save, Lock, DollarSign, RefreshCw, Copy, Check
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

interface IdentityFieldState {
  fieldName: string;
  value: string;
  required: boolean;
  hasValue?: boolean;
}

const STANDARD_IDENTITY_FIELDS = [
  { key: 'publisherId', name: 'Publisher ID' },
  { key: 'affiliateId', name: 'Affiliate ID' },
  { key: 'appId', name: 'Application ID' },
  { key: 'siteId', name: 'Site ID' },
  { key: 'propertyId', name: 'Property ID' },
  { key: 'placementId', name: 'Placement ID' },
  { key: 'zoneId', name: 'Zone ID' },
  { key: 'appToken', name: 'App Token' },
  { key: 'clientId', name: 'Client ID' },
  { key: 'apiKey', name: 'API Key' },
  { key: 'secret', name: 'Secret' }
];

interface ProviderForm {
  id: string;
  name: string;
  logo: string;
  status: 'active' | 'degraded' | 'maintenance' | 'offline';
  description: string;
  apiEndpoint: string;
  enabled: boolean;
  affiliateId: string;
  apiKey: string;
  secret: string;
  identity: Record<string, IdentityFieldState>;
  integrationUrl: string;
  callbackUrl: string;
  webhookUrl: string;
  rewardMultiplier: number;
  userSharePct: number;
  platformSharePct: number;
  minimumReward: number;
  maximumReward: number;
  dailyCap: number;
  cooldownSeconds: number;
  priority: number;
  fraudThreshold: number;
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
  logo: '',
  status: 'active',
  description: '',
  apiEndpoint: '',
  enabled: true,
  affiliateId: '',
  apiKey: '',
  secret: '',
  identity: {},
  integrationUrl: '',
  callbackUrl: '',
  webhookUrl: '',
  rewardMultiplier: 1.0,
  userSharePct: 0.85,
  platformSharePct: 0.15,
  minimumReward: 1,
  maximumReward: 100000,
  dailyCap: 0,
  cooldownSeconds: 0,
  priority: 100,
  fraudThreshold: 80,
  fraudRules: DEFAULT_FRAUD_RULES,
};

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
  const [presets, setPresets] = useState<any[]>([]);
  const [validationReport, setValidationReport] = useState<any | null>(null);

  // Derive callback URL from provider id
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${origin}/api/offerwall/callback/${form.id || '[provider-id]'}`;

  // Load registry presets from backend
  useEffect(() => {
    const loadRegistry = async () => {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const res = await safeFetch('/api/offerwall/registry', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.success && res.presets) {
          setPresets(res.presets);
          if (!isNew && providerId) {
            loadProvider(res.presets);
          }
        }
      } catch (err) {
        console.error('Failed to load registry presets:', err);
      }
    };
    if (isOpen) {
      loadRegistry();
      setValidationReport(null);
    }
  }, [isOpen, currentUser, isNew, providerId]);

  // Load existing provider data when editing
  const loadProvider = useCallback(async (loadedPresets?: any[]) => {
    if (!providerId || !currentUser) return;
    setLoading(true);
    try {
      const token = await currentUser.getIdToken();

      // Load presets if not passed or empty
      let activePresets = loadedPresets || presets;
      if (activePresets.length === 0) {
        const regRes = await safeFetch('/api/offerwall/registry', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (regRes.success && regRes.presets) {
          activePresets = regRes.presets;
          setPresets(regRes.presets);
        }
      }

      const res = await safeFetch('/api/offerwall/providers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) {
        const found = (res.providers || []).find((p: any) => p.id === providerId);
        if (found) {
          // Resolve identity fields dynamically from presets if not saved yet
          const preset = activePresets.find(p => p.slug === found.id);
          const initialIdentity: Record<string, { fieldName: string; value: string; required: boolean; hasValue?: boolean }> = {};

          if (found.identity && Object.keys(found.identity).length > 0) {
            Object.entries(found.identity).forEach(([key, field]: [string, any]) => {
              initialIdentity[key] = {
                fieldName: field.fieldName || key,
                value: '', // Keep value as empty so it is masked/redacted in UI
                required: !!field.required,
                hasValue: field.hasValue ?? true
              };
            });
          } else if (preset && preset.identityFields) {
            Object.entries(preset.identityFields).forEach(([key, field]: [string, any]) => {
              let val = '';
              if (key === 'apiKey') val = found.apiKey || '';
              else if (key === 'secret') val = found.secret || '';
              else val = found.affiliateId || '';

              initialIdentity[key] = {
                fieldName: field.name || field.label || key,
                value: '', // Redact raw credentials on load
                required: !!field.required,
                hasValue: !!val
              };
            });
          }

          setForm({
            id: found.id || '',
            name: found.name || '',
            logo: found.logo || found.logoUrl || '',
            status: found.status || 'active',
            description: found.description || '',
            apiEndpoint: found.apiEndpoint || found.integrationUrl || '',
            enabled: found.enabled ?? true,
            affiliateId: found.affiliateId || '',
            apiKey: '',   // never pre-populated for security
            secret: '',   // never pre-populated for security
            identity: initialIdentity,
            integrationUrl: found.integrationUrl || '',
            callbackUrl: found.callbackUrl || '',
            webhookUrl: found.webhookUrl || '',
            rewardMultiplier: found.rewardMultiplier ?? 1.0,
            userSharePct: found.userSharePct ?? 0.85,
            platformSharePct: found.platformSharePct ?? 0.15,
            minimumReward: found.minimumReward ?? 1,
            maximumReward: found.maximumReward ?? 100000,
            dailyCap: found.dailyCap ?? 0,
            cooldownSeconds: found.cooldownSeconds ?? 0,
            priority: found.priority ?? 100,
            fraudThreshold: found.fraudThreshold ?? 80,
            fraudRules: { ...DEFAULT_FRAUD_RULES, ...(found.fraudRules || {}) },
          });
        }
      }
    } catch {
      toast.error('Failed to load provider config');
    } finally {
      setLoading(false);
    }
  }, [providerId, currentUser, presets]);

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

  const [regenerating, setRegenerating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  const regenerateSecret = async () => {
    if (!providerId || !currentUser) return;
    if (!window.confirm('Regenerate the callback secret? The provider dashboard must be updated with the new value or callbacks will fail.')) return;
    setRegenerating(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch(`/api/offerwall/providers/${providerId}/regenerate-secret`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success && res.secret) {
        setNewSecret(res.secret);
        toast.success('New secret generated — copy it now');
      } else {
        toast.error(res.message || 'Failed to regenerate secret');
      }
    } catch {
      toast.error('Regenerate request failed');
    } finally {
      setRegenerating(false);
    }
  };

  const copySecret = () => {
    if (!newSecret) return;
    navigator.clipboard.writeText(newSecret).then(() => {
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    });
  };

  // Auto-fill name from known provider
  const handleKnownProvider = (id: string) => {
    const preset = presets.find(p => p.slug === id);
    const presetIdentity: Record<string, IdentityFieldState> = {};
    if (preset && preset.identityFields) {
      Object.entries(preset.identityFields).forEach(([key, f]: [string, any]) => {
        presetIdentity[key] = {
          fieldName: f.name || f.label || key,
          value: '',
          required: !!f.required
        };
      });
    }
    setForm(f => ({
      ...f,
      id: id,
      name: preset?.label || id,
      callbackUrl: `${origin}/api/offerwall/callback/${id}`,
      identity: presetIdentity
    }));
  };

  const validate = (): string | null => {
    if (!form.id.trim()) return 'Provider ID is required';
    if (!form.name.trim()) return 'Provider name is required';
    if (!form.callbackUrl.trim() && !callbackUrl) return 'Callback URL is required';
    
    // Validate generic identity fields
    for (const field of Object.values(form.identity || {})) {
      // If the field is required, it must have a non-empty value OR already have a stored value
      const fieldHasVal = field.value?.trim() || field.hasValue;
      if (field.required && !fieldHasVal) {
        return `${field.fieldName} is required`;
      }
    }

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

      // Build identity payload
      const payloadIdentity = { ...form.identity };

      // Auto-populate legacy fields from dynamic identity to maintain 100% database compatibility
      let payloadAffiliateId = form.affiliateId.trim();
      const legacyAffKeys = ['publisherId', 'placementId', 'wallId', 'appId', 'adgateId', 'clientId', 'token', 'affiliateId'];
      for (const key of legacyAffKeys) {
        if (form.identity[key]?.value) {
          payloadAffiliateId = form.identity[key].value.trim();
          break;
        }
      }

      let payloadSecret = form.secret.trim();
      if (form.identity['secret']?.value) {
        payloadSecret = form.identity['secret'].value.trim();
      }

      let payloadApiKey = form.apiKey.trim();
      if (form.identity['apiKey']?.value) {
        payloadApiKey = form.identity['apiKey'].value.trim();
      }

      // Build payload — only include secret/apiKey if non-empty (edit mode blanks them for security)
      const resolvedCallbackUrl = form.callbackUrl.trim() || callbackUrl;
      const payload: Record<string, any> = {
        name: form.name.trim(),
        logo: form.logo.trim(),
        logoUrl: form.logo.trim(),
        status: form.status,
        description: form.description.trim(),
        apiEndpoint: form.apiEndpoint.trim(),
        enabled: form.enabled,
        affiliateId: payloadAffiliateId,
        identity: payloadIdentity, // Send our generic identity map!
        integrationUrl: form.integrationUrl.trim(),
        callbackUrl: resolvedCallbackUrl,
        webhookUrl: form.webhookUrl.trim() || resolvedCallbackUrl,
        rewardMultiplier: form.rewardMultiplier,
        userSharePct: form.userSharePct,
        platformSharePct: form.platformSharePct,
        minimumReward: form.minimumReward,
        maximumReward: form.maximumReward,
        dailyCap: form.dailyCap,
        cooldownSeconds: form.cooldownSeconds,
        priority: form.priority,
        fraudThreshold: form.fraudThreshold,
        fraudRules: form.fraudRules,
      };
      if (payloadApiKey) payload.apiKey = payloadApiKey;
      if (payloadSecret) payload.secret = payloadSecret;

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
        if (res.validation_report) {
          setValidationReport(res.validation_report);
        }
        const errorType = res.error || 'UNKNOWN_ERROR';
        const reason = res.reason || res.message || 'An unexpected error occurred';
        
        let message = reason;
        if (errorType === 'MISSING_REQUIRED_FIELDS') {
          message = `Missing required fields: ${reason}`;
        } else if (errorType === 'WRITE_VERIFICATION_FAILED') {
          message = 'Provider was created but could not be verified. Please refresh and try again.';
        } else if (errorType === 'NO_VALID_FIELDS') {
          message = 'No valid provider fields were provided. Please fill the form.';
        } else if (errorType === 'CONNECTIVITY_ERROR') {
          message = 'Connection error. Please check your internet and try again.';
        } else if (errorType === 'COMMUNICATION_ERROR') {
          message = 'Server communication error. Please try again.';
        }
        
        throw new Error(message);
      }
      
      const successMsg = res.message || (isNew ? 'Provider created successfully' : 'Provider updated successfully');
      toast.success(successMsg);

      // Immediately certify the connection using the same local checks the TEST
      // button runs, so a correctly-configured provider flips to "Connected"
      // right away instead of lingering on "Disconnected" until manually tested.
      try {
        await safeFetch(`/api/offerwall/providers/${targetId}/test`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* non-fatal: the per-card TEST button remains available */
      }

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

  const activePreset = presets.find(p => p.slug === form.id);

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
                            {presets.map(p => (
                              <button
                                type="button"
                                key={p.slug}
                                onClick={() => { handleKnownProvider(p.slug); setUseCustomId(false); }}
                                className={cn(
                                  'px-3 py-2 rounded-xl text-[10px] font-bold border transition-all',
                                  form.id === p.slug && !useCustomId
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'border-border text-text-tertiary hover:border-primary/30 hover:text-text-primary'
                                )}
                              >
                                {p.label}
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
                      <TextInput value={form.name} onChange={v => set('name', v)} placeholder="e.g. My Provider" />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Logo URL" hint="Direct HTTPS link to provider logo image">
                        <TextInput value={form.logo} onChange={v => set('logo', v)} placeholder="https://example.com/logo.png" />
                      </Field>

                      <Field label="Status" hint="Operational status displayed to users">
                        <select
                          value={form.status}
                          onChange={e => set('status', e.target.value as any)}
                          className="w-full px-4 py-2.5 bg-surface-bright border border-border rounded-xl text-[12px] font-semibold text-text-primary focus:outline-none focus:border-primary transition-all"
                        >
                          <option value="active">Active</option>
                          <option value="degraded">Degraded</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="offline">Offline</option>
                        </select>
                      </Field>
                    </div>

                    <Field label="Description" hint="Brief summary of tasks & rewards offered by this provider">
                      <TextInput value={form.description} onChange={v => set('description', v)} placeholder="e.g. Complete surveys, watch videos, and install apps" />
                    </Field>

                    <Field label="Priority Order" hint="Lower numbers appear first in Marketplace (1, 2, 3...)">
                      <NumInput value={form.priority} onChange={v => set('priority', v)} min={1} max={999} step={1} />
                    </Field>

                    <Toggle
                      value={form.enabled}
                      onChange={v => set('enabled', v)}
                      label="Provider Enabled"
                      subtitle="Disabled providers will not appear in the Marketplace"
                    />
                  </Section>

                  {/* Provider Identity */}
                  <Section icon={<Key size={15} />} title="Provider Identity" subtitle="Configure provider-specific identity credentials & signature parameters">
                    <div className="space-y-4">
                      {Object.entries(form.identity || {}).map(([key, field]) => {
                        const isSecret = key === 'secret' || key === 'apiKey' || key === 'appToken' || key === 'token';
                        const labelText = isNew ? field.fieldName : `${field.fieldName} (leave blank to keep existing)`;
                        return (
                          <Field key={key} label={labelText} required={field.required}>
                            <TextInput
                              value={field.value}
                              onChange={(v) => {
                                setForm(f => ({
                                  ...f,
                                  identity: {
                                    ...f.identity,
                                    [key]: {
                                      ...f.identity[key],
                                      value: v
                                    }
                                  }
                                }));
                              }}
                              placeholder={isNew ? `Enter ${field.fieldName}` : (field.hasValue ? (isSecret ? "••••••••" : "Configured") : `Enter ${field.fieldName}`)}
                              type={isSecret ? 'password' : 'text'}
                              mono
                            />
                          </Field>
                        );
                      })}

                      {/* Dropdown to add custom identity fields if Custom provider is chosen */}
                      {(useCustomId || !activePreset) && (
                        <div className="pt-2">
                          <label className="text-[10px] font-bold uppercase tracking-[0.25em] text-text-tertiary block mb-1.5">Add Identity Parameter</label>
                          <select
                            onChange={(e) => {
                              const selectedKey = e.target.value;
                              if (!selectedKey) return;
                              const stdField = STANDARD_IDENTITY_FIELDS.find(f => f.key === selectedKey);
                              if (stdField) {
                                setForm(f => ({
                                  ...f,
                                  identity: {
                                    ...f.identity,
                                    [selectedKey]: {
                                      fieldName: stdField.name,
                                      value: '',
                                      required: true
                                    }
                                  }
                                }));
                              }
                              e.target.value = '';
                            }}
                            className="w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-2.5 text-xs text-text-primary focus:outline-none focus:border-primary transition-all cursor-pointer"
                          >
                            <option value="">+ Configure New Identity Field...</option>
                            {STANDARD_IDENTITY_FIELDS.filter(f => !form.identity?.[f.key]).map(f => (
                              <option key={f.key} value={f.key}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* Endpoints */}
                  <Section icon={<Globe size={15} />} title="Endpoints" subtitle="Callback and webhook URLs to register with the provider" defaultOpen={false}>
                    <div className="px-4 py-3 bg-primary/5 border border-primary/15 rounded-xl space-y-1">
                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Auto-generated Callback URL</p>
                      <p className="text-[11px] font-mono text-primary break-all">{callbackUrl}</p>
                      <p className="text-[9px] text-text-tertiary">Register this URL in the provider dashboard as your postback/callback endpoint.</p>
                    </div>
                    <Field
                      label="Integration / Launch URL"
                      hint="Paste the exact offerwall URL from the provider dashboard. Use a placeholder where the user ID goes (e.g. USER_ID, (UNIQUE_USER_ID), or {uid}) — the backend injects the authenticated user's UID. Leave blank to use the built-in provider template."
                    >
                      <TextInput
                        value={form.integrationUrl}
                        onChange={v => set('integrationUrl', v)}
                        placeholder="https://timewall.io/earn/PLACEMENT?userID=USER_ID"
                        mono
                      />
                    </Field>
                    <Field label="API Endpoint URL" hint="Direct REST API endpoint for inventory syncing or status checks">
                      <TextInput value={form.apiEndpoint} onChange={v => set('apiEndpoint', v)} placeholder="https://api.provider.com/v1" mono />
                    </Field>
                    <Field label="Custom Callback URL" hint="Override the auto-generated URL if you use a custom domain or proxy">
                      <TextInput value={form.callbackUrl} onChange={v => set('callbackUrl', v)} placeholder={callbackUrl} mono />
                    </Field>
                    <Field label="Webhook URL" hint="For providers that push server events (not callbacks)">
                      <TextInput value={form.webhookUrl} onChange={v => set('webhookUrl', v)} placeholder="https://..." mono />
                    </Field>
                  </Section>

                  {/* Webhook Security — edit mode only */}
                  {!isNew && (
                    <Section icon={<Lock size={15} />} title="Webhook Security" subtitle="Rotate the signing secret used to verify incoming callbacks" defaultOpen={false}>
                      <div className="px-4 py-3 bg-warning/5 border border-warning/15 rounded-xl">
                        <p className="text-[10px] text-warning font-semibold">
                          Rotating the secret immediately invalidates the old one. Update the provider dashboard right away or callbacks will fail signature verification.
                        </p>
                      </div>
                      {newSecret && (
                        <div className="px-4 py-3 bg-surface-bright border border-border rounded-xl space-y-2">
                          <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">New Secret (copy now — shown once)</p>
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-[11px] font-mono text-primary break-all">{newSecret}</span>
                            <button
                              type="button"
                              onClick={copySecret}
                              className="p-1.5 rounded-lg hover:bg-surface-accent text-text-tertiary hover:text-primary transition-all shrink-0"
                            >
                              {secretCopied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={regenerateSecret}
                        disabled={regenerating}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-danger/20 bg-danger/5 text-danger text-[11px] font-bold uppercase tracking-widest hover:bg-danger/10 transition-all disabled:opacity-50"
                      >
                        {regenerating ? <div className="w-3.5 h-3.5 border border-danger/40 border-t-danger rounded-full animate-spin" /> : <RefreshCw size={13} />}
                        Regenerate Secret
                      </button>
                    </Section>
                  )}

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

                  {/* Revenue Configuration */}
                  <Section icon={<DollarSign size={15} />} title="Revenue Configuration" subtitle="Caps, cooldown, routing priority, and fraud sensitivity" defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Daily Cap (PTS)" hint="Max points this provider can award per day (0 = unlimited)">
                        <NumInput value={form.dailyCap} onChange={v => set('dailyCap', v)} min={0} step={1000} />
                      </Field>
                      <Field label="Cooldown (sec)" hint="Minimum seconds between offers shown to a user (0 = none)">
                        <NumInput value={form.cooldownSeconds} onChange={v => set('cooldownSeconds', v)} min={0} step={5} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Routing Priority" hint="Lower number = higher priority in failover ordering">
                        <NumInput value={form.priority} onChange={v => set('priority', v)} min={1} step={1} />
                      </Field>
                      <Field label="Fraud Threshold" hint="Risk score (0–100) above which callbacks are blocked">
                        <NumInput value={form.fraudThreshold} onChange={v => set('fraudThreshold', v)} min={0} max={100} step={1} />
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

                {/* Validation Report */}
                {validationReport && validationReport.checks && (
                  <div className="mx-6 mb-4 p-4 bg-surface-bright border border-border rounded-xl space-y-3">
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                      Backend Validation Report
                    </p>
                    <div className="space-y-2">
                      {validationReport.checks.map((check: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          {check.status === 'PASS' ? (
                            <Check className="text-success mt-0.5 shrink-0" size={14} />
                          ) : (
                            <X className="text-danger mt-0.5 shrink-0" size={14} />
                          )}
                          <div>
                            <p className={cn('font-semibold text-[11px]', check.status === 'PASS' ? 'text-text-primary' : 'text-danger')}>
                              {check.name}
                            </p>
                            <p className="text-[10px] text-text-tertiary">{check.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
