import { useState, useCallback, useEffect } from 'react';
import { Task, Concern, Step, Memo, TaskCategory, TaskStatus, StepStatus, ConcernStatus, LogEntry } from '../types';

const initialTasks: Task[] = [
  { id: 't1', parentTaskId: null, relatedConcernId: null, title: '2024년 하반기 마케팅 전략 수립', description: '블로그, 유튜브, 지역 광고를 포함한 종합 마케팅 전략 수립', category: TaskCategory.Project, status: TaskStatus.InProgress, progressPercent: 0, progressLog: [], order: 0 },
  { id: 't2', parentTaskId: 't1', relatedConcernId: null, title: '블로그 콘텐츠 기획', description: '하반기 동안 포스팅할 10개 주제 선정', category: TaskCategory.Now, status: TaskStatus.InProgress, progressPercent: 0, progressLog: [], order: 0 },
  { id: 't3', parentTaskId: 't1', relatedConcernId: 'c1', title: '유튜브 채널 리뉴얼', description: '채널 아트, 인트로 영상 등 리뉴얼 작업', category: TaskCategory.ToDo, status: TaskStatus.Pending, progressPercent: 0, progressLog: [], order: 1 },
  { id: 't4', parentTaskId: null, relatedConcernId: null, title: '신규 고객 DB 관리 시스템 도입', description: '효율적인 고객 관리를 위한 CRM 시스템 도입 검토', category: TaskCategory.Project, status: TaskStatus.Pending, progressPercent: 0, progressLog: [], order: 1 },
];

const initialConcerns: Concern[] = [
  { id: 'c1', title: '젊은 고객층 유입 감소', description: '최근 20-30대 고객의 문의가 줄어들고 있는 문제 분석 필요', status: ConcernStatus.Analyzing, analysisLog: [{ timestamp: new Date().toISOString(), log: '초기 문제 정의' }], resolutionAction: 'SNS 채널을 활용한 타겟 마케팅 강화 방안 모색 후, 유튜브 채널 리뉴얼 프로젝트 시작.' },
];

const initialSteps: Step[] = [
  { id: 's1', parentTaskId: 't2', title: '경쟁사 블로그 분석', status: StepStatus.Completed, order: 0 },
  { id: 's2', parentTaskId: 't2', title: '키워드 리서치', status: StepStatus.Completed, order: 1 },
  { id: 's3', parentTaskId: 't2', title: '주제 5개 초안 작성', status: StepStatus.Pending, order: 2 },
  { id: 's4', parentTaskId: 't2', title: '최종 주제 10개 확정', status: StepStatus.Pending, order: 3 },
  { id: 's5', parentTaskId: 't3', title: '디자이너 섭외', status: StepStatus.Pending, order: 0 },
];

const initialMemos: Memo[] = [
    { id: 'm1', parentStepId: 's1', content: 'A사, B사 블로그 주간 동향 정리 완료.', timestamp: new Date().toISOString() },
    { id: 'm2', parentStepId: 's2', content: '네이버 데이터랩, 구글 트렌드 활용.', timestamp: new Date().toISOString() },
];

