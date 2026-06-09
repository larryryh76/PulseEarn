import React from 'react';
import {
  Shield,
  FileText,
  ShieldAlert,
  X,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

type DocType = 'REWARD' | 'VERIFICATION' | 'FRAUD';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: DocType;
}

const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  const content = {
    REWARD: {
      title: 'Reward Policy',
      subtitle: 'Economic Distribution Parameters',
      icon: FileText,
      color: 'text-primary',
      sections: [
        {
          title: 'Point Generation',
          text: 'Points (PT) are generated through verified interactions including social tasks, market forecasts, and community engagement. Each point represents a fractional stake in the PulseEarn ecosystem value.'
        },
        {
          title: 'Redemption Thresholds',
          text: 'Initial redemption is locked until the user achieves a balance of 10,000 PTS. This ensures system stability and reduces micro-transaction overhead.'
        },
        {
          title: 'Conversion Ratio',
          text: 'The standard conversion rate is 1,000 PT = $1.00 USD. This ratio is subject to periodic re-balancing based on ecosystem liquidity.'
        }
      ]
    },
    VERIFICATION: {
      title: 'Verification Standards',
      subtitle: 'Proof of Completion Standards',
      icon: Shield,
      color: 'text-success',
      sections: [
        {
          title: 'Automated Verification',
          text: 'Tasks marked as Automated utilize direct API hooks or interaction listeners to verify completion in real-time. Rewards are released instantly upon confirmation.'
        },
        {
          title: 'Manual Review',
          text: 'For high-reward tasks, our team manually reviews submitted proof (screenshots, links). Review typically takes 12-24 hours.'
        },
        {
          title: 'Proof Standards',
          text: 'All screenshots must be clear, unedited, and show the completed action along with the user unique identifier where applicable.'
        }
      ]
    },
    FRAUD: {
      title: 'Integrity & Fraud',
      subtitle: 'System Abuse Prevention',
      icon: ShieldAlert,
      color: 'text-danger',
      sections: [
        {
          title: 'Multi-Account Policy',
          text: 'PulseEarn enforces a strict one-user-per-identity rule. Multi-account clusters are detected via IP velocity and behavioral fingerprinting.'
        },
        {
          title: 'Automation & Bots',
          text: 'The use of scripts or automation to exploit task rewards will result in immediate permanent suspension and forfeiture of all accumulated reward.'
        },
        {
          title: 'Referral Integrity',
          text: 'Referral rewards are only released for genuine active users. Artificial referral generation via temporary emails or botting is prohibited.'
        }
      ]
    }
  };

  const activeDoc = content[type];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-surface border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />

        <div className="p-10">
          <div className="flex justify-between items-start mb-12">
            <div className="flex items-center gap-5">
              <div className={cn("p-4 rounded-2xl bg-white/5", activeDoc.color)}>
                 <activeDoc.icon size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-1">{activeDoc.title}</h2>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">{activeDoc.subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-xl transition-all">
              <X size={20} className="text-text-secondary" />
            </button>
          </div>

          <div className="space-y-10">
             {activeDoc.sections.map((section, idx) => (
               <div key={idx} className="group">
                  <div className="flex items-center gap-3 mb-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                     <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">{section.title}</h3>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed pl-4.5">
                     {section.text}
                  </p>
               </div>
             ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-2 text-success">
                <CheckCircle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Policy Updated</span>
             </div>
             <button onClick={onClose} className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest hover:gap-3 transition-all">
                Close Document <ArrowRight size={14} />
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

export default DocumentationModal;
