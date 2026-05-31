import { useState, useEffect } from 'react';
import {
  onSnapshot,
  query,
  where,
  doc,
  runTransaction,
  serverTimestamp,
  orderBy,
  limit,
  addDoc,
  collection
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Task, UserTask, Activity, Campaign, TaskClaim } from '../types';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../engines/points/PointTransactionEngine';

export const useTasks = () => {
  const { currentUser, userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<Record<string, UserTask>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<TaskClaim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch active tasks with marketplace fields
    const tasksQuery = query(collection(db, 'tasks'), where('active', '==', true));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(tasksData);
    });

    // Fetch active campaigns with participants info
    const campaignsQuery = query(collection(db, 'campaigns'), where('active', '==', true));
    const unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
      const campaignsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      setCampaigns(campaignsData);
    });

    // Fetch user completions/submissions
    const userTasksQuery = query(collection(db, 'users', currentUser.uid, 'userTasks'));
    const unsubscribeUserTasks = onSnapshot(userTasksQuery, (snapshot) => {
      const userTasksData: Record<string, UserTask> = {};
      snapshot.docs.forEach(doc => {
        userTasksData[doc.id] = doc.data() as UserTask;
      });
      setUserTasks(userTasksData);
    });

    // Fetch user's own marketplace submissions
    const submissionsQuery = query(
      collection(db, 'task_claims'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskClaim)));
    });

    // Fetch recent activities for activity feed
    const activitiesQuery = query(
      collection(db, 'users', currentUser.uid, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
      setLoading(false);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeCampaigns();
      unsubscribeUserTasks();
      unsubscribeSubmissions();
      unsubscribeActivities();
    };
  }, [currentUser]);

  const getTaskStatus = (task: Task): { status: 'available' | 'completed' | 'cooldown' | 'pending' | 'rejected', nextAvailable?: Date } => {
    const userTask = userTasks[task.id];
    if (!userTask) return { status: 'available' };

    if (userTask.status === 'pending') return { status: 'pending' };
    if (userTask.status === 'rejected') return { status: 'rejected' };

    const lastCompleted = userTask.lastCompleted?.toDate() || new Date(0);
    const cooldownHours = task.cooldownPeriod || 0;

    if (cooldownHours === 0 && userTask.status === 'completed') return { status: 'completed' };

    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const now = new Date();

    if (now.getTime() - lastCompleted.getTime() < cooldownMs) {
      return {
        status: 'cooldown',
        nextAvailable: new Date(lastCompleted.getTime() + cooldownMs)
      };
    }

    return { status: 'available' };
  };

  const submitTask = async (taskId: string, proofData?: string) => {
    if (!currentUser || !userData) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Marketplace Validation: clearance and state checks
    if (task.minLevel && userData.level < task.minLevel) {
       toast.error(`Account Level ${task.minLevel} Required`);
       return;
    }

    const { status } = getTaskStatus(task);
    if (status !== 'available' && status !== 'rejected') {
       toast.error(`Mission currently ${status}`);
       return;
    }

    // Velocity protection
    const now = Date.now();
    const lastAction = userData.lastActionTimestamp?.toMillis() || 0;
    if (now - lastAction < 1500) {
       toast.error('Processing... please wait.');
       return;
    }

    try {
      if (task.verificationType === 'automated' || task.verificationType === 'timer') {
        return await claimTask(taskId);
      }

      // Marketplace Verification Flow
      const submissionRef = await addDoc(collection(db, 'task_claims'), {
        taskId,
        userId: currentUser.uid,
        validationState: 'PENDING',
        completionState: 'IN_PROGRESS',
        submittedProof: proofData,
        createdAt: serverTimestamp(),
        xpGranted: 0,
        rewardAmount: task.rewardAmount,
        xpReward: task.xpReward,
        providerId: task.providerId || 'internal',
      });

      const userTaskRef = doc(db, 'users', currentUser.uid, 'userTasks', taskId);
      await runTransaction(db, async (transaction) => {
        transaction.set(userTaskRef, {
          taskId,
          status: 'pending',
          submissionId: submissionRef.id,
          lastAttemptAt: serverTimestamp()
        }, { merge: true });
      });

      toast.success('Mission proof logged for audit');
    } catch (error) {
      console.error(error);
      toast.error('Verification signal failure');
    }
  };

  const claimTask = async (taskId: string) => {
    if (!currentUser) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const claimId = `task_${taskId}_${currentUser.uid}_${Date.now()}`;

      // ABSOLUTE AUTHORITY MUTATION
      const result = await PointTransactionEngine.execute({
        userId: currentUser.uid,
        amount: task.rewardAmount,
        type: 'task_reward',
        source: `Mission: ${task.title}`,
        claimId,
        xpReward: task.xpReward || 0,
        description: `Successfully completed mission [${task.id}]`,
        metadata: {
          taskId,
          provider: task.providerName || 'PulseEarn',
          campaignId: task.campaignId || null
        }
      });

      if (!result.success) {
        toast.error(result.error || 'Reward system failure');
        return;
      }

      const userTaskRef = doc(db, 'users', currentUser.uid, 'userTasks', taskId);
      const userRef = doc(db, 'users', currentUser.uid);

      await runTransaction(db, async (transaction) => {
        transaction.set(userTaskRef, {
          taskId,
          lastCompleted: serverTimestamp(),
          status: 'completed'
        }, { merge: true });

        transaction.update(userRef, {
          lastActionTimestamp: serverTimestamp()
        });
      });

      await addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
        title: 'Mission Authorized!',
        description: `Reward of +${task.rewardAmount} PTS applied to ledger.`,
        type: 'task_completed',
        read: false,
        timestamp: serverTimestamp()
      });

      toast.success(`+${task.rewardAmount} PTS Secured`, { icon: '⚡' });
      return true;

    } catch (error) {
      console.error(error);
      toast.error('Claim authorization failure');
      return false;
    }
  };

  return {
    tasks,
    userTasks,
    campaigns,
    submissions,
    activities,
    loading,
    submitTask,
    claimTask,
    getTaskStatus
  };
};
