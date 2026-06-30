import * as React from 'react';
import {
  Globe,
  Plus,
  ExternalLink
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  getDocs
} from 'firebase/firestore';
import DataTable from '../../../components/admin/common/DataTable';
import ProviderManagerModal from './modals/ProviderManagerModal';
import toast from 'react-hot-toast';

const OpsOfferwalls: React.FC = () => {
  const [providers, setProviders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedProviderId, setSelectedProviderId] = React.useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'system_config'));
      const list = snap.docs
        .filter(d => d.id.startsWith('provider_'))
        .map(d => ({ id: d.id, ...d.data(), providerName: d.id.replace('provider_', '').toUpperCase() }));
      setProviders(list);
    } catch (err) {
      toast.error("Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchProviders();
  }, []);

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <Globe size={20} />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic text-text-primary">Offerwall Control</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Manage third-party offerwall integrations, API keys, and revenue sharing.</p>
          </div>
          <button
            onClick={() => { setSelectedProviderId(null); setIsModalOpen(true); }}
            className="px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
          >
             <Plus size={16} /> New Provider
          </button>
       </header>

       <div className="grid grid-cols-1 gap-8">
          <DataTable
            columns={[
              {
                header: 'Provider',
                accessor: (p: any) => (
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-primary shadow-inner">
                        <Globe size={18} />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-text-primary uppercase italic">{p.providerName}</p>
                        <p className="text-[9px] font-mono text-text-tertiary mt-1 uppercase tracking-widest">{p.id}</p>
                     </div>
                  </div>
                )
              },
              {
                header: 'Status',
                accessor: (p: any) => (
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border w-fit ${p.active ? 'bg-success/5 text-success border-success/20' : 'bg-danger/5 text-danger border-danger/20'}`}>
                     {p.active ? 'Active' : 'Inactive'}
                  </div>
                )
              },
              {
                header: 'Revenue Shares',
                accessor: (p: any) => (
                  <div className="flex items-center gap-4 text-[10px] font-mono font-bold">
                     <div className="flex flex-col">
                        <span className="text-[8px] text-text-tertiary uppercase">Platform</span>
                        <span className="text-primary">{((p.platformShare ?? 0) * 100).toFixed(0)}%</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] text-text-tertiary uppercase">User</span>
                        <span className="text-success">{((p.userShare ?? 0) * 100).toFixed(0)}%</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[8px] text-text-tertiary uppercase">Ref</span>
                        <span className="text-warning">{((p.referralShare ?? 0) * 100).toFixed(0)}%</span>
                     </div>
                  </div>
                )
              },
              {
                header: 'Actions',
                className: 'text-right',
                accessor: (p: any) => (
                  <div className="flex items-center justify-end gap-2">
                     <button
                       onClick={(e) => { e.stopPropagation(); setSelectedProviderId(p.id.replace('provider_', '')); setIsModalOpen(true); }}
                       className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-primary transition-all"
                     >
                        <ExternalLink size={16} />
                     </button>
                  </div>
                )
              }
            ]}
            data={providers}
            isLoading={loading}
            onRowClick={(p) => { setSelectedProviderId(p.id.replace('provider_', '')); setIsModalOpen(true); }}
          />
       </div>

       <ProviderManagerModal
         isOpen={isModalOpen}
         onClose={() => { setIsModalOpen(false); fetchProviders(); }}
         providerId={selectedProviderId}
       />
    </div>
  );
};

export default OpsOfferwalls;
