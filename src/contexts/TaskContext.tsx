import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  collection
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Task, UserTask, Activity, Campaign, TaskClaim, PredictionRecord } from '../types';
import { TaskEngine } from '../engines/tasks/TaskEngine';

export interface TaskContextType {
  tasks: Task[];
  userTasks: Record<string, UserTask>;
  campaigns: Campaign[];
  subtasks: TaskClaim[];
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

    // 4. Fetch user claims
    const subtasksQuery = query(
      collection(db, 'task_claims'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    unsubscribes.push(onSnapshot(subtasksQuery, (snapshot) => {
      setSubtasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskClaim)));
    }));

    // 5. Fetch activities
    const activitiesQuery = query(
      collection(db, 'users', currentUser.uid, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    unsubscribes.push(onSnapshot(activitiesQuery, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
    }));

    // 6. Fetch Predictions History
    const predictionsQuery = query(
      collection(db, 'user_predictions'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubscribes.push(onSnapshot(predictionsQuery, (snapshot) => {
      setPredictions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PredictionRecord)));
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
      });
      unsubscribes.push(unsubUserSys);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
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
    if (!t.campaignId) return false;
    const campaign = campaigns.find(c => c.id === t.campaignId);
    return campaign && campaign.active;
  });

  return (
    <TaskContext.Provider value={{
      tasks: filteredTasks,
      userTasks,
      campaigns,
      subtasks,
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
