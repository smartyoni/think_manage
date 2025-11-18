import React, { useState, useMemo, useEffect } from 'react';
import { Task, Concern, TaskCategory } from './types';
import { useData } from './hooks/useData';
import Card from './components/Card';
import DetailModal from './components/DetailModal';
import CreationModal from './components/CreationModal';
import { ProjectIcon, NowIcon, ToDoIcon, ConcernIcon, PlusIcon } from './components/icons';

type View = 'tasks' | 'concerns';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('tasks');
  const [selectedItem, setSelectedItem] = useState<Task | Concern | null>(null);
  const [creationModalType, setCreationModalType] = useState<'task' | 'concern' | null>(null);
  const data = useData();

  useEffect(() => {
    if (selectedItem) {
        if ('progressPercent' in selectedItem) {
            const updatedItem = data.tasks.find(t => t.id === selectedItem.id);
            setSelectedItem(updatedItem || null);
        } else {
            const updatedItem = data.concerns.find(c => c.id === selectedItem.id);
            setSelectedItem(updatedItem || null);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tasks, data.concerns]);

  const { projects, nowTasks, todoTasks } = useMemo(() => {
    const projects = data.tasks.filter(t => t.category === TaskCategory.Project && !t.parentTaskId).sort((a,b) => a.order - b.order);
    const nowTasks = data.tasks.filter(t => t.category === TaskCategory.Now && !t.parentTaskId).sort((a,b) => a.order - b.order);
    const todoTasks = data.tasks.filter(t => t.category === TaskCategory.ToDo && !t.parentTaskId).sort((a,b) => a.order - b.order);
    return { projects, nowTasks, todoTasks };
  }, [data.tasks]);
  
  const handleDeleteItem = (item: Task | Concern) => {
    if ('progressPercent' in item) {
        data.deleteTask(item.id);
    } else {
        data.deleteConcern(item.id);
    }
    setSelectedItem(null);
  };
  
  const handleAddSubTask = (parentTaskId: string, title: string) => {
    const parentTask = data.tasks.find(t => t.id === parentTaskId);
    data.addTask({
        title,
        description: '', // Default description
        category: parentTask?.category || TaskCategory.ToDo, // Inherit parent's category
        parentTaskId,
    });
  };

  const renderTaskList = (title: string, tasks: Task[], icon: React.ReactNode) => (
    <div className="flex-1 min-w-[300px]">
      <div className="sticky top-0 bg-slate-100 z-10 py-2">
        <h2 className="text-xl font-bold text-gray-700 flex items-center">
            {icon} {title} ({tasks.length})
        </h2>
      </div>
      <div className="p-1 h-full overflow-y-auto">
        {tasks.map(task => <Card key={task.id} item={task} onSelect={setSelectedItem} />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans text-gray-900">
      <header className="bg-white shadow-md sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">생각관리</h1>
          <nav className="flex space-x-2 bg-slate-200 p-1 rounded-lg">
            <button onClick={() => setCurrentView('tasks')} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${currentView === 'tasks' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>실행</button>
            <button onClick={() => setCurrentView('concerns')} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${currentView === 'concerns' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>고민</button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {currentView === 'tasks' ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">실행</h2>
              <button
                onClick={() => setCreationModalType('task')}
                className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition flex items-center shadow-sm"
              >
                <PlusIcon /> <span className="ml-2 hidden sm:inline">새로운 할 일 추가</span>
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              {renderTaskList('프로젝트', projects, <ProjectIcon />)}
              {renderTaskList('지금할일', nowTasks, <NowIcon />)}
              {renderTaskList('해야할일', todoTasks, <ToDoIcon />)}
            </div>
          </>
        ) : (
          <div className="max-w-2xl mx-auto">
             <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold text-gray-700 flex items-center">
                    <ConcernIcon/> 고민 ({data.concerns.length})
                </h2>
                <button
                    onClick={() => setCreationModalType('concern')}
                    className="bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-indigo-700 transition flex items-center shadow-sm"
                >
                    <PlusIcon /> <span className="ml-2 hidden sm:inline">새로운 고민 추가</span>
                </button>
             </div>
             {data.concerns.map(concern => <Card key={concern.id} item={concern} onSelect={setSelectedItem} />)}
          </div>
        )}
      </main>

      {selectedItem && (
        <DetailModal
          item={selectedItem}
          allTasks={data.tasks}
          allSteps={data.steps}
          allMemos={data.memos}
          onClose={() => setSelectedItem(null)}
          onUpdateStep={data.updateStep}
          onAddStep={data.addStep}
          onAddLog={data.addAnalysisLog}
          onDeriveTask={(concern) => {
            const newTask = data.deriveTaskFromConcern(concern);
            setSelectedItem(newTask);
          }}
          onUpdateTaskStatus={(taskId, status) => {
              data.updateTask(taskId, { status });
          }}
          onUpdateTask={data.updateTask}
          onUpdateConcern={data.updateConcern}
          onDeleteItem={handleDeleteItem}
          onSelectItem={setSelectedItem}
          onAddSubTask={handleAddSubTask}
          onReorderSubTasks={data.reorderSubTasks}
          onReorderSteps={data.reorderSteps}
          onAddMemo={data.addMemo}
          onUpdateMemo={data.updateMemo}
          onDeleteMemo={data.deleteMemo}
        />
      )}
      {creationModalType && (
        <CreationModal
          mode={creationModalType}
          projects={projects}
          onClose={() => setCreationModalType(null)}
          onAddTask={(taskData) => {
            data.addTask(taskData);
            setCreationModalType(null);
          }}
          onAddConcern={(concernData) => {
            data.addConcern(concernData);
            setCreationModalType(null);
          }}
        />
      )}
    </div>
  );
};

export default App;