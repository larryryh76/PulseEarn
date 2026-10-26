import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText, Wallet, CheckCircle2 } from 'lucide-react';

const principles = [
  {
    icon: FileText,
    title: 'Clear product terms',
    description: 'Read the applicable product terms, reward rules, campaign conditions and payout policy before participating.',
    points: ['Published policies', 'Eligibility conditions', 'Campaign-specific rules'],
  },
  {
    icon: Wallet,
    title: 'Review every transaction',
    description: 'Check the network, destination address and amount in your wallet before approving a blockchain transaction.',
    points: ['Confirm the network', 'Verify the recipient', 'Keep the transaction hash'],
  },
  {
    icon: Lock,
    title: 'Protect your wallet',
    description: 'PulseEarn should never need your wallet seed phrase or private key. Never share them with a website or support agent.',
    points: ['Never share recovery phrases', 'Use your own wallet', 'Review wallet permissions'],
  },
  {
    icon: Eye,
    title: 'Understand the risks',
    description: 'Digital assets and campaign participation carry risks. Values, network fees, eligibility and processing times can vary.',
    points: ['No guaranteed returns', 'Network fees may apply', 'Review payout conditions'],
  },
  {
    icon: Shield,
    title: 'Account safeguards',
    description: 'Use a unique password, secure your email account and contact support if you notice activity you did not initiate.',
    points: ['Secure account access', 'Report suspicious activity', 'Keep records of requests'],
  },
  {
    icon: CheckCircle2,
    title: 'Evidence over promises',
    description: 'A displayed balance or status is not proof of a blockchain payment. Verify transaction details independently before relying on a payment claim.',
    points: ['Check transaction hashes', 'Review account history', 'Confirm settlement status'],
  },
];

const TrustSecurity: React.FC = () => (
  <section className="py-24 md:py-32 relative overflow-hidden bg-background">
    <div className="absolute inset-0 -z-10">
      <div className="absolute top-0 left-1/2 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 blur-[120px] rounded-full" />
    </div>
    <div className="container mx-auto px-6 relative z-10">
      <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
          <Shield size={14} /> Safety & transparency
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-text-primary tracking-tighter mb-6 leading-[1.1]"
        >
          Understand the product.
          <span className="block text-primary"> Make informed decisions.</span>
        </motion.h2>
        <p className="text-text-secondary text-base sm:text-lg font-medium max-w-2xl mx-auto">
          We want participants to understand the rules, transaction steps and risks before they commit funds or time.
          Check the published policies and verify important transactions independently.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {principles.map((item, index) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.04, duration: 0.35 }}
            className="group h-full p-7 md:p-8 rounded-2xl border border-border bg-surface/50 backdrop-blur-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-border flex items-center justify-center mb-5">
              <item.icon size={23} className="text-primary" />
            </div>
            <h3 className="text-lg font-bold text-text-primary tracking-tight mb-3">{item.title}</h3>
            <p className="text-text-secondary text-sm leading-relaxed mb-5">{item.description}</p>
            <ul className="space-y-2 pt-4 border-t border-border/50">
              {item.points.map(point => (
                <li key={point} className="flex items-center gap-3 text-text-tertiary text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-text-tertiary leading-relaxed max-w-3xl mx-auto">
        Security and payment statements should be assessed against observable evidence. This section is educational and does not constitute an independent security certification or guarantee of financial results.
      </p>
    </div>
  </section>
);

export default TrustSecurity;
