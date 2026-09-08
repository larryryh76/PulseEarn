import React from 'react';
import { Activity, Bell, CircleHelp, Settings2, UsersRound } from 'lucide-react';
import { PsemineLayout } from '../../components/mine/PsemineLayout';
import { usePsemineRecords } from '../../hooks/usePsemineRecords';

type Module = 'activity' | 'referrals' | 'account' | 'notifications';
const config: Record<Module, { title: string; eyebrow: string; description: string; icon: React.ElementType }> = {
  activity: { title: 'Activity', eyebrow: 'PSEmine ledger', description: 'Verified PSEmine events will appear here as backend records are created.', icon: Activity },
  referrals: { title: 'Referrals', eyebrow: 'Mining network', description: 'Referral attribution and qualification are being connected to the PSEmine backend.', icon: UsersRound },
  account: { title: 'Account', eyebrow: 'Identity & security', description: 'Account controls will be backed by the isolated PSEmine profile and security services.', icon: Settings2 },
  notifications: { title: 'Notifications', eyebrow: 'Protocol notices', description: 'Mining, campaign, payment, referral, and security notices will appear here from the backend.', icon: Bell },
};

export default function PsemineModulePage({ module }: { module: Module }) {
  const item = config[module];
  const Icon = item.icon;
  const collectionName = module === 'activity' ? 'psemine_activities' : module === 'referrals' ? 'psemine_referrals' : module === 'notifications' ? 'psemine_notifications' : 'psemine_profiles';
  const { records, loading, error } = usePsemineRecords(collectionName);
  const hasRecords = records.length > 0;
  return (
    <PsemineLayout>
      <div className="mx-auto max-w-3xl py-8">
        <div className="psemine-kicker flex items-center gap-2">
          <Icon size={14} /> {item.eyebrow}
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-[#f4f7f2]">{item.title}</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[#9ca8ac]">{item.description}</p>
        <div className="psemine-panel mt-10 rounded-3xl p-8">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-[#f0aa3e]/25 bg-[#f0aa3e]/10 text-[#f0aa3e]">
            <CircleHelp size={22} />
          </div>
          <h2 className="mt-6 text-lg font-bold text-[#f4f7f2]">
            {loading ? 'Synchronizing records' : error ? 'Records unavailable' : hasRecords ? `${records.length} verified record${records.length === 1 ? '' : 's'}` : 'No records to display'}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#7f8c90]">
            {error || 'This screen displays only authorized PSEmine backend data. No simulated balances, activity, referrals, or account state are generated in the browser.'}
          </p>
          {hasRecords && (
            <div className="mt-6 flex flex-col gap-2">
              {records.slice(0, 8).map((record: any) => (
                <div key={record.id} className="rounded-2xl border border-white/10 bg-[#080b10] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-bold text-[#f4f7f2]">{record.title || record.type || record.status || 'PSEmine record'}</span>
                    <span className="font-mono text-[10px] text-[#758287]">
                      {record.createdAt?.toDate ? record.createdAt.toDate().toLocaleDateString() : 'Verified record'}
                    </span>
                  </div>
                  {(record.description || record.message) && (
                    <p className="mt-1 text-xs leading-5 text-[#7f8c90]">{record.description || record.message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PsemineLayout>
  );
}

export function PsemineNotificationsPage() { return <PsemineModulePage module="notifications" />; }
