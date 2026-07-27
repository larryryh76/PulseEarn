import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onSnapshot,
  query,
  where,
  limit,
  collection,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Task, UserTask, Activity, Campaign, TaskClaim, PredictionRecord, TaskHistory } from '../types';
import { evaluateTaskStatus } from '../utils';

export interface TaskContextType {
  tasks: Task[];
  userTasks: Record<string, UserTask>;
  campaigns: Campaign[];
  subtasks: TaskClaim[];
  taskHistory: TaskHistory[];
  unifiedHistory: any[];
  activities: Activity[];
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
      // Defensive check: only keep tasks that are actually marked active
      const filteredTasks = activeTasks.filter(t => t.active === true);
      if (filteredTasks.length !== activeTasks.length) {
        console.warn(`[TaskContext] SYNC DEFECT: ${activeTasks.length - filteredTasks.length} inactive tasks detected in active query`);
      }
      setTasks(filteredTasks);
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

    // Establish real-time listeners for all historical collections to guarantee perfect synchronization
    // of pending/completed state transitions without requiring manual refreshes.
    const claimsQuery = query(
      collection(db, 'task_claims'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    unsubscribes.push(onSnapshot(claimsQuery, (snapshot) => {
      setSubtasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskClaim)));
    }, (error) => {
      console.error("[TaskContext] Task Claims Listener Error:", error);
    }));

    const historyQuery = query(
      collection(db, 'users', currentUser.uid, 'task_history'),
      orderBy('resolvedAt', 'desc'),
      limit(20)
    );
    unsubscribes.push(onSnapshot(historyQuery, (snapshot) => {
      setTaskHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskHistory)));
    }, (error) => {
      console.error("[TaskContext] Task History Listener Error:", error);
    }));

    const predictionsQuery = query(
      collection(db, 'user_predictions'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    unsubscribes.push(onSnapshot(predictionsQuery, (snapshot) => {
      setPredictions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PredictionRecord)));
    }, (error) => {
      console.error("[TaskContext] Predictions Listener Error:", error);
    }));

    setLoading(false);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [currentUser]);

  const getTaskStatus = (task: Task) => {
    const userTask = userTasks[task.id];
    const res = evaluateTaskStatus(task, userTask);
    return {
      status: res.status as 'available' | 'pending' | 'completed' | 'cooldown' | 'rejected',
      nextAvailable: res.nextAvailable
    };
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

  const realTimeHistory = Object.values(userTasks)
    .filter(ut => (ut.status === 'completed' || ut.status === 'on_cooldown' || ut.status === 'cooldown') &&
                  !taskHistory.find(h => h.taskId === ut.taskId))
    .map(ut => {
      const task = tasks.find(t => t.id === ut.taskId);
      return {
        id: `rt_${ut.taskId}`,
        taskTitle: task?.title || 'Completed Opportunity',
        rewardAmount: task?.rewardAmount || 0,
        xpReward: task?.xpReward || 0,
        resolvedAt: ut.lastCompleted || ut.completedAt || ut.updatedAt || null,
        type: 'REALTIME'
      };
    });

  const getMillis = (val: any) => {
    if (!val) return 0;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return new Date(val).getTime();
    if (val.seconds !== undefined) return val.seconds * 1000;
    return 0;
  };

  const unifiedHistory = [
    ...realTimeHistory,
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
    }))
  ].sort((a, b) => {
    const timeA = getMillis(a.resolvedAt);
    const timeB = getMillis(b.resolvedAt);
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
