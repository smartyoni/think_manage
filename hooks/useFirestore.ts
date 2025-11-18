import { useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import { Task, Concern, Step, Memo, TaskCategory, TaskStatus, StepStatus, ConcernStatus } from '../types';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';

// ============================================================================
// REAL-TIME LISTENERS (Hooks)
// ============================================================================

export const useFirestoreTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
          } as Task;
        });
        setTasks(tasksData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching tasks:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { tasks, loading, error };
};

export const useFirestoreConcerns = () => {
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const concernsRef = collection(db, 'concerns');
    const q = query(concernsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const concernsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
          } as Concern;
        });
        setConcerns(concernsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching concerns:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { concerns, loading, error };
};

export const useFirestoreSteps = (taskId: string) => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!taskId) {
      setSteps([]);
      setLoading(false);
      return;
    }

    const stepsRef = collection(db, 'tasks', taskId, 'steps');
    const q = query(stepsRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const stepsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Step[];
        setSteps(stepsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching steps:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [taskId]);

  return { steps, loading, error };
};

export const useFirestoreMemos = (taskId: string, stepId: string) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!taskId || !stepId) {
      setMemos([]);
      setLoading(false);
      return;
    }

    const memosRef = collection(db, 'tasks', taskId, 'steps', stepId, 'memos');
    const q = query(memosRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const memosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Memo[];
        setMemos(memosData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching memos:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [taskId, stepId]);

  return { memos, loading, error };
};

// ============================================================================
// TASK OPERATIONS
// ============================================================================