export const useData = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [concerns, setConcerns] = useState<Concern[]>(initialConcerns);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [memos, setMemos] = useState<Memo[]>(initialMemos);

  const updateTaskProgress = useCallback((taskId: string) => {
    setTasks(prevTasks => {
      const taskToUpdate = prevTasks.find(t => t.id === taskId);
      if (!taskToUpdate) return prevTasks;

      let newProgress = 0;
      let newStatus = taskToUpdate.status;

      // Level 2 Task: Progress based on steps
      if (taskToUpdate.parentTaskId) {
        const childSteps = steps.filter(s => s.parentTaskId === taskId);
        if (childSteps.length > 0) {
          const completedSteps = childSteps.filter(s => s.status === StepStatus.Completed).length;
          newProgress = Math.round((completedSteps / childSteps.length) * 100);
          if (newProgress === 100 && taskToUpdate.status !== TaskStatus.Completed) {
             // Status is suggested in UI, not forced here unless already completed
          } else if (newProgress < 100 && taskToUpdate.status === TaskStatus.Completed) {
             newStatus = TaskStatus.InProgress;
          } else if (completedSteps > 0 && newProgress < 100) {
            newStatus = TaskStatus.InProgress;
          } else if (completedSteps === 0) {
            newStatus = TaskStatus.Pending;
          }
        }
      }
      // Level 1 Project: Progress based on child tasks
      else {
        const childTasks = prevTasks.filter(t => t.parentTaskId === taskId);
        if (childTasks.length > 0) {
          const totalProgress = childTasks.reduce((sum, task) => sum + task.progressPercent, 0);
          newProgress = Math.round(totalProgress / childTasks.length);
        }
      }
      
      const updatedTasks = prevTasks.map(t => t.id === taskId ? { ...t, progressPercent: newProgress, status: newStatus } : t);

      // Cascade update to parent project if exists
      if(taskToUpdate.parentTaskId) {
          const parentTask = updatedTasks.find(t => t.id === taskToUpdate.parentTaskId);
          if(parentTask) {
              const siblings = updatedTasks.filter(t => t.parentTaskId === parentTask.id);
              const totalProgress = siblings.reduce((sum, task) => sum + task.progressPercent, 0);
              const parentNewProgress = Math.round(totalProgress / siblings.length);
              return updatedTasks.map(t => t.id === parentTask.id ? {...t, progressPercent: parentNewProgress} : t);
          }
      }
      return updatedTasks;
    });
  }, [steps]);

  useEffect(() => {
    const taskIds = [...new Set(steps.map(s => s.parentTaskId))];
    taskIds.forEach(updateTaskProgress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const updateStep = useCallback((stepId: string, newStatus: StepStatus) => {
    setSteps(prevSteps => prevSteps.map(s => s.id === stepId ? { ...s, status: newStatus } : s));
  }, []);

  const addStep = useCallback((parentTaskId: string, title: string) => {
    setSteps(prev => {
      const parentSteps = prev.filter(s => s.parentTaskId === parentTaskId);
      const newStep: Step = {
        id: `s${Date.now()}`,
        parentTaskId,
        title,
        status: StepStatus.Pending,
        order: parentSteps.length,
      };
      return [...prev, newStep];
    });
  }, []);

  const addAnalysisLog = useCallback((concernId: string, log: string) => {
    setConcerns(prev => prev.map(c => c.id === concernId ? { ...c, analysisLog: [...c.analysisLog, { timestamp: new Date().toISOString(), log }] } : c));
  }, []);
  
  const deriveTaskFromConcern = useCallback((concern: Concern) => {
    let createdTask: Task | null = null;
    setTasks(prev => {
        const siblings = prev.filter(t => t.parentTaskId === null && t.category === TaskCategory.ToDo);
        const newTask: Task = {
            id: `t${Date.now()}`,
            parentTaskId: null,
            relatedConcernId: concern.id,
            title: `[고민 해결] ${concern.title}`,
            description: concern.resolutionAction,
            category: TaskCategory.ToDo,
            status: TaskStatus.Pending,
            progressPercent: 0,
            progressLog: [{timestamp: new Date().toISOString(), log: `'${concern.title}' 고민에서 파생된 과제입니다.`}],
            order: siblings.length
        };
        createdTask = newTask;
        return [...prev, newTask];
    });
    setConcerns(prev => prev.map(c => c.id === concern.id ? {...c, status: ConcernStatus.SolutionDerived} : c));
    return createdTask!;
  }, []);
  
  const updateTask = useCallback((taskId: string, newValues: Partial<Task>) => {
    setTasks(prev => {
        const newTasks = prev.map(t => t.id === taskId ? { ...t, ...newValues } : t)
        const task = newTasks.find(t => t.id === taskId);
        // After updating the task (e.g. status), we must trigger the progress update for the parent.
        if (task) {
           updateTaskProgress(task.id);
           if (task.parentTaskId) {
             const parentTask = newTasks.find(t => t.id === task.parentTaskId);
             if (parentTask) {
                const siblings = newTasks.filter(t => t.parentTaskId === parentTask.id);
                const totalProgress = siblings.reduce((sum, task) => sum + task.progressPercent, 0);
                const parentNewProgress = Math.round(totalProgress / siblings.length);
                return newTasks.map(t => t.id === parentTask.id ? {...t, progressPercent: parentNewProgress} : t);
             }
           }
        }
        return newTasks;
    });
  }, [updateTaskProgress]);

  const updateConcern = useCallback((concernId: string, newValues: Partial<Concern>) => {
    setConcerns(prev => prev.map(c => c.id === concernId ? { ...c, ...newValues } : c));
  }, []);

  const addTask = useCallback((data: { title: string, description: string, category: TaskCategory, parentTaskId: string | null }) => {
    setTasks(prev => {
        const siblings = prev.filter(t => t.parentTaskId === data.parentTaskId);
        const newLog: LogEntry = { timestamp: new Date().toISOString(), log: '과제가 생성되었습니다.' };
        const newTask: Task = {
          id: `t${Date.now()}`,
          relatedConcernId: null,
          progressPercent: 0,
          status: TaskStatus.Pending,
          progressLog: [newLog],
          ...data,
          order: siblings.length,
        };
        return [...prev, newTask];
    });
  }, []);

  const addConcern = useCallback((data: { title: string, description: string, resolutionAction: string }) => {
    const newLog: LogEntry = { timestamp: new Date().toISOString(), log: '고민이 생성되었습니다.' };
    const newConcern: Concern = {
      id: `c${Date.now()}`,
      status: ConcernStatus.Analyzing,
      analysisLog: [newLog],
      ...data,
    };
    setConcerns(prev => [...prev, newConcern]);
  }, []);
  
  const deleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => {
        const taskToDelete = prevTasks.find(t => t.id === taskId);
        if (!taskToDelete) return prevTasks;

        const subTaskIdsToDelete = prevTasks
            .filter(t => t.parentTaskId === taskId)
            .map(t => t.id);

        const allTaskIdsToDelete = [taskId, ...subTaskIdsToDelete];
        
        const newTasks = prevTasks.filter(t => !allTaskIdsToDelete.includes(t.id));

        setSteps(prevSteps => {
            const stepsToDelete = prevSteps.filter(s => allTaskIdsToDelete.includes(s.parentTaskId));
            const stepIdsToDelete = stepsToDelete.map(s => s.id);
            setMemos(prevMemos => prevMemos.filter(m => !stepIdsToDelete.includes(m.parentStepId)));
            return prevSteps.filter(s => !allTaskIdsToDelete.includes(s.parentTaskId));
        });
        
        if (taskToDelete.parentTaskId) {
            const parentTaskId = taskToDelete.parentTaskId;
            const siblings = newTasks.filter(t => t.parentTaskId === parentTaskId);
            const totalProgress = siblings.reduce((sum, task) => sum + task.progressPercent, 0);
            const parentNewProgress = siblings.length > 0 ? Math.round(totalProgress / siblings.length) : 0;
            const finalTasks = newTasks.map(t => t.id === parentTaskId ? {...t, progressPercent: parentNewProgress} : t);
            return finalTasks;
        }

        return newTasks;
    });
  }, []);

  const deleteConcern = useCallback((concernId: string) => {
    setConcerns(prev => prev.filter(c => c.id !== concernId));
    setTasks(prev => prev.map(t => t.relatedConcernId === concernId ? { ...t, relatedConcernId: null } : t));
  }, []);

  const reorderArray = <T extends { order: number }>(list: T[], startIndex: number, endIndex: number): T[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result.map((item, index) => ({ ...item, order: index }));
  };

  const reorderSteps = useCallback((parentTaskId: string, startIndex: number, endIndex: number) => {
      setSteps(prevSteps => {
          const relevantSteps = prevSteps
            .filter(s => s.parentTaskId === parentTaskId)
            .sort((a, b) => {
                if (a.status === StepStatus.Completed && b.status !== StepStatus.Completed) return 1;
                if (a.status !== StepStatus.Completed && b.status === StepStatus.Completed) return -1;
                return a.order - b.order;
            });
          const otherSteps = prevSteps.filter(s => s.parentTaskId !== parentTaskId);
          const reordered = reorderArray(relevantSteps, startIndex, endIndex);
          return [...otherSteps, ...reordered];
      });
  }, []);

  const reorderSubTasks = useCallback((parentTaskId: string, startIndex: number, endIndex: number) => {
      setTasks(prevTasks => {
          const relevantTasks = prevTasks
            .filter(t => t.parentTaskId === parentTaskId)
            .sort((a, b) => {
                if (a.status === TaskStatus.Completed && b.status !== TaskStatus.Completed) return 1;
                if (a.status !== TaskStatus.Completed && b.status === TaskStatus.Completed) return -1;
                return a.order - b.order;
            });
          const otherTasks = prevTasks.filter(t => t.parentTaskId !== parentTaskId);
          const reordered = reorderArray(relevantTasks, startIndex, endIndex);
          return [...otherTasks, ...reordered];
      });
  }, []);
  
  const addMemo = useCallback((parentStepId: string, content: string) => {
    const newMemo: Memo = {
      id: `m${Date.now()}`,
      parentStepId,
      content,
      timestamp: new Date().toISOString(),
    };
    setMemos(prev => [...prev, newMemo]);
  }, []);

  const updateMemo = useCallback((memoId: string, newContent: string) => {
    setMemos(prev => prev.map(m => m.id === memoId ? { ...m, content: newContent, timestamp: new Date().toISOString() } : m));
  }, []);

  const deleteMemo = useCallback((memoId: string) => {
    setMemos(prev => prev.filter(m => m.id !== memoId));
  }, []);


  return { tasks, concerns, steps, memos, updateStep, addStep, addTask, addConcern, addAnalysisLog, deriveTaskFromConcern, updateTask, updateConcern, deleteTask, deleteConcern, reorderSteps, reorderSubTasks, addMemo, updateMemo, deleteMemo };
};