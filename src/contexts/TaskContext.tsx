import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onSnapshot,
  query,
  where,
  limit,
  collection,
  getDocs,
  orderBy,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Task, UserTask, Activity, Campaign, TaskClaim, PredictionRecord, TaskHistory } from '../types';

export interface TaskContextType {
  tasks: Task[];
  userTasks: Record<string, UserTask>;
  campaigns: Campaign[];
  subtasks: TaskClaim[];
  taskHistory: TaskHistory[];
  unifiedHistory: any[];
  activities: Activity[];
  systemTasks: { id: string; definition: any; progress: any }[];
  predictions: PredictionRecord[];
  loading: boolean;
  submitTask: (taskId: string, proofData?: string) => Promise<{ success: boolean; error?: string }>;
  claimTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  getTaskStatus: (task: Task) => { status: 'available' | 'completed' | 'cooldown' | 'pending' | 'rejected', nextAvailable?: Date };
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<Record<string, UserTask>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [subtasks, setSubtasks] = useState<TaskClaim[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistory[]>([]);
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemTasks, setSystemTasks] = useState<{ id: string; definition: any; progress: any }[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      // Clear historical data when user logs out
      setSubtasks([]);
      setTaskHistory([]);
      setActivities([]);
      setPredictions([]);
      return;
    }

    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    // 1. Fetch active tasks
    const tasksQuery = query(collection(db, 'tasks'), where('active', '==', true));
    unsubscribes.push(onSnapshot(tasksQuery, (snapshot) => {
      const activeTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      console.log("[v0] TaskContext: Tasks listener fired with", activeTasks.length, "active tasks");
      setTasks(activeTasks);
    }, (error) => {
      console.error("[v0] TaskContext: Tasks listener error:", error);
    }));

