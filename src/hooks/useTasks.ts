import { useTaskContext } from '../contexts/TaskContext';

export const useTasks = () => {
  return useTaskContext();
};
