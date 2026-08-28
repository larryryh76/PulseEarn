import React from 'react';
import { Link } from 'react-router-dom';
import { Pickaxe, HelpCircle, CheckCircle2 } from 'lucide-react';

export const PSEMineFooter: React.FC = () => {
  return (
    <footer className="bg-[#050811] border-t border-slate-800 text-slate-400 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand & Campaign Summary */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Pickaxe className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-white tracking-tight">PSEmine</span>
              <span className="text-[10px] bg-blue-950/80 text-blue-400 border border-blue-800/40 px-1.5 py-0.5 rounded font-mono font-semibold">
                90-DAY GENESIS
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              A 90-day Genesis computational node in the PulseEarn ecosystem. Cloud hardware units drive real-time GBP accrual with crypto settlement upon campaign completion.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">
              Mining Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/mine" className="hover:text-blue-400 transition-colors">Campaign Overview</Link>
              </li>
              <li>
                <Link to="/mine/dashboard" className="hover:text-blue-400 transition-colors">Mining Operations</Link>
              </li>
              <li>
                <Link to="/mine/tools" className="hover:text-blue-400 transition-colors">Hardware Marketplace</Link>
              </li>
              <li>
                <Link to="/mine/wallet" className="hover:text-blue-400 transition-colors">Wallet & Payouts</Link>
              </li>
              <li>
                <Link to="/mine/referrals" className="hover:text-blue-400 transition-colors">Referral Accelerator</Link>
              </li>
              <li>
                <Link to="/mine/me" className="hover:text-blue-400 transition-colors">Account & Preferences</Link>
              </li>
            </ul>
          </div>

          {/* Economic Standards */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">
              Economic Rules
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Accounting: <strong className="text-slate-200">GBP (£)</strong></span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Payment: <strong className="text-slate-200">BNB (BEP-20)</strong></span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Max Hardware: <strong className="text-slate-200">£10.60/hr</strong></span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Ceiling Rate: <strong className="text-slate-200">£12.10/hr</strong></span>
              </li>
            </ul>
          </div>

          {/* Compliance & Security */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">
              Transparency & Security
            </h4>
            <div className="space-y-2 text-xs">
              <p className="text-slate-400 leading-relaxed">
                All hardware node deployments and capacity state transitions are backend-authoritative and verified on-chain via BNB Smart Chain.
              </p>
              <div className="pt-1">
                <Link 
                  to="/mine/guide"
                  className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Campaign Guide & FAQ</span>
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3">
          <div>
            © {new Date().getFullYear()} PulseEarn PSEmine Module. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <span>BNB Smart Chain (BEP-20)</span>
            <span>•</span>
            <span>Non-custodial Node Deployments</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
