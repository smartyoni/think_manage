import React, { useState, useEffect } from 'react';
import { Task, Concern, Step, Memo, StepStatus, TaskStatus } from '../types';
import { CloseIcon, PlusIcon, ArrowRightIcon, EditIcon, DeleteIcon, GrabHandleIcon, MemoIcon, SaveIcon } from './icons';

type DetailModalProps = {
  item: Task | Concern;
  allTasks: Task[];
  allSteps: Step[];
  allMemos: Memo[];
  onClose: () => void;
  onUpdateStep: (stepId: string, newStatus: StepStatus) => void;
  onAddStep: (parentTaskId: string, title: string) => void;
  onAddLog: (concernId: string, log: string) => void;
  onDeriveTask: (concern: Concern) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onUpdateTask: (taskId: string, newValues: Partial<Task>) => void;
  onUpdateConcern: (concernId: string, newValues: Partial<Concern>) => void;
  onDeleteItem: (item: Task | Concern) => void;
  onSelectItem: (item: Task) => void;
  onAddSubTask: (parentTaskId: string, title: string) => void;
  onReorderSubTasks: (parentTaskId: string, startIndex: number, endIndex: number) => void;
  onReorderSteps: (parentTaskId: string, startIndex: number, endIndex: number) => void;
  onAddMemo: (parentStepId: string, content: string) => void;
  onUpdateMemo: (memoId: string, newContent: string) => void;
  onDeleteMemo: (memoId: string) => void;
};

