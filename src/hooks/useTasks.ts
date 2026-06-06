import { useState, useEffect } from 'react';
import {
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  collection
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Task, UserTask, Activity, Campaign, TaskClaim } from '../types';
import { TaskEngine } from '../engines/tasks/TaskEngine';

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
    const userTasksQuery = query(collection(db, 'users', currentUser.uid, 'user_tasks'));
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
    if (!currentUser || !userData) return { success: false, error: 'Unauthenticated' };

    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    if (task.minLevel && userData.level < task.minLevel) {
       return { success: false, error: 'LEVEL_REQUIRED', minLevel: task.minLevel };
    }

    const { status } = getTaskStatus(task);
    if (status !== 'available' && status !== 'rejected') {
       return { success: false, error: 'INVALID_STATUS', status };
    }

    const now = Date.now();
    const lastAction = userData.lastActionTimestamp?.toMillis() || 0;
    if (now - lastAction < 1000) {
       return { success: false, error: 'THROTTLED' };
    }

    try {
      const result = await TaskEngine.attemptTask({
        userId: currentUser.uid,
        taskId: task.id,
        proof: proofData
      });

      return result;
    } catch (error) {
      console.error(error);
      return { success: false, error: 'SYSTEM_ERROR' };
    }
  };

  const claimTask = async (taskId: string) => {
    return submitTask(taskId);
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
