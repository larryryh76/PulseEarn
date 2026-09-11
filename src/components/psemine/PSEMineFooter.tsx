import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, CheckCircle2 } from 'lucide-react';
import { PSEMineLogo } from './PSEMineLogo';

export const PSEMineFooter: React.FC = () => {
  return (
    <footer className="bg-surface/50 border-t border-border text-text-secondary text-xs mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand & Summary */}
          <div className="space-y-3">
            <PSEMineLogo size={32} showWordmark={true} />
            <p className="text-text-tertiary text-xs leading-relaxed">
              90-day mining campaign within PulseEarn. Purchase mining tools, build your hourly earning capacity, and track your estimated earnings.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-text-primary font-bold text-xs tracking-wider uppercase mb-3.5">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/mine" className="hover:text-primary transition-colors">Overview</Link>
              </li>
              <li>
                <Link to="/mine/dashboard" className="hover:text-primary transition-colors">Mining Overview</Link>
              </li>
              <li>
                <Link to="/mine/tools" className="hover:text-primary transition-colors">Mining Tools</Link>
              </li>
              <li>
                <Link to="/mine/wallet" className="hover:text-primary transition-colors">Wallet</Link>
              </li>
              <li>
                <Link to="/mine/referrals" className="hover:text-primary transition-colors">Referral Boost</Link>
              </li>
              <li>
                <Link to="/mine/me" className="hover:text-primary transition-colors">Account</Link>
              </li>
            </ul>
          </div>

          {/* Campaign Rules */}
          <div>
            <h4 className="text-text-primary font-bold text-xs tracking-wider uppercase mb-3.5">
              Campaign Rules
            </h4>
            <ul className="space-y-2.5 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                <span>Accounting: <strong className="text-text-primary font-bold">GBP (£)</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                <span>Payment: <strong className="text-text-primary font-bold">BNB Smart Chain</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                <span>Max Tool Capacity: <strong className="text-text-primary font-bold">£10.60/hr</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                <span>Peak Rate: <strong className="text-text-primary font-bold">£12.10/hr</strong></span>
              </li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="text-text-primary font-bold text-xs tracking-wider uppercase mb-3.5">
              Support & Guide
            </h4>
            <div className="space-y-3 text-xs">
              <p className="text-text-tertiary leading-relaxed">
                Review complete details about mining tiers, referral boosts, and campaign settlement.
              </p>
              <div className="pt-1">
                <Link 
                  to="/mine/guide"
                  className="inline-flex items-center gap-1.5 text-primary hover:text-primary-bright font-bold uppercase tracking-wider text-[11px]"
                >
                  <HelpCircle size={14} />
                  <span>Campaign Guide & FAQ</span>
                </Link>
              </div>
            </div>
          </div>

        </div>

        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-text-tertiary">
          <div>
            © {new Date().getFullYear()} PulseEarn. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/mine/guide" className="hover:text-text-primary transition-colors">Guide</Link>
            <span>·</span>
            <Link to="/mine/wallet" className="hover:text-text-primary transition-colors">Wallet</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
