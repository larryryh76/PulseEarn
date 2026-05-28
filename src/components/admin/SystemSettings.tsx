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
  Save,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

const SystemSettings: React.FC = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'SECURITY' | 'PREFERENCES'>('IDENTITY');
  const [showPassword, setShowPassword] = useState(false);

  if (!userData) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Operational Parameters</h2>
          <h1 className="text-3xl font-bold">System Settings</h1>
        </div>

        <div className="flex bg-white/[0.02] border border-white/[0.05] p-1.5 rounded-2xl">
          {(['IDENTITY', 'SECURITY', 'PREFERENCES'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${
                activeTab === tab
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'IDENTITY' && (
            <div className="glass-card border-white/[0.05] rounded-[3rem] p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Display Username</label>
                  <div className="relative group">
                    <User size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      defaultValue={userData.username}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Email Authority</label>
                  <div className="relative group">
                    <Mail size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                      type="email"
                      disabled
                      defaultValue={userData.email || ''}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white/20 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Bio / Status Update</label>
                <textarea
                  placeholder="Update your ecosystem status..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none min-h-[120px] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <p className="text-[10px] font-medium text-white/20">Last identification update: Oct 24, 2023</p>
                <button className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all">
                  <Save size={14} />
                  Synchronize Identity
                </button>
              </div>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div className="space-y-6">
              <div className="glass-card border-white/[0.05] rounded-[3rem] p-10 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-xl font-bold tracking-tight">Credential Management</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">New Password</label>
                      <div className="relative group">
                        <Lock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-12 text-sm font-bold focus:border-primary outline-none"
                        />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">Confirm Update</label>
                      <div className="relative group">
                        <Lock size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <RotateCcw size={14} />
                    Reset via Email Authority
                  </button>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">Two-Factor Authentication</h3>
                      <p className="text-xs text-white/40 mt-1">Multi-layered security for high-value rewards.</p>
                    </div>
                    <div className="w-12 h-6 bg-primary/20 rounded-full relative cursor-pointer border border-primary/20">
                      <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-primary rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card border-rose-500/10 bg-rose-500/[0.02] rounded-[3rem] p-10 space-y-6">
                <div className="flex items-center gap-3 text-rose-500">
                  <AlertTriangle size={24} />
                  <h3 className="text-xl font-bold tracking-tight">Deactivation Area</h3>
                </div>
                <p className="text-sm text-rose-500/60 leading-relaxed">
                  Initiating deactivation will permanently revoke your clearance and forfeit all Pulse balances. This action is immutable and cannot be reversed by system admins.
                </p>
                <button className="px-8 py-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/20 transition-all">
                  Request Account Deletion
                </button>
              </div>
            </div>
          )}

          {activeTab === 'PREFERENCES' && (
             <div className="glass-card border-white/[0.05] rounded-[3rem] p-10 space-y-10">
                <div className="space-y-6">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                         <Bell size={16} className="text-white/40" />
                      </div>
                      <h3 className="text-lg font-bold">Signal Notifications</h3>
                   </div>

                   <div className="space-y-4">
                      {[
                        { title: 'Reward Distributions', desc: 'Alert when missions are successfully settled.' },
                        { title: 'Ecosystem Updates', desc: 'Pulse-core infrastructure and policy changes.' },
                        { title: 'Security Alerts', desc: 'Login activity and suspicious attempt monitoring.' },
                        { title: 'Growth Alerts', desc: 'Notification when affiliates register via your code.' }
                      ].map((pref, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl group hover:border-white/10 transition-all">
                           <div className="space-y-1">
                              <p className="text-sm font-bold text-white/80">{pref.title}</p>
                              <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">{pref.desc}</p>
                           </div>
                           <div className="w-12 h-6 bg-white/5 rounded-full relative cursor-pointer border border-white/10">
                              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white/20 rounded-full" />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] space-y-6">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-primary" />
              <h4 className="text-base font-bold">Security Context</h4>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between items-center pb-5 border-b border-white/5">
                <div>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Auth Integrity</p>
                  <p className="text-sm font-bold mt-1">Maximum Strength</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Shield size={14} />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Recovery Logic</p>
                  <p className="text-sm font-bold mt-1 text-white/40">Not Configured</p>
                </div>
                <button className="text-[9px] font-bold uppercase tracking-widest text-primary">Setup</button>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] space-y-6">
             <h4 className="text-base font-bold">Active Sessions</h4>
             <div className="space-y-4">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
                      <Monitor size={18} />
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-bold">Chrome / MacOS</p>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Current Authority</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 opacity-40">
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
                      <Smartphone size={18} />
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-bold">Mobile App / iOS</p>
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Logged 14h ago</p>
                   </div>
                   <button className="text-[9px] font-bold text-rose-500 uppercase">Revoke</button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
