import React from 'react';
import { Link } from 'react-router-dom';
import { Pickaxe, HelpCircle, CheckCircle2 } from 'lucide-react';

export const PSEMineFooter: React.FC = () => {
  return (
    <footer className="bg-[#050811] border-t border-cyan-950/60 text-gray-400 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand & Campaign Summary */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
                <Pickaxe className="w-4 h-4" />
              </div>
              <span className="font-black text-base text-white tracking-tight">PSEmine</span>
              <span className="text-[10px] bg-cyan-900/40 text-cyan-300 border border-cyan-700/50 px-1.5 py-0.5 rounded font-mono">
                90-DAY CAMPAIGN
              </span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              A limited-duration campaign mining experience inside the PulseEarn ecosystem. Tool capacity powers continuous GBP-denominated accounting, with crypto payouts disbursed upon 90-day settlement.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">
              Campaign Navigation
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/mine" className="hover:text-cyan-400 transition-colors">Campaign Overview</Link>
              </li>
              <li>
                <Link to="/mine/dashboard" className="hover:text-cyan-400 transition-colors">Mining Operations</Link>
              </li>
              <li>
                <Link to="/mine/tools" className="hover:text-cyan-400 transition-colors">Tool Marketplace</Link>
              </li>
              <li>
                <Link to="/mine/wallet" className="hover:text-cyan-400 transition-colors">Wallet & Settlements</Link>
              </li>
              <li>
                <Link to="/mine/referrals" className="hover:text-cyan-400 transition-colors">Referral Capacity Bonus</Link>
              </li>
            </ul>
          </div>

          {/* Economic Standards */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">
              Locked Economics
            </h4>
            <ul className="space-y-2 text-[11px] text-gray-400">
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Accounting Currency: <strong>GBP (£)</strong></span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Payment Network: <strong>BNB Smart Chain</strong></span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Max Tool Capacity: <strong>£10.60/hr</strong></span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Max Theoretical Rate: <strong>£12.10/hr</strong></span>
              </li>
            </ul>
          </div>

          {/* Compliance & Security */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">
              Transparency & Security
            </h4>
            <div className="space-y-2 text-[11px]">
              <p className="text-gray-400">
                All tool purchases and capacity state transitions are backend-authoritative and verified on-chain via BNB Smart Chain.
              </p>
              <div className="pt-2">
                <Link 
                  to="/mine/guide"
                  className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Read Full Campaign Constitution</span>
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-4">
          <div>
            © {new Date().getFullYear()} PulseEarn. PSEmine is a temporary 90-day campaign node operating on BNB Smart Chain.
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/terms" className="hover:text-gray-400">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-gray-400">Privacy Policy</Link>
            <Link to="/fraud-policy" className="hover:text-gray-400">Fraud Prevention</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