export const addTaskToFirestore = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const tasksRef = collection(db, 'tasks');
    const docRef = await addDoc(tasksRef, {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
};

export const updateTaskInFirestore = async (taskId: string, updates: Partial<Task>) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const { id, createdAt, updatedAt, ...cleanUpdates } = updates as any;
    await updateDoc(taskRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

export const deleteTaskInFirestore = async (taskId: string) => {
  try {
    const batch = writeBatch(db);

    // Delete the task
    const taskRef = doc(db, 'tasks', taskId);
    batch.delete(taskRef);

    // Delete child tasks
    const childTasksQuery = query(collection(db, 'tasks'), where('parentTaskId', '==', taskId));
    const childTasksSnapshot = await getDocs(childTasksQuery);

    for (const childDoc of childTasksSnapshot.docs) {
      batch.delete(childDoc.ref);

      // Delete steps for each child task
      const stepsSnapshot = await getDocs(collection(db, 'tasks', childDoc.id, 'steps'));
      for (const stepDoc of stepsSnapshot.docs) {
        batch.delete(stepDoc.ref);

        // Delete memos for each step
        const memosSnapshot = await getDocs(
          collection(db, 'tasks', childDoc.id, 'steps', stepDoc.id, 'memos')
        );
        memosSnapshot.forEach((memoDoc) => {
          batch.delete(memoDoc.ref);
        });
      }
    }

    // Delete steps for the parent task
    const stepsSnapshot = await getDocs(collection(db, 'tasks', taskId, 'steps'));
    for (const stepDoc of stepsSnapshot.docs) {
      batch.delete(stepDoc.ref);

      // Delete memos for each step
      const memosSnapshot = await getDocs(
        collection(db, 'tasks', taskId, 'steps', stepDoc.id, 'memos')
      );
      memosSnapshot.forEach((memoDoc) => {
        batch.delete(memoDoc.ref);
      });
    }

    await batch.commit();
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// ============================================================================
// CONCERN OPERATIONS
// ============================================================================

export const addConcernToFirestore = async (
  concernData: Omit<Concern, 'id' | 'createdAt' | 'updatedAt'>
) => {
  try {
    const concernsRef = collection(db, 'concerns');
    const docRef = await addDoc(concernsRef, {
      ...concernData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding concern:', error);
    throw error;
  }
};

export const updateConcernInFirestore = async (concernId: string, updates: Partial<Concern>) => {
  try {
    const concernRef = doc(db, 'concerns', concernId);
    const { id, createdAt, updatedAt, ...cleanUpdates } = updates as any;
    await updateDoc(concernRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating concern:', error);
    throw error;
  }
};

export const deleteConcernInFirestore = async (concernId: string) => {
  try {
    const batch = writeBatch(db);

    // Delete the concern
    const concernRef = doc(db, 'concerns', concernId);
    batch.delete(concernRef);

    // Unlink related tasks
    const relatedTasksQuery = query(
      collection(db, 'tasks'),
      where('relatedConcernId', '==', concernId)
    );
    const relatedTasksSnapshot = await getDocs(relatedTasksQuery);
    relatedTasksSnapshot.forEach((taskDoc) => {
      batch.update(taskDoc.ref, { relatedConcernId: null });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error deleting concern:', error);
    throw error;
  }
};

// ============================================================================
// STEP OPERATIONS
// ============================================================================

export const addStepToFirestore = async (taskId: string, stepData: Omit<Step, 'id'>) => {
  try {
    const stepsRef = collection(db, 'tasks', taskId, 'steps');
    const docRef = await addDoc(stepsRef, stepData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding step:', error);
    throw error;
  }
};

export const updateStepInFirestore = async (taskId: string, stepId: string, updates: Partial<Step>) => {
  try {
    const stepRef = doc(db, 'tasks', taskId, 'steps', stepId);
    const { id, ...cleanUpdates } = updates as any;
    await updateDoc(stepRef, cleanUpdates);
  } catch (error) {
    console.error('Error updating step:', error);
    throw error;
  }
};

export const deleteStepInFirestore = async (taskId: string, stepId: string) => {
  try {
    const batch = writeBatch(db);

    // Delete the step
    const stepRef = doc(db, 'tasks', taskId, 'steps', stepId);
    batch.delete(stepRef);

    // Delete memos for this step
    const memosSnapshot = await getDocs(
      collection(db, 'tasks', taskId, 'steps', stepId, 'memos')
    );
    memosSnapshot.forEach((memoDoc) => {
      batch.delete(memoDoc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error deleting step:', error);
    throw error;
  }
};

// ============================================================================
// MEMO OPERATIONS
// ============================================================================

export const addMemoToFirestore = async (
  taskId: string,
  stepId: string,
  memoData: Omit<Memo, 'id'>
) => {
  try {
    const memosRef = collection(db, 'tasks', taskId, 'steps', stepId, 'memos');
    const docRef = await addDoc(memosRef, memoData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding memo:', error);
    throw error;
  }
};

export const updateMemoInFirestore = async (
  taskId: string,
  stepId: string,
  memoId: string,
  updates: Partial<Memo>
) => {
  try {
    const memoRef = doc(db, 'tasks', taskId, 'steps', stepId, 'memos', memoId);
    const { id, ...cleanUpdates } = updates as any;
    await updateDoc(memoRef, {
      ...cleanUpdates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating memo:', error);
    throw error;
  }
};

export const deleteMemoInFirestore = async (
  taskId: string,
  stepId: string,
  memoId: string
) => {
  try {
    const memoRef = doc(db, 'tasks', taskId, 'steps', stepId, 'memos', memoId);
    await deleteDoc(memoRef);
  } catch (error) {
    console.error('Error deleting memo:', error);
    throw error;
  }
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export const reorderStepsInFirestore = async (
  taskId: string,
  steps: Step[]
) => {
  try {
    const batch = writeBatch(db);
    steps.forEach((step, index) => {
      const stepRef = doc(db, 'tasks', taskId, 'steps', step.id);
      batch.update(stepRef, { order: index });
    });
    await batch.commit();
  } catch (error) {
    console.error('Error reordering steps:', error);
    throw error;
  }
};

export const reorderSubTasksInFirestore = async (
  parentTaskId: string | null,
  tasks: Task[]
) => {
  try {
    const batch = writeBatch(db);
    tasks.forEach((task, index) => {
      const taskRef = doc(db, 'tasks', task.id);
      batch.update(taskRef, { order: index });
    });
    await batch.commit();
  } catch (error) {
    console.error('Error reordering tasks:', error);
    throw error;
  }
};

// ============================================================================
// SPECIAL OPERATIONS
// ============================================================================

export const deriveTaskFromConcernInFirestore = async (concern: Concern): Promise<Task> => {
  try {
    const batch = writeBatch(db);

    // Create new task
    const tasksRef = collection(db, 'tasks');
    const newTaskRef = await addDoc(tasksRef, {
      parentTaskId: null,
      relatedConcernId: concern.id,
      title: `[고민 해결] ${concern.title}`,
      description: concern.resolutionAction,
      category: TaskCategory.ToDo,
      status: TaskStatus.Pending,
      progressPercent: 0,
      progressLog: [{
        timestamp: new Date().toISOString(),
        log: `'${concern.title}' 고민에서 파생된 과제입니다.`,
      }],
      order: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update concern status
    const concernRef = doc(db, 'concerns', concern.id);
    batch.update(concernRef, {
      status: ConcernStatus.SolutionDerived,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    return {
      id: newTaskRef.id,
      parentTaskId: null,
      relatedConcernId: concern.id,
      title: `[고민 해결] ${concern.title}`,
      description: concern.resolutionAction,
      category: TaskCategory.ToDo,
      status: TaskStatus.Pending,
      progressPercent: 0,
      progressLog: [{
        timestamp: new Date().toISOString(),
        log: `'${concern.title}' 고민에서 파생된 과제입니다.`,
      }],
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error deriving task from concern:', error);
    throw error;
  }
};

export const addAnalysisLogToFirestore = async (concernId: string, logEntry: string) => {
  try {
    const concernRef = doc(db, 'concerns', concernId);
    const concern = await getDocs(query(collection(db, 'concerns'), where('__name__', '==', concernId))).then(
      (snapshot) => snapshot.docs[0]?.data() as Concern | undefined
    );

    if (!concern) throw new Error('Concern not found');

    const updatedLog = [
      ...(concern.analysisLog || []),
      {
        timestamp: new Date().toISOString(),
        log: logEntry,
      },
    ];

    await updateDoc(concernRef, {
      analysisLog: updatedLog,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error adding analysis log:', error);
    throw error;
  }
};
