import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Monitor,
  Smartphone,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle,
  Globe,
  Fingerprint,
  SmartphoneNfc,
  Key
} from 'lucide-react';
import { cn } from '../../utils';

const SystemSettings: React.FC = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'ACCOUNT' | 'SECURITY' | 'PREFERENCES'>('ACCOUNT');
  const [showPassword, setShowPassword] = useState(false);

  if (!userData) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24 animate-in">

      {/* Settings Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-10">
        <div className="space-y-1">
          <h2 className="section-label pr-10">Account Control</h2>
          <h1 className="text-4xl font-bold tracking-tight">System Settings</h1>
          <p className="text-sm text-white/40 font-medium">Manage your account and active security parameters.</p>
        </div>

        <div className="flex bg-white/[0.03] border border-white/[0.08] p-1.5 rounded-2xl">
          {(['ACCOUNT', 'SECURITY', 'PREFERENCES'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                activeTab === tab
                  ? "bg-primary text-white shadow-xl shadow-primary/20"
                  : "text-white/30 hover:text-white/60"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

        {/* Main Configuration column (8 cols) */}
        <div className="lg:col-span-8 space-y-10">

          {activeTab === 'ACCOUNT' && (
            <div className="glass-panel border-white/10 rounded-[3rem] p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Display Alias</label>
                  <div className="relative group">
                    <User size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      defaultValue={userData.username}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">System Email</label>
                  <div className="relative group">
                    <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                      type="email"
                      disabled
                      defaultValue={userData.email || ''}
                      className="w-full bg-white/[0.01] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white/20 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Account Bio</label>
                <textarea
                  placeholder="Update your ecosystem status or bio..."
                  className="w-full bg-black/40 border border-white/5 rounded-[2rem] p-6 text-sm font-medium focus:border-primary outline-none min-h-[140px] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-8 border-t border-white/5">
                <div className="flex items-center gap-2">
                   <Globe size={14} className="text-emerald-500/50" />
                   <p className="text-[10px] font-medium text-white/20">Authorized on Global Network</p>
                </div>
                <button className="btn-primary">
                  Synchronize
                </button>
              </div>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div className="space-y-10">
              <div className="glass-panel border-white/10 rounded-[3rem] p-10 space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <Key size={18} className="text-primary" />
                     <h3 className="text-xl font-bold tracking-tight">Credential Sync</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">New Access Key</label>
                      <div className="relative group">
                        <Lock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-12 text-sm font-bold focus:border-primary outline-none"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">Verify Update</label>
                      <div className="relative group">
                        <Lock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 transition-colors" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <RotateCcw size={14} />
                    Reset via Email System
                  </button>
                </div>

                <div className="pt-10 border-t border-white/5 flex items-center justify-between">
                   <div className="space-y-1">
                      <h4 className="font-bold">Multi-Factor Authentication</h4>
                      <p className="text-xs text-white/40">Secure your high-value assets with hardware or app-based 2FA.</p>
                   </div>
                   <div className="w-12 h-6 bg-primary/20 rounded-full relative cursor-pointer border border-primary/30">
                      <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(0,102,255,0.5)]" />
                   </div>
                </div>
              </div>

              <div className="glass-panel border-rose-500/20 bg-rose-500/[0.01] rounded-[3rem] p-10 space-y-6">
                <div className="flex items-center gap-3 text-rose-500">
                  <AlertTriangle size={24} />
                  <h3 className="text-xl font-bold tracking-tight">Deactivation Area</h3>
                </div>
                <p className="text-sm text-rose-500/60 leading-relaxed max-w-2xl font-medium">
                  Initiating deactivation will permanently revoke your authorization and forfeit all accumulated PTS balances. This action is cryptographically signed and immutable.
                </p>
                <button className="px-8 py-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-500/20 transition-all">
                  Ban Account Identification
                </button>
              </div>
            </div>
          )}

          {activeTab === 'PREFERENCES' && (
             <div className="glass-panel border-white/10 rounded-[3rem] p-10 space-y-10">
                <div className="space-y-8">
                   <div className="flex items-center gap-3">
                      <Bell size={18} className="text-primary" />
                      <h3 className="text-xl font-bold">Signal Notifications</h3>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { title: 'Reward Distributions', desc: 'Alerts for successful task settlements.' },
                        { title: 'Security Context', desc: 'Login activity and suspicious attempt signals.' },
                        { title: 'Ecosystem Logs', desc: 'System updates and policy changes.' },
                        { title: 'Growth Signals', desc: 'Alerts for new affiliate registrations.' }
                      ].map((pref, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-white/[0.01] border border-white/5 rounded-3xl group hover:border-primary/20 transition-all">
                           <div className="space-y-1 pr-6">
                              <p className="text-sm font-bold text-white/80">{pref.title}</p>
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter leading-tight">{pref.desc}</p>
                           </div>
                           <div className="w-10 h-5 bg-white/5 rounded-full relative cursor-pointer border border-white/10 shrink-0">
                              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white/20 rounded-full" />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          )}
        </div>

        {/* Account Context sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-10">

          <div className="glass-panel p-8 rounded-[2.5rem] space-y-8">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-primary" />
              <h4 className="text-base font-bold">Security Context</h4>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center pb-6 border-b border-white/[0.03]">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Auth Integrity</p>
                  <p className="text-sm font-bold text-emerald-500">Maximum</p>
                </div>
                <Shield size={20} className="text-emerald-500/40" />
              </div>

              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Recovery Flow</p>
                  <p className="text-sm font-bold text-white/40 italic">Unauthorized</p>
                </div>
                <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80">Deploy</button>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2.5rem] space-y-8">
             <div className="flex items-center gap-3">
                <Fingerprint size={18} className="text-primary" />
                <h4 className="text-base font-bold">Active Sessions</h4>
             </div>
             <div className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
                      <Monitor size={18} />
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-bold text-white/80">Chrome / macOS</p>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Current Instance</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 opacity-40 group">
                   <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40 group-hover:text-rose-500/60 transition-colors">
                      <Smartphone size={18} />
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-bold">Mobile App / iOS</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5 text-white/20">Logged 14h ago</p>
                   </div>
                   <button className="text-[9px] font-bold text-rose-500 uppercase hover:underline">Revoke</button>
                </div>
             </div>
          </div>

          <div className="p-8 border border-white/[0.05] rounded-[2.5rem] bg-white/[0.01]">
             <div className="flex items-center gap-3 mb-4">
                <SmartphoneNfc size={16} className="text-primary/40" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Device Authorization</span>
             </div>
             <p className="text-xs text-white/40 leading-relaxed font-medium">
                System utilizes cryptographically verified device fingerprinting to ensure account persistence across ecosystem modules.
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
