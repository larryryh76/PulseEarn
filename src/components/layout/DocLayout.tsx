import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  FileText,
  Shield,
  Scale,
  Zap,
  AlertCircle,
  UserCheck,
  Users,
  CreditCard,
  LifeBuoy,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { cn } from '../../utils';

interface DocSection {
  title: string;
  links: {
    label: string;
    href: string;
    icon: any;
  }[];
}

const DOC_SECTIONS: DocSection[] = [
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy', icon: Shield },
      { label: 'Terms of Service', href: '/terms', icon: Scale },
      { label: 'Cookie Policy', href: '/cookies', icon: FileText },
    ]
  },
  {
    title: 'Platform Rules',
    links: [
      { label: 'Reward Policy', href: '/reward-policy', icon: Zap },
      { label: 'Fraud & Integrity', href: '/fraud-policy', icon: AlertCircle },
      { label: 'Verification Policy', href: '/verification-policy', icon: UserCheck },
      { label: 'Withdrawal Policy', href: '/withdrawal-policy', icon: CreditCard },
      { label: 'Referral Policy', href: '/referral-policy', icon: Users },
    ]
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help', icon: BookOpen },
      { label: 'Community Guidelines', href: '/community-guidelines', icon: Users },
      { label: 'Support Policy', href: '/support-policy', icon: LifeBuoy },
    ]
  }
];

interface DocLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated: string;
}

const DocLayout: React.FC<DocLayoutProps> = ({ children, title, lastUpdated }) => {
  const { pathname } = useLocation();
  const { currentUser } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-text-primary transition-colors duration-300">
      <Navbar />

      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* SIDEBAR NAVIGATION */}
          <aside className="lg:col-span-3 space-y-8 hidden lg:block">
            {DOC_SECTIONS.map((section, idx) => (
              <div key={idx} className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary/50 px-2">
                  {section.title}
                </h4>
                <nav className="space-y-1">
                  {section.links.map((link, lIdx) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={lIdx}
                        to={link.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all group",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-text-tertiary hover:text-text-primary hover:bg-surface-bright"
                        )}
                      >
                        <link.icon size={14} className={cn(isActive ? "text-primary" : "text-text-tertiary group-hover:text-text-primary")} />
                        {link.label}
                        {isActive && <motion.div layoutId="doc-active" className="ml-auto w-1 h-1 rounded-full bg-primary" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}

            <div className="p-6 rounded-2xl bg-surface-bright border border-border space-y-4">
               <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Need help?</p>
               <p className="text-[11px] text-text-secondary leading-relaxed">Can't find what you're looking for? Reach out to our support team.</p>
               <Link
                 to="/support"
                 className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:gap-3 transition-all"
               >
                 Contact Support <ChevronRight size={12} />
               </Link>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="lg:col-span-9 space-y-12">
            <header className="space-y-6 border-b border-border pb-12 mb-12">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Documentation Hub</span>
               </div>
               <h1 className="text-4xl md:text-6xl font-black text-text-primary tracking-tighter leading-[0.9] uppercase italic">
                  {title}
               </h1>
               <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
                  Last Updated: {lastUpdated}
               </p>
            </header>

            <article className="prose prose-invert max-w-none
              prose-h2:text-2xl prose-h2:font-black prose-h2:uppercase prose-h2:tracking-tight prose-h2:mt-16 prose-h2:mb-8 prose-h2:italic prose-h2:text-text-primary
              prose-h3:text-lg prose-h3:font-bold prose-h3:uppercase prose-h3:tracking-widest prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-primary
              prose-p:text-text-secondary prose-p:leading-relaxed prose-p:text-[15px] prose-p:font-medium prose-p:mb-6
              prose-li:text-text-secondary prose-li:text-[15px] prose-li:font-medium prose-li:mb-2
              prose-strong:text-text-primary prose-strong:font-bold
              prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6">
              {children}
            </article>

            {/* Mobile Nav Helper */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 pt-12 border-t border-border">
               {DOC_SECTIONS.flatMap(s => s.links).map((link, idx) => {
                 if (pathname === link.href) return null;
                 return (
                   <Link
                     key={idx}
                     to={link.href}
                     className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between group hover:border-primary/50 transition-all"
                   >
                     <div className="flex items-center gap-3">
                        <link.icon size={16} className="text-text-tertiary group-hover:text-primary" />
                        <span className="text-[11px] font-bold text-text-secondary group-hover:text-text-primary uppercase tracking-widest">{link.label}</span>
                     </div>
                     <ChevronRight size={14} className="text-text-tertiary group-hover:text-primary" />
                   </Link>
                 )
               })}
            </div>
          </main>
        </div>
      </div>

      {currentUser && <BottomNav />}

      <footer className="py-24 px-8 border-t border-border bg-surface-bright/50">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
           <div className="flex flex-col items-center md:items-start gap-4">
              <p className="text-text-tertiary text-[9px] font-bold uppercase tracking-[0.4em]">
                &copy; {new Date().getFullYear()} PulseEarn.
              </p>
           </div>
           <div className="flex gap-8 items-center text-text-tertiary opacity-40">
              {/* UI Metadata hidden as per directive */}
           </div>
        </div>
      </footer>
    </div>
  );
};

export default DocLayout;
