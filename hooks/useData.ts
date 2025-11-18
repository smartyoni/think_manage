import { useState, useCallback, useEffect } from 'react';
import { Task, Concern, Step, Memo, TaskCategory, TaskStatus, StepStatus, ConcernStatus } from '../types';
import {
  useFirestoreTasks,
  useFirestoreConcerns,
  useFirestoreSteps,
  useFirestoreMemos,
  addTaskToFirestore,
  updateTaskInFirestore,
  deleteTaskInFirestore,
  addConcernToFirestore,
  updateConcernInFirestore,
  deleteConcernInFirestore,
  addStepToFirestore,
  updateStepInFirestore,
  deleteStepInFirestore,
  addMemoToFirestore,
  updateMemoInFirestore,
  deleteMemoInFirestore,
  reorderStepsInFirestore,
  reorderSubTasksInFirestore,
  deriveTaskFromConcernInFirestore,
  addAnalysisLogToFirestore,
} from './useFirestore';

export const useData = () => {
  // Real-time listeners
  const { tasks: firestoreTasks, loading: tasksLoading } = useFirestoreTasks();
  const { concerns: firestoreConcerns, loading: concernsLoading } = useFirestoreConcerns();

  // Local state for managing steps and memos (selected task/step)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const { steps: firestoreSteps } = useFirestoreSteps(selectedTaskId || '');
  const { memos: firestoreMemos } = useFirestoreMemos(selectedTaskId || '', selectedStepId || '');

  // Flatten all steps from all tasks for progress calculation
  const [allSteps, setAllSteps] = useState<Step[]>([]);

  useEffect(() => {
    const fetchAllSteps = async () => {
      const allStepsData: Step[] = [];
      for (const task of firestoreTasks) {
        const taskSteps = firestoreSteps;
        if (task.id === selectedTaskId) {
          allStepsData.push(...taskSteps);
        }
      }
      setAllSteps(allStepsData);
    };

    fetchAllSteps();
  }, [firestoreTasks, firestoreSteps, selectedTaskId]);

  // ============================================================================
  // PROGRESS CALCULATION (Client-side logic from original)
  // ============================================================================

  const updateTaskProgress = useCallback(
    (taskId: string) => {
      const taskToUpdate = firestoreTasks.find((t) => t.id === taskId);
      if (!taskToUpdate) return;

      let newProgress = 0;
      let newStatus = taskToUpdate.status;

      // Level 2 Task: Progress based on steps
      if (taskToUpdate.parentTaskId) {
        const childSteps = firestoreSteps.filter((s) => s.parentTaskId === taskId);
        if (childSteps.length > 0) {
          const completedSteps = childSteps.filter((s) => s.status === StepStatus.Completed).length;
          newProgress = Math.round((completedSteps / childSteps.length) * 100);

          if (completedSteps > 0 && newProgress < 100) {
            newStatus = TaskStatus.InProgress;
          } else if (completedSteps === 0) {
            newStatus = TaskStatus.Pending;
          }
        }
      }
      // Level 1 Project: Progress based on child tasks
      else {
        const childTasks = firestoreTasks.filter((t) => t.parentTaskId === taskId);
        if (childTasks.length > 0) {
          const totalProgress = childTasks.reduce((sum, task) => sum + task.progressPercent, 0);
          newProgress = Math.round(totalProgress / childTasks.length);
        }
      }

      // Update task with new progress
      updateTaskInFirestore(taskId, {
        ...taskToUpdate,
        progressPercent: newProgress,
        status: newStatus,
      });

      // Cascade update to parent project if exists
      if (taskToUpdate.parentTaskId) {
        const parentTask = firestoreTasks.find((t) => t.id === taskToUpdate.parentTaskId);
        if (parentTask) {
          const siblings = firestoreTasks.filter((t) => t.parentTaskId === parentTask.id);
          const totalProgress = siblings.reduce((sum, task) => sum + task.progressPercent, 0);
          const parentNewProgress = Math.round(totalProgress / siblings.length);

          updateTaskInFirestore(parentTask.id, {
            ...parentTask,
            progressPercent: parentNewProgress,
          });
        }
      }
    },
    [firestoreTasks, firestoreSteps]
  );

  useEffect(() => {
    // Trigger progress update when steps change
    const taskIds = [...new Set(firestoreSteps.map((s) => s.parentTaskId))];
    taskIds.forEach((taskId) => {
      if (taskId) updateTaskProgress(taskId);
    });
  }, [firestoreSteps, updateTaskProgress]);

  // ============================================================================
  // TASK OPERATIONS
  // ============================================================================

  const updateStep = useCallback(
    (stepId: string, newStatus: StepStatus) => {
      if (!selectedTaskId) return;
      updateStepInFirestore(selectedTaskId, stepId, { status: newStatus });
    },
    [selectedTaskId]
  );

  const addStep = useCallback(
    (parentTaskId: string, title: string) => {
      const parentSteps = firestoreSteps.filter((s) => s.parentTaskId === parentTaskId);
      addStepToFirestore(parentTaskId, {
        id: `s${Date.now()}`,
        parentTaskId,
        title,
        status: StepStatus.Pending,
        order: parentSteps.length,
      });
    },
    [firestoreSteps]
  );

  const addAnalysisLog = useCallback(
    (concernId: string, log: string) => {
      addAnalysisLogToFirestore(concernId, log);
    },
    []
  );

  const deriveTaskFromConcern = useCallback(
    async (concern: Concern) => {
      const newTask = await deriveTaskFromConcernInFirestore(concern);
      return newTask;
    },
    []
  );

  const updateTask = useCallback(
    (taskId: string, newValues: Partial<Task>) => {
      const task = firestoreTasks.find((t) => t.id === taskId);
      if (!task) return;

      updateTaskInFirestore(taskId, { ...task, ...newValues });

      // Trigger progress update
      updateTaskProgress(taskId);

      // Update parent if exists
      if (task.parentTaskId) {
        updateTaskProgress(task.parentTaskId);
      }
    },
    [firestoreTasks, updateTaskProgress]
  );

  const updateConcern = useCallback(
    (concernId: string, newValues: Partial<Concern>) => {
      const concern = firestoreConcerns.find((c) => c.id === concernId);
      if (!concern) return;

      updateConcernInFirestore(concernId, { ...concern, ...newValues });
    },
    [firestoreConcerns]
  );

  const addTask = useCallback(
    (data: { title: string; description: string; category: TaskCategory; parentTaskId: string | null }) => {
      const siblings = firestoreTasks.filter((t) => t.parentTaskId === data.parentTaskId);
      const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        relatedConcernId: null,
        progressPercent: 0,
        status: TaskStatus.Pending,
        progressLog: [{ timestamp: new Date().toISOString(), log: '과제가 생성되었습니다.' }],
        order: siblings.length,
      };
      addTaskToFirestore(newTask);
    },
    [firestoreTasks]
  );

  const addConcern = useCallback(
    (data: { title: string; description: string; resolutionAction: string }) => {
      const newConcern: Omit<Concern, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        status: ConcernStatus.Analyzing,
        analysisLog: [{ timestamp: new Date().toISOString(), log: '고민이 생성되었습니다.' }],
      };
      addConcernToFirestore(newConcern);
    },
    []
  );

  const deleteTask = useCallback((taskId: string) => {
    deleteTaskInFirestore(taskId);
  }, []);

  const deleteConcern = useCallback((concernId: string) => {
    deleteConcernInFirestore(concernId);
  }, []);

  const reorderSteps = useCallback(
    (parentTaskId: string, startIndex: number, endIndex: number) => {
      if (!selectedTaskId) return;

      const relevantSteps = firestoreSteps
        .filter((s) => s.parentTaskId === parentTaskId)
        .sort((a, b) => {
          if (a.status === StepStatus.Completed && b.status !== StepStatus.Completed) return 1;
          if (a.status !== StepStatus.Completed && b.status === StepStatus.Completed) return -1;
          return a.order - b.order;
        });

      const otherSteps = firestoreSteps.filter((s) => s.parentTaskId !== parentTaskId);

      const [removed] = relevantSteps.splice(startIndex, 1);
      relevantSteps.splice(endIndex, 0, removed);

      const reordered = relevantSteps.map((item, index) => ({ ...item, order: index }));
      reorderStepsInFirestore(parentTaskId, reordered);
    },
    [firestoreSteps, selectedTaskId]
  );

  const reorderSubTasks = useCallback(
    (parentTaskId: string, startIndex: number, endIndex: number) => {
      const relevantTasks = firestoreTasks
        .filter((t) => t.parentTaskId === parentTaskId)
        .sort((a, b) => {
          if (a.status === TaskStatus.Completed && b.status !== TaskStatus.Completed) return 1;
          if (a.status !== TaskStatus.Completed && b.status === TaskStatus.Completed) return -1;
          return a.order - b.order;
        });

      const otherTasks = firestoreTasks.filter((t) => t.parentTaskId !== parentTaskId);

      const [removed] = relevantTasks.splice(startIndex, 1);
      relevantTasks.splice(endIndex, 0, removed);

      const reordered = relevantTasks.map((item, index) => ({ ...item, order: index }));
      reorderSubTasksInFirestore(parentTaskId, reordered);
    },
    [firestoreTasks]
  );

  const addMemo = useCallback(
    (parentStepId: string, content: string) => {
      if (!selectedTaskId) return;

      const newMemo: Omit<Memo, 'id'> = {
        parentStepId,
        content,
        timestamp: new Date().toISOString(),
      };
      addMemoToFirestore(selectedTaskId, parentStepId, newMemo);
    },
    [selectedTaskId]
  );

  const updateMemo = useCallback(
    (memoId: string, newContent: string) => {
      if (!selectedTaskId || !selectedStepId) return;

      updateMemoInFirestore(selectedTaskId, selectedStepId, memoId, {
        content: newContent,
        timestamp: new Date().toISOString(),
      });
    },
    [selectedTaskId, selectedStepId]
  );

  const deleteMemo = useCallback(
    (memoId: string) => {
      if (!selectedTaskId || !selectedStepId) return;

      deleteMemoInFirestore(selectedTaskId, selectedStepId, memoId);
    },
    [selectedTaskId, selectedStepId]
  );

  return {
    tasks: firestoreTasks,
    concerns: firestoreConcerns,
    steps: firestoreSteps,
    memos: firestoreMemos,
    updateStep,
    addStep,
    addTask,
    addConcern,
    addAnalysisLog,
    deriveTaskFromConcern,
    updateTask,
    updateConcern,
    deleteTask,
    deleteConcern,
    reorderSteps,
    reorderSubTasks,
    addMemo,
    updateMemo,
    deleteMemo,
    setSelectedTaskId,
    setSelectedStepId,
  };
};
