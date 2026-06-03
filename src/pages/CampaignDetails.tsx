import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  ShieldCheck,
  Clock,
  ArrowLeft,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  Info,
  Layers,
  Activity,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { mapSystemError } from '../utils/errors';

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tasks, submitTask, getTaskStatus } = useTasks();
  const { userData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proof, setProof] = useState('');

  const campaign = tasks.find(t => t.id === id);

  if (!campaign) return (
     <MainLayout>
        <div className="pt-40 text-center">
           <AlertCircle className="mx-auto text-white/10 mb-6" size={64} />
           <h1 className="text-2xl font-bold">Campaign Not Found</h1>
           <button onClick={() => navigate('/tasks')} className="mt-8 text-primary hover:underline">Return to Marketplace</button>
        </div>
     </MainLayout>
  );

  const { status } = getTaskStatus(campaign);
  const isLocked = campaign.minLevel && (userData?.level || 1) < campaign.minLevel;
  const isCompleted = status === 'completed';
  const isPending = status === 'pending';
  const isCooldown = status === 'cooldown';

  const handleAction = async () => {
    if (campaign.verificationType === 'proof' && !proof) {
       toast.error("Proof of execution required");
       return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitTask(campaign.id, proof);
      if (result.success) {
        if (campaign.verificationType === 'automated') {
           toast.success(`+${campaign.rewardAmount} PTS Secured`, { icon: '⚡' });
        } else {
           toast.success("Submission logged for audit");
        }
      } else {
        toast.error(mapSystemError(result.error || ''));
      }
    } catch (err) {
      toast.error("System synchronization failure");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

        {/* Back Button */}
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-10 group"
        >
           <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
           <span className="text-[10px] font-bold uppercase tracking-widest">Back to Marketplace</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

           {/* Primary Content */}
           <div className="lg:col-span-2 space-y-12">

              {/* Header Card */}
              <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] overflow-hidden">
                 <div className="h-64 relative bg-black/40">
                    {campaign.campaignArtwork ? (
                       <img src={campaign.campaignArtwork} alt="" className="w-full h-full object-cover opacity-60" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center text-white/5">
                          <ImageIcon size={64} />
                       </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                    <div className="absolute top-8 left-8">
                       <span className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-primary">
                          {campaign.category}
                       </span>
                    </div>
                 </div>

                 <div className="p-10 -mt-12 relative z-10">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">{campaign.title}</h1>
                    <p className="text-white/60 text-lg leading-relaxed mb-8">{campaign.description}</p>

                    <div className="flex flex-wrap gap-4">
                       <div className="px-6 py-4 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-4">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                             <Zap size={20} />
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-0.5">Payload</p>
                             <p className="font-mono font-bold">+{campaign.rewardAmount} PT</p>
                          </div>
                       </div>
                       <div className="px-6 py-4 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-4">
                          <div className="p-2 rounded-xl bg-accent/10 text-accent">
                             <Activity size={20} />
                          </div>
                          <div>
                             <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-0.5">Experience</p>
                             <p className="font-mono font-bold">+{campaign.xpReward} XP</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Requirements & Execution */}
              <section className="space-y-8">
                 <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-white/40">
                    <Layers size={16} />
                    Execution Protocol
                 </h2>

                 <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 space-y-10">
                    <div>
                       <h3 className="text-lg font-bold mb-4 flex items-center gap-3">
                          <Info size={18} className="text-primary" />
                          Instructions
                       </h3>
                       <div className="prose prose-invert max-w-none text-white/60">
                          {campaign.instructions || "No specific instructions provided. Follow the action target to complete the mission."}
                       </div>
                    </div>

                    {campaign.verificationType === 'proof' && !isCompleted && !isPending && (
                       <div className="space-y-4">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Proof of Execution (Required)</label>
                          <textarea
                            value={proof}
                            onChange={e => setProof(e.target.value)}
                            placeholder="Provide screenshot link, username, or transaction hash as required..."
                            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm focus:border-primary/50 outline-none transition-all resize-none"
                          />
                       </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-6 items-center">
                       {campaign.actionUrl && !isCompleted && !isPending && (
                          <a
                            href={campaign.actionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full md:w-fit px-10 py-5 bg-white text-black font-bold uppercase tracking-[0.2em] text-[11px] rounded-2xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all"
                          >
                             Action Target <ExternalLink size={14} />
                          </a>
                       )}

                       <button
                         disabled={isLocked || isCooldown || isCompleted || isPending || isSubmitting}
                         onClick={handleAction}
                         className={cn(
                           "flex-1 w-full py-5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl",
                           (isLocked || isCooldown || isCompleted || isPending)
                            ? "bg-white/5 border border-white/5 text-white/20 cursor-not-allowed"
                            : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                         )}
                       >
                          {isSubmitting ? (
                             <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : isCompleted ? (
                             <>Verified <CheckCircle2 size={16} className="text-success" /></>
                          ) : isPending ? (
                             <>Audit Pending <Clock size={16} className="text-warning animate-pulse" /></>
                          ) : isLocked ? (
                             <>Clearance LVL {campaign.minLevel} Required <Lock size={16} /></>
                          ) : isCooldown ? (
                             <>Cooldown Active</>
                          ) : (
                             <>Submit Mission <ChevronRight size={16} /></>
                          )}
                       </button>
                    </div>
                 </div>
              </section>
           </div>

           {/* Sidebar */}
           <div className="space-y-8">
              <section className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8">
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-6">Metadata</h3>
                 <div className="space-y-6">
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                       <span className="text-[10px] font-bold text-text-secondary uppercase">Validation</span>
                       <span className="text-[10px] font-bold uppercase tracking-widest">{campaign.verificationType}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                       <span className="text-[10px] font-bold text-text-secondary uppercase">Platform</span>
                       <span className="text-[10px] font-bold uppercase tracking-widest">{campaign.platform}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                       <span className="text-[10px] font-bold text-text-secondary uppercase">Status</span>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-success">{campaign.status}</span>
                    </div>
                    {campaign.endDate && (
                       <div className="flex justify-between items-center py-4 border-b border-white/5">
                          <span className="text-[10px] font-bold text-text-secondary uppercase">Expires</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-warning">
                             {campaign.endDate.toDate().toLocaleDateString()}
                          </span>
                       </div>
                    )}
                 </div>
              </section>

              <section className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                       <ShieldCheck size={24} />
                    </div>
                    <div>
                       <h3 className="font-bold text-sm">Pulse Security</h3>
                       <p className="text-[10px] text-primary/60 font-bold uppercase tracking-widest">Fraud Guard Active</p>
                    </div>
                 </div>
                 <p className="text-[11px] text-white/40 leading-relaxed uppercase tracking-tighter font-medium">
                    All submissions are audited for integrity. Duplicate claims or bot-activity will result in account suspension and reward reversal.
                 </p>
              </section>
           </div>

        </div>
      </div>
    </MainLayout>
  );
};

export default CampaignDetails;
