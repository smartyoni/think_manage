export enum TaskCategory {
  Project = '프로젝트',
  Now = '지금할일',
  ToDo = '해야할일',
}

export enum TaskStatus {
  Pending = '대기',
  InProgress = '진행중',
  Completed = '완료',
}

export enum ConcernStatus {
  Analyzing = '분석중',
  SolutionDerived = '해결 방안 도출',
  Resolved = '해결 완료',
}

export enum StepStatus {
  Pending = '대기',
  Completed = '완료',
}

export interface LogEntry {
  timestamp: string;
  log: string;
}

export interface Step {
  id: string;
  parentTaskId: string;
  title: string;
  status: StepStatus;
  order: number;
}

export interface Memo {
  id: string;
  parentStepId: string;
  content: string;
  timestamp: string;
}

export interface Task {
  id:string;
  parentTaskId: string | null;
  relatedConcernId: string | null;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  progressPercent: number;
  progressLog: LogEntry[];
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Concern {
  id: string;
  title: string;
  description: string;
  status: ConcernStatus;
  analysisLog: LogEntry[];
  resolutionAction: string;
  createdAt?: Date;
  updatedAt?: Date;
}