    // 2. Fetch active campaigns
    const campaignsQuery = query(collection(db, 'campaigns'), where('active', '==', true));
    unsubscribes.push(onSnapshot(campaignsQuery, (snapshot) => {
      setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign)));
    }));

    // 3. Fetch user task progress
    const userTasksQuery = query(collection(db, 'users', currentUser.uid, 'user_tasks'));
    unsubscribes.push(onSnapshot(userTasksQuery, (snapshot) => {
      const data: Record<string, UserTask> = {};
      snapshot.docs.forEach(doc => { data[doc.id] = doc.data() as UserTask; });
      setUserTasks(data);
    }));

    // 4. Activity timeline — REAL-TIME so it stays in sync with the balance and Wallet ledger
    // (both of which are also real-time). The server now writes an activity entry atomically
    // with every balance change, so this listener surfaces rewards the instant they are granted
    // instead of only after a page reload.
    const activitiesQuery = query(
      collection(db, 'users', currentUser.uid, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(30)
    );
    unsubscribes.push(onSnapshot(activitiesQuery, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
    }, (error) => {
      console.error("[TaskContext] Activities Listener Error:", error);
    }));

    // SCALABILITY OPTIMIZATION: Non-critical historical data fetched via getDocs once on session start
    // Critical state (active tasks/campaigns/progress) remains real-time.
    let isCancelled = false;
    const fetchHistoricalData = async () => {
      const requestUserId = currentUser.uid;

      // NOTE: activities are handled by a dedicated real-time listener above; they are
      // intentionally not re-fetched here to avoid a stale one-time snapshot overwriting it.
      const results = await Promise.allSettled([
        getDocs(query(collection(db, 'task_claims'), where('userId', '==', requestUserId), orderBy('createdAt', 'desc'), limit(20))),
        getDocs(query(collection(db, 'users', requestUserId, 'task_history'), orderBy('resolvedAt', 'desc'), limit(20))),
        getDocs(query(collection(db, 'user_predictions'), where('userId', '==', requestUserId), orderBy('createdAt', 'desc'), limit(20)))
      ]);

      if (isCancelled || currentUser.uid !== requestUserId) return;

      if (results[0].status === 'fulfilled') {
        setSubtasks(results[0].value.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as TaskClaim)));
      } else {
        console.error("[TaskContext] Task Claims Fetch Error:", results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        setTaskHistory(results[1].value.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as TaskHistory)));
      } else {
        console.error("[TaskContext] Task History Fetch Error:", results[1].reason);
      }

      if (results[2].status === 'fulfilled') {
        setPredictions(results[2].value.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() } as PredictionRecord)));
      } else {
        console.error("[TaskContext] Predictions Fetch Error:", results[2].reason);
      }
    };

    fetchHistoricalData();

    // 7. Fetch System Missions - Batch 3: Parallelized non-nested listeners
    let currentDefinitions: any[] = [];
    let currentProgress: any[] = [];

    const syncSystemTasks = () => {
      if (currentDefinitions.length === 0) return;

      const sysTasksData = currentDefinitions.map(def => {
        const progress = currentProgress.find(ud => ud.systemTaskId === def.id);
        return { id: def.id, definition: def, progress };
      });
      setSystemTasks(sysTasksData);
    };

    const defQ = query(collection(db, 'system_task_definitions'), where('active', '==', true));
    unsubscribes.push(onSnapshot(defQ, (defSnap) => {
      currentDefinitions = defSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      syncSystemTasks();
      setLoading(false);
    }, (err) => {
      console.error("[TaskContext] System Definitions Error:", err);
      setLoading(false);
    }));

    const userQ = query(collection(db, 'user_system_tasks'), where('userId', '==', currentUser.uid));
    unsubscribes.push(onSnapshot(userQ, (userSysSnap) => {
      currentProgress = userSysSnap.docs.map(d => d.data());
      syncSystemTasks();
    }, (err) => {
      console.error("[TaskContext] User System Tasks Error:", err);
    }));

    // Safety timeout: If loading is still true after 15 seconds, force it to false
    const loadTimeout = setTimeout(() => {
        setLoading(false);
    }, 15000);

    return () => {
      isCancelled = true;
      unsubscribes.forEach(unsub => unsub());
      clearTimeout(loadTimeout);
    };
  }, [currentUser]);

  const getTaskStatus = (task: Task) => {
    const userTask = userTasks[task.id];
    if (!userTask) return { status: 'available' as const };

    if (userTask.status === 'pending') return { status: 'pending' as const };
    if (userTask.status === 'rejected') return { status: 'rejected' as const };

    const lastCompleted = userTask.lastCompleted?.toDate() || new Date(0);
    const cooldownHours = task.cooldownPeriod || 0;

    if (cooldownHours === 0 && userTask.status === 'completed') return { status: 'completed' as const };

    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const now = new Date();

    if (now.getTime() - lastCompleted.getTime() < cooldownMs) {
      return {
        status: 'cooldown' as const,
        nextAvailable: new Date(lastCompleted.getTime() + cooldownMs)
      };
    }

    return { status: 'available' as const };
  };

  const submitTask = async (_taskId: string, _proofData?: string) => {
    return { success: false, error: 'DEPRECATED_ENGINE' };
  };

  const claimTask = async (taskId: string) => submitTask(taskId);

  const filteredTasks = tasks.filter(t => {
    // Basic Active Check
    if (!t.active) return false;

    // Campaign Active Check
    if (t.campaignId) {
      const campaign = campaigns.find(c => c.id === t.campaignId);
      if (!campaign || !campaign.active) return false;
    }

    // Completion/Cooldown Check
    const status = getTaskStatus(t);
    if (status.status === 'completed') return false;
    if (status.status === 'cooldown') return false;

    return true;
  });

  const completedMissions = systemTasks.filter(m => m.progress?.status === 'CLAIMED');

  const unifiedHistory = [
    ...taskHistory.map(h => ({ ...h, type: 'HISTORY' })),
    ...subtasks.filter(s =>
       s.validationState === 'APPROVED' &&
       !taskHistory.find(h => h.claimId === s.id) &&
       !taskHistory.find(h => h.taskId === s.taskId)
    ).map(s => ({
       id: s.id,
       taskTitle: s.metadata?.taskTitle || 'Task Completed',
       rewardAmount: 0,
       xpReward: s.xpGranted || 0,
       resolvedAt: s.resolvedAt,
       type: 'LEGACY_CLAIM'
    })),
    ...completedMissions.filter(m =>
       !taskHistory.find(h => h.taskId === m.id)
    ).map(m => ({
       id: m.id,
       taskTitle: m.definition?.title,
       rewardAmount: m.definition?.rewardPoints,
       xpReward: m.definition?.rewardXp,
       resolvedAt: m.progress?.claimedAt,
       type: 'MISSION'
    }))
  ].sort((a, b) => {
    const timeA = a.resolvedAt?.toMillis?.() || 0;
    const timeB = b.resolvedAt?.toMillis?.() || 0;
    return timeB - timeA;
  });

  return (
    <TaskContext.Provider value={{
      tasks: filteredTasks,
      userTasks,
      campaigns,
      subtasks,
      taskHistory,
      unifiedHistory,
      activities,
      systemTasks,
      predictions,
      loading,
      submitTask,
      claimTask,
      getTaskStatus
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTaskContext must be used within a TaskProvider');
  return context;
};
