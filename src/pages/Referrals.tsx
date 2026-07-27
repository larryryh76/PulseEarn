import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Share2,
  Users,
  TrendingUp,
  CheckCircle2,
  Lock,
  ArrowRight,
  Zap
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ReferralRecord } from '../types';
import { EconomyConfigEngine } from '../engines/system/EconomyConfigEngine';

const Referrals: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  
  // Determine if page is unlocked (user completed at least 1 task)
  const tasksCompleted = userData?.stats?.tasksCompleted || 0;
  const isUnlocked = tasksCompleted > 0;

  useEffect(() => {
    const loadConfig = async () => {
      const cfg = await EconomyConfigEngine.getConfig();
      setConfig(cfg);
    };
    loadConfig();
  }, []);

  // Only load referrals if unlocked
  useEffect(() => {
    if (!currentUser || !isUnlocked) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord));
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setReferrals(data);
      setLoading(false);
    }, (err: any) => {
      console.error("[Referrals] Load Error:", err.message);
      setLoading(false);
      toast.error("Could not load referrals");
    });

    return unsubscribe;
  }, [currentUser, isUnlocked]);

  const copyCode = () => {
    if (userData?.referralCode) {
      navigator.clipboard.writeText(userData.referralCode);
      toast.success('Code copied to clipboard!');
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/signup?ref=${userData?.referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const shareLink = async () => {
    const link = `${window.location.origin}/signup?ref=${userData?.referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join PulseEarn',
          text: `Sign up with my referral code and we both get bonuses!`,
          url: link
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      copyLink();
    }
  };

  // Calculate stats using the authoritative backend statistics (Single Source of Truth)
  const qualified = userData?.stats?.referralsCount || 0;
  const pending = referrals.filter(r => r.status === 'REGISTERED').length;
  const totalEarned = qualified * (config?.rewards?.referralBonusPointsReferrer || 50);

  // Render locked state
  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-secondary/30 px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Locked Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center">
              <Lock className="w-12 h-12 text-accent" strokeWidth={1.5} />
            </div>
          </div>

          {/* Locked Message */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Referral Program Locked
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Complete your first task to unlock the referral program and start earning with friends.
            </p>
            <p className="text-base text-muted-foreground mb-8">
              Once you complete a task, you&apos;ll be able to share your unique code and earn{' '}
              <span className="font-semibold text-accent">
                {config?.rewards?.referralBonusPointsReferrer || 50} PTS
              </span>
              {' '}for each friend who signs up.
            </p>
          </div>

          {/* Feature Preview */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="p-6 border-2 border-accent/20 hover:border-accent/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Share Your Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Get a unique referral code to share with friends
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-2 border-accent/20 hover:border-accent/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-accent" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Earn Together</h3>
                  <p className="text-sm text-muted-foreground">
                    Both you and your friend get bonuses when they sign up
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 text-base flex items-center gap-2"
            >
              Complete Your First Task <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Render unlocked state
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/30 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Earn by Referring</h1>
          <p className="text-lg text-muted-foreground">
            Share your code and earn points every time someone joins
          </p>
        </div>

        {/* Referral Code Card */}
        <Card className="mb-8 border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Your Referral Code
              </p>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-accent font-mono tracking-wider">
                  {userData?.referralCode || '---'}
                </div>
                <button
                  onClick={copyCode}
                  className="p-2 hover:bg-accent/10 rounded-lg transition-colors text-muted-foreground hover:text-accent"
                  aria-label="Copy code"
                >
                  <Copy className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={copyLink}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
              <Button
                onClick={shareLink}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 border-l-4 border-l-accent">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Total Earned</p>
                <p className="text-3xl font-bold text-foreground">{totalEarned}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">From successful referrals</p>
          </Card>

          <Card className="p-6 border-l-4 border-l-green-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Converted</p>
                <p className="text-3xl font-bold text-foreground">{qualified}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Friends who signed up</p>
          </Card>

          <Card className="p-6 border-l-4 border-l-yellow-500">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Pending</p>
                <p className="text-3xl font-bold text-foreground">{pending}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-yellow-500" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Awaiting sign-up</p>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="mb-12 p-8 bg-secondary/50">
          <h2 className="text-2xl font-bold text-foreground mb-6">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent text-white font-bold text-sm">
                  1
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Share Your Code</p>
                <p className="text-sm text-muted-foreground">
                  Send your referral code or link to friends and family
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent text-white font-bold text-sm">
                  2
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">They Sign Up</p>
                <p className="text-sm text-muted-foreground">
                  Your friend creates an account using your code
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent text-white font-bold text-sm">
                  3
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">You Both Earn</p>
                <p className="text-sm text-muted-foreground">
                  Instant {config?.rewards?.referralBonusPointsReferrer || 50} PTS for you,{' '}
                  {config?.rewards?.referralBonusPointsReferee || 30} PTS for them
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Referral History */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Referral History</h2>
          
          {loading ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Loading referrals...</p>
            </Card>
          ) : referrals.length === 0 ? (
            <Card className="p-12 text-center bg-secondary/30">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-lg text-muted-foreground">No referrals yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Share your code to start earning with friends
              </p>
              <Button onClick={shareLink} className="mx-auto">
                Share Now
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <Card key={referral.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        referral.status === 'QUALIFIED'
                          ? 'bg-green-500/10'
                          : 'bg-yellow-500/10'
                      }`}>
                        {referral.status === 'QUALIFIED' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" strokeWidth={1.5} />
                        ) : (
                          <Zap className="w-5 h-5 text-yellow-500" strokeWidth={1.5} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {referral.refereeUsername || 'Friend'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {referral.status === 'QUALIFIED' ? 'Signed up' : 'Pending'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-accent">
                        +{config?.rewards?.referralBonusPointsReferrer || 50} PTS
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {referral.createdAt?.toDate?.()?.toLocaleDateString?.() || 'Recently'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Referrals;
