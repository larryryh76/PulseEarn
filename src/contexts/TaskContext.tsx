import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onSnapshot,
  query,
  where,
  limit,
  collection
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Task, UserTask, Activity, Campaign, TaskClaim, PredictionRecord, TaskHistory } from '../types';
import { TaskEngine } from '../engines/tasks/TaskEngine';

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
  const { currentUser, userData } = useAuth();
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
      return;
    }

    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    // 1. Fetch active tasks
    const tasksQuery = query(collection(db, 'tasks'), where('active', '==', true));
    unsubscribes.push(onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
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

    // 4. Fetch user claims (Audit: Simplified query for immediate reactivity)
    const subtasksQuery = query(
      collection(db, 'task_claims'),
      where('userId', '==', currentUser.uid),
      limit(50)
    );
    unsubscribes.push(onSnapshot(subtasksQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskClaim));
      setSubtasks(data.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
      }));
    }));

    // 4.5 Fetch User Task History (Audit: Simplified query for immediate reactivity)
    const historyQuery = query(
      collection(db, 'users', currentUser.uid, 'task_history'),
      limit(50)
    );
    unsubscribes.push(onSnapshot(historyQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskHistory));
      setTaskHistory(data.sort((a, b) => {
          const timeA = a.resolvedAt?.toMillis?.() || 0;
          const timeB = b.resolvedAt?.toMillis?.() || 0;
          return timeB - timeA;
      }));
    }));

    // 5. Fetch activities
    const activitiesQuery = query(
      collection(db, 'users', currentUser.uid, 'activities'),
      limit(50)
    );
    unsubscribes.push(onSnapshot(activitiesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setActivities(data.sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || 0;
          const timeB = b.timestamp?.toMillis?.() || 0;
          return timeB - timeA;
      }));
    }));

    // 6. Fetch Predictions History (Simplified query to avoid index latency/missing issues)
    const predictionsQuery = query(
      collection(db, 'user_predictions'),
      where('userId', '==', currentUser.uid),
      limit(50)
    );
    unsubscribes.push(onSnapshot(predictionsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PredictionRecord));
      // Sort in frontend to ensure immediate display even before Firestore index is fully optimized
      setPredictions(data.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || Date.now();
          const timeB = b.createdAt?.toMillis?.() || Date.now();
          return timeB - timeA;
      }));
    }, (err) => {
        console.error("[TaskContext] Prediction History Error:", err);
    }));

    // 7. Fetch System Missions
    const defQ = query(collection(db, 'system_task_definitions'), where('active', '==', true));
    unsubscribes.push(onSnapshot(defQ, (defSnap) => {
      const userQ = query(collection(db, 'user_system_tasks'), where('userId', '==', currentUser.uid));
      const unsubUserSys = onSnapshot(userQ, (userSysSnap) => {
        const sysTasksData = defSnap.docs.map(d => {
          const def = d.data();
          const progress = userSysSnap.docs.find(ud => ud.data().systemTaskId === d.id)?.data();
          return { id: d.id, definition: def, progress };
        });
        setSystemTasks(sysTasksData as any);
        setLoading(false);
      }, (err) => {
        console.error("[TaskContext] User System Tasks Error:", err);
        setLoading(false);
      });
      unsubscribes.push(unsubUserSys);
    }, (err) => {
      console.error("[TaskContext] System Definitions Error:", err);
      setLoading(false);
    }));

    // Safety timeout: If loading is still true after 15 seconds, force it to false
    const loadTimeout = setTimeout(() => {
        setLoading(false);
    }, 15000);

    return () => {
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

  const submitTask = async (taskId: string, proofData?: string) => {
    if (!currentUser || !userData) return { success: false, error: 'Unauthenticated' };
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };
    return TaskEngine.attemptTask({ userId: currentUser.uid, taskId, proof: proofData });
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
    if (status.status === 'pending') return false;

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