const DetailModal: React.FC<DetailModalProps> = ({
  item, allTasks, allSteps, allMemos, onClose, onUpdateStep, onAddStep, onAddLog, onDeriveTask, onUpdateTaskStatus, onUpdateTask, onUpdateConcern, onDeleteItem, onSelectItem, onAddSubTask, onReorderSubTasks, onReorderSteps, onAddMemo, onUpdateMemo, onDeleteMemo
}) => {
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [newLogEntry, setNewLogEntry] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [visibleMemosStepId, setVisibleMemosStepId] = useState<string | null>(null);
  const [newMemoContent, setNewMemoContent] = useState('');
  const [editingMemo, setEditingMemo] = useState<{id: string, content: string} | null>(null);
  
  const [editedData, setEditedData] = useState({
      title: item.title,
      description: item.description,
      resolutionAction: 'resolutionAction' in item ? item.resolutionAction : '',
  });

  useEffect(() => {
      setIsEditing(false);
      setEditedData({
          title: item.title,
          description: item.description,
          resolutionAction: 'resolutionAction' in item ? item.resolutionAction : '',
      });
  }, [item]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setEditedData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = () => {
      if ('progressPercent' in item) {
          onUpdateTask(item.id, { title: editedData.title, description: editedData.description });
      } else {
          onUpdateConcern(item.id, { title: editedData.title, description: editedData.description, resolutionAction: editedData.resolutionAction });
      }
      setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`'${item.title}' 항목을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
        onDeleteItem(item);
    }
  };


  const isTask = 'progressPercent' in item;
  const isProject = isTask && item.parentTaskId === null;
  const isSubTask = isTask && item.parentTaskId !== null;
  const isConcern = !isTask;

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStepTitle.trim() && isSubTask) {
      onAddStep(item.id, newStepTitle.trim());
      setNewStepTitle('');
    }
  };

  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubTaskTitle.trim() && isProject) {
      onAddSubTask(item.id, newSubTaskTitle.trim());
      setNewSubTaskTitle('');
    }
  };
  
  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLogEntry.trim() && isConcern) {
      onAddLog(item.id, newLogEntry.trim());
      setNewLogEntry('');
    }
  };

  const dndHandlers = (type: 'subtask' | 'step', parentId: string, onReorder: (parentId: string, startIndex: number, endIndex: number) => void) => ({
    handleDragStart: (e: React.DragEvent, index: number) => {
      e.dataTransfer.setData('application/json', JSON.stringify({ index, parentId, type }));
      (e.currentTarget as HTMLElement).style.opacity = '0.4';
    },
    handleDragEnter: (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex(index);
    },
    handleDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverIndex(null);
    },
    handleDragOver: (e: React.DragEvent) => {
      e.preventDefault();
    },
    handleDrop: (e: React.DragEvent, endIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        if (data.type !== type || data.parentId !== parentId) return;
        const { index: startIndex } = data;
        if (startIndex !== endIndex) {
          onReorder(parentId, startIndex, endIndex);
        }
      } catch (error) {
        console.error("Failed to parse drag-and-drop data:", error);
      }
    },
    handleDragEnd: (e: React.DragEvent) => {
      (e.currentTarget as HTMLElement).style.opacity = '1';
      setDragOverIndex(null);
    },
  });

  const subTaskDnd = dndHandlers('subtask', item.id, onReorderSubTasks);
  const stepDnd = dndHandlers('step', item.id, onReorderSteps);

  const renderSubTasks = () => {
    if (!isProject) return null;
    const subTasks = allTasks
      .filter(t => t.parentTaskId === item.id)
      .sort((a, b) => {
        if (a.status === TaskStatus.Completed && b.status !== TaskStatus.Completed) return 1;
        if (a.status !== TaskStatus.Completed && b.status === TaskStatus.Completed) return -1;
        return a.order - b.order;
      });
    return (
      <div className="mt-4">
        <h4 className="font-semibold text-gray-700 mb-2">세부 과제 (Level 2)</h4>
        {subTasks.length > 0 ? (
          <ul className="space-y-2">
            {subTasks.map((task, index) => (
              <li key={task.id} 
                className={`p-3 rounded-md flex justify-between items-center group transition-colors ${dragOverIndex === index ? 'bg-indigo-100' : 'bg-gray-50'}`}
                draggable
                onDragStart={(e) => subTaskDnd.handleDragStart(e, index)}
                onDragEnter={(e) => subTaskDnd.handleDragEnter(e, index)}
                onDragLeave={subTaskDnd.handleDragLeave}
                onDragOver={subTaskDnd.handleDragOver}
                onDrop={(e) => subTaskDnd.handleDrop(e, index)}
                onDragEnd={subTaskDnd.handleDragEnd}
              >
                 <div className="flex items-center flex-1">
                    <span className="cursor-grab mr-2"><GrabHandleIcon /></span>
                    <div className="flex-1 cursor-pointer" onClick={() => onSelectItem(task)}>
                        <p className={`font-medium text-gray-800 group-hover:text-indigo-600 transition ${task.status === TaskStatus.Completed ? 'line-through text-gray-400' : ''}`}>{task.title}</p>
                    </div>
                 </div>
                 <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 mr-4">{task.progressPercent}%</span>
                    <button 
                        onClick={() => { if (window.confirm(`'${task.title}' 세부 과제를 정말 삭제하시겠습니까?`)) { onDeleteItem(task); } }} 
                        className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition"
                        aria-label={`Delete task ${task.title}`}
                    >
                        <DeleteIcon />
                    </button>
                 </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500">세부 과제가 없습니다.</p>}
        <form onSubmit={handleAddSubTask} className="flex items-center space-x-2 mt-3">
           <input type="text" value={newSubTaskTitle} onChange={e => setNewSubTaskTitle(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="새 세부 과제 추가..." />
           <button type="submit" className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
             <PlusIcon />
           </button>
        </form>
      </div>
    );
  };
  
  const renderSteps = () => {
    if (!isSubTask) return null;
    const steps = allSteps
      .filter(s => s.parentTaskId === item.id)
      .sort((a, b) => {
        if (a.status === StepStatus.Completed && b.status !== StepStatus.Completed) return 1;
        if (a.status !== StepStatus.Completed && b.status === StepStatus.Completed) return -1;
        return a.order - b.order;
      });
    const allStepsCompleted = steps.length > 0 && steps.every(s => s.status === StepStatus.Completed);

    return (
      <div className="mt-4">
        <h4 className="font-semibold text-gray-700 mb-2">실행 단계 (Level 3)</h4>
        {allStepsCompleted && item.status !== TaskStatus.Completed && (
          <div className="p-3 bg-green-100 border-l-4 border-green-500 rounded-r-md mb-3">
            <p className="text-green-800 text-sm">모든 실행 단계가 완료되었습니다. 과제 상태를 '완료'로 변경하세요.</p>
            <button 
              onClick={() => onUpdateTaskStatus(item.id, TaskStatus.Completed)}
              className="mt-2 text-sm bg-green-500 text-white font-semibold py-1 px-3 rounded-md hover:bg-green-600 transition">
              '완료'로 변경
            </button>
          </div>
        )}
        <ul className="space-y-2 mb-3">
          {steps.map((step, index) => {
            const stepMemos = allMemos.filter(m => m.parentStepId === step.id);
            return(
            <li key={step.id}>
                <div 
                    className={`flex items-center p-2 rounded-md transition-colors ${dragOverIndex === index ? 'bg-indigo-100' : 'bg-gray-50'}`}
                    draggable
                    onDragStart={(e) => stepDnd.handleDragStart(e, index)}
                    onDragEnter={(e) => stepDnd.handleDragEnter(e, index)}
                    onDragLeave={stepDnd.handleDragLeave}
                    onDragOver={stepDnd.handleDragOver}
                    onDrop={(e) => stepDnd.handleDrop(e, index)}
                    onDragEnd={stepDnd.handleDragEnd}
                >
                   <span className="cursor-grab mr-2"><GrabHandleIcon /></span>
                   <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={step.status === StepStatus.Completed}
                    onChange={() => onUpdateStep(step.id, step.status === StepStatus.Completed ? StepStatus.Pending : StepStatus.Completed)}
                   />
                   <span className={`ml-3 text-gray-700 flex-grow ${step.status === StepStatus.Completed ? 'line-through text-gray-400' : ''}`}>
                     {step.title}
                   </span>
                   <button onClick={() => setVisibleMemosStepId(visibleMemosStepId === step.id ? null : step.id)} className="flex items-center text-gray-500 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-200">
                        <MemoIcon/>
                        <span className="text-xs ml-1 font-semibold">{stepMemos.length}</span>
                   </button>
                </div>
                 {visibleMemosStepId === step.id && (
                    <div className="pl-10 pr-2 py-2 bg-gray-50 rounded-b-md">
                        {stepMemos.length > 0 && (
                            <ul className="space-y-2 mb-2">
                                {stepMemos.map(memo => (
                                    <li key={memo.id} className="text-sm text-gray-600 group flex items-start">
                                        {editingMemo?.id === memo.id ? (
                                            <div className="flex-grow flex items-center">
                                                <input type="text" value={editingMemo.content} onChange={(e) => setEditingMemo({...editingMemo, content: e.target.value})} className="flex-grow p-1 border border-gray-300 rounded-md"/>
                                                <button onClick={() => { onUpdateMemo(editingMemo.id, editingMemo.content); setEditingMemo(null);}} className="p-1 text-gray-500 hover:text-green-600"><SaveIcon/></button>
                                                <button onClick={() => setEditingMemo(null)} className="p-1 text-gray-500 hover:text-gray-800"><CloseIcon/></button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="flex-grow whitespace-pre-wrap">{memo.content} <span className="text-xs text-gray-400">- {new Date(memo.timestamp).toLocaleDateString()}</span></p>
                                                <div className="opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                                                    <button onClick={() => setEditingMemo({id: memo.id, content: memo.content})} className="p-1 text-gray-500 hover:text-indigo-600"><EditIcon/></button>
                                                    <button onClick={() => {if(window.confirm('이 메모를 삭제하시겠습니까?')) {onDeleteMemo(memo.id)}}} className="p-1 text-gray-500 hover:text-red-600"><DeleteIcon/></button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                         <form onSubmit={(e) => { e.preventDefault(); onAddMemo(step.id, newMemoContent); setNewMemoContent(''); }} className="flex items-center space-x-2">
                            <input type="text" value={newMemoContent} onChange={e => setNewMemoContent(e.target.value)} className="flex-grow p-1.5 border border-gray-300 rounded-md text-sm" placeholder="새 메모 추가..."/>
                            <button type="submit" className="p-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"><PlusIcon/></button>
                        </form>
                    </div>
                 )}
            </li>
          )})}
        </ul>
        <form onSubmit={handleAddStep} className="flex items-center space-x-2">
           <input type="text" value={newStepTitle} onChange={e => setNewStepTitle(e.target.value)}
            className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="새 실행 단계 추가..." />
           <button type="submit" className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
             <PlusIcon />
           </button>
        </form>
      </div>
    );
  };

  const renderAnalysisLog = () => {
    if (!isConcern) return null;
    const relatedTasks = allTasks.filter(t => t.relatedConcernId === item.id);
    const allRelatedTasksCompleted = relatedTasks.length > 0 && relatedTasks.every(t => t.status === TaskStatus.Completed);

    return (
      <div className="mt-4">
        {item.status !== '해결 완료' && (
        <button onClick={() => onDeriveTask(item)} className="w-full flex items-center justify-center p-2 mb-4 bg-teal-500 text-white font-semibold rounded-md hover:bg-teal-600 transition">
          해결 방안으로 과제 생성 <ArrowRightIcon/>
        </button>
        )}
         {allRelatedTasksCompleted && item.status !== '해결 완료' && (
          <div className="p-3 bg-green-100 border-l-4 border-green-500 rounded-r-md mb-3">
            <p className="text-green-800 text-sm">이 고민에서 파생된 모든 과제가 완료되었습니다. 고민 상태를 '해결 완료'로 변경할 수 있습니다.</p>
          </div>
        )}
        <h4 className="font-semibold text-gray-700 mb-2">분석 기록</h4>
        <div className="max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-md mb-3 space-y-3">
          {item.analysisLog.map((log, i) => (
            <div key={i}>
                <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                <p className="text-sm text-gray-800">{log.log}</p>
            </div>
          ))}
        </div>
        {!isEditing && (
            <form onSubmit={handleAddLog} className="flex items-center space-x-2">
                <input type="text" value={newLogEntry} onChange={e => setNewLogEntry(e.target.value)}
                    className="flex-grow p-2 border border-gray-300 rounded-md"
                    placeholder="새 분석 기록 추가..." />
                <button type="submit" className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    <PlusIcon />
                </button>
            </form>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
           {isEditing ? (
              <input name="title" value={editedData.title} onChange={handleInputChange} className="text-xl font-bold text-gray-800 w-full p-1 -m-1 border-b-2 border-indigo-500 focus:outline-none bg-indigo-50 rounded"/>
            ) : (
              <h2 className="text-xl font-bold text-gray-800">{item.title}</h2>
            )}
            <div className="flex items-center space-x-1 ml-4 flex-shrink-0">
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-full hover:bg-gray-100">
                        <EditIcon/>
                    </button>
                )}
                <button onClick={handleDelete} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100">
                    <DeleteIcon />
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <CloseIcon />
                </button>
            </div>
        </div>
        <div className="p-6 overflow-y-auto">
            {isEditing ? (
              <textarea name="description" value={editedData.description} onChange={handleInputChange} rows={4} className="text-gray-600 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"/>
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">{item.description}</p>
            )}
          {isTask && (
            <div className="mt-4">
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">진행률</span>
                    <span className="text-sm font-medium text-gray-700">{item.progressPercent}%</span>
                </div>
            </div>
          )}
          
          {!isEditing && (
            <>
              {renderSubTasks()}
              {renderSteps()}
            </>
          )}

          {isConcern && isEditing && (
            <div className="mt-4">
                <label htmlFor="resolutionAction" className="block text-sm font-medium text-gray-700 mb-1">
                    초기 해결 방안
                </label>
                <textarea
                    id="resolutionAction"
                    name="resolutionAction"
                    value={editedData.resolutionAction}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
          )}

          {!isEditing && renderAnalysisLog()}
        </div>
        {isEditing && (
            <div className="p-4 border-t flex justify-end space-x-3 bg-slate-50 rounded-b-lg">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">취소</button>
                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">저장</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default DetailModal;