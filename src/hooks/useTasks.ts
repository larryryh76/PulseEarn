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
import { Task, UserTask, Activity } from '../types';
import toast from 'react-hot-toast';
import { awardPoints } from '../utils/economy';

export const useTasks = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<Record<string, UserTask>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch active tasks
    const tasksQuery = query(collection(db, 'tasks'), where('active', '==', true));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(tasksData);
    });

    // Fetch user completions
    const userTasksQuery = query(collection(db, 'users', currentUser.uid, 'userTasks'));
    const unsubscribeUserTasks = onSnapshot(userTasksQuery, (snapshot) => {
      const userTasksData: Record<string, UserTask> = {};
      snapshot.docs.forEach(doc => {
        userTasksData[doc.id] = doc.data() as UserTask;
      });
      setUserTasks(userTasksData);
    });

    // Fetch recent activities
    const activitiesQuery = query(
      collection(db, 'users', currentUser.uid, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      setActivities(activitiesData);
      setLoading(false);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeUserTasks();
      unsubscribeActivities();
    };
  }, [currentUser]);

  const getTaskStatus = (task: Task): { status: 'available' | 'completed' | 'cooldown', nextAvailable?: Date } => {
    const userTask = userTasks[task.id];
    if (!userTask) return { status: 'available' };

    if (task.type === 'once') return { status: 'completed' };

    const lastCompleted = userTask.lastCompleted.toDate();
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

  const claimTask = async (taskId: string) => {
    if (!currentUser) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const userTask = userTasks[taskId];
    const now = new Date();

    // Check cooldown for daily/repeatable tasks
    if (userTask && task.type !== 'once') {
      const lastCompleted = userTask.lastCompleted.toDate();
      const cooldownHours = task.cooldown || 24;
      const cooldownMs = cooldownHours * 60 * 60 * 1000;

      if (now.getTime() - lastCompleted.getTime() < cooldownMs) {
        toast.error('Task is on cooldown');
        return;
      }
    }

    // Prevent multiple claims for 'once' tasks
    if (userTask && task.type === 'once') {
       toast.error('Task already completed');
       return;
    }

    try {
      // Optimistic UI update could be handled here by locally updating userTasks
      // But since we have a real-time listener, it's safer to just handle the points

      const result = await awardPoints(
        currentUser.uid,
        task.rewardPoints,
        'task_reward',
        `Mission: ${task.title}`,
        task.rewardXp || 0
      );

      if (!result.success) {
        toast.error(result.error || 'Failed to claim reward');
        return;
      }

      // Update user task record
      const userTaskRef = doc(db, 'users', currentUser.uid, 'userTasks', taskId);
      const userRef = doc(db, 'users', currentUser.uid);

      await runTransaction(db, async (transaction) => {
        transaction.set(userTaskRef, {
          taskId,
          lastCompleted: serverTimestamp(),
          status: 'completed'
        });
        // Update total completed tasks stat
        transaction.update(userRef, {
          'stats.tasksCompleted': firestoreIncrement(1)
        });
      });

      // Add notification
      await addDoc(collection(db, 'users', currentUser.uid, 'notifications'), {
        title: 'Mission Accomplished!',
        description: `You earned +${task.rewardPoints} Pulse for completing: ${task.title}`,
        type: 'task_completed',
        read: false,
        timestamp: serverTimestamp()
      });

      toast.success(`+${task.rewardPoints} Pulse Earned!`, {
        icon: '⚡',
      });

    } catch (error) {
      console.error("Error claiming task:", error);
      toast.error('Failed to claim reward');
    }
  };

  return { tasks, userTasks, activities, loading, claimTask, getTaskStatus };
};
