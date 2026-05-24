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
  collection,
  increment as firestoreIncrement
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Task, UserTask, Activity, Campaign, TaskSubmission } from '../types';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../engines/points/PointTransactionEngine';

export const useTasks = () => {
  const { currentUser, userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<Record<string, UserTask>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch active tasks
    const tasksQuery = query(collection(db, 'tasks'), where('active', '==', true));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(tasksData);
    });

    // Fetch active campaigns
    const campaignsQuery = query(collection(db, 'campaigns'), where('active', '==', true));
    const unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
      setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign)));
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

    // Fetch user's own submissions
    const submissionsQuery = query(
      collection(db, 'taskSubmissions'),
      where('userId', '==', currentUser.uid),
      orderBy('submittedAt', 'desc'),
      limit(20)
    );
    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskSubmission)));
    });

    // Fetch recent activities
    const activitiesQuery = query(
      collection(db, 'users', currentUser.uid, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(10)
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

    if (task.type === 'once') return { status: 'completed' };

    const lastCompleted = userTask.lastCompleted?.toDate() || new Date(0);
    const cooldownHours = task.cooldown || 24;
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

    // Check if user has sufficient level
    if (task.minLevel && userData.level < task.minLevel) {
       toast.error(`Clearance Level ${task.minLevel} required`);
       return;
    }

    const { status } = getTaskStatus(task);
    if (status !== 'available' && status !== 'rejected') {
       toast.error(`Task currently ${status}`);
       return;
    }

    // Fraud prevention: prevent rapid submissions
    const now = Date.now();
    const lastAction = userData.lastActionTimestamp?.toMillis() || 0;
    if (now - lastAction < 2000) { // 2 second throttle
       toast.error('Slow down! High activity detected.');
       return;
    }

    try {
      if (task.verificationType === 'automated' || task.verificationType === 'timer') {
        // Direct claim for simple tasks
        return await claimTask(taskId);
      }

      // Manual/Proof verification requires a submission record
      const submissionRef = await addDoc(collection(db, 'taskSubmissions'), {
        taskId,
        userId: currentUser.uid,
        username: userData.username,
        status: 'pending',
        proofData,
        submittedAt: serverTimestamp(),
        rewardPoints: task.rewardPoints,
        rewardXp: task.rewardXp
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

      toast.success('Mission proof submitted for review!');
    } catch (error) {
      console.error(error);
      toast.error('Submission failed');
    }
  };

  const claimTask = async (taskId: string) => {
    if (!currentUser) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const result = await PointTransactionEngine.execute({
        userId: currentUser.uid,
        amount: task.rewardPoints,
        type: 'task_reward',
        source: `Mission: ${task.title}`,
        xpReward: task.rewardXp || 0,
        description: `Successfully completed ${task.title}`
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to claim reward');
        return;
      }

      const userTaskRef = doc(db, 'users', currentUser.uid, 'userTasks', taskId);
      const userRef = doc(db, 'users', currentUser.uid);

      await runTransaction(db, async (transaction) => {
        transaction.set(userTaskRef, {
          taskId,
          lastCompleted: serverTimestamp(),
          status: 'completed'
        });
        transaction.update(userRef, {
          'stats.tasksCompleted': firestoreIncrement(1),
          lastActionTimestamp: serverTimestamp()
        });
      });

      await addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
        title: 'Mission Accomplished!',
        description: `You earned +${task.rewardPoints} Pulse for: ${task.title}`,
        type: 'task_completed',
        read: false,
        timestamp: serverTimestamp()
      });

      toast.success(`+${task.rewardPoints} Pulse Earned!`, { icon: '⚡' });
      return true;

    } catch (error) {
      console.error(error);
      toast.error('Claim failed');
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
