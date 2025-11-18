import React, { useState } from 'react';
import { Task, TaskCategory } from '../types';
import { CloseIcon } from './icons';

interface CreationModalProps {
  mode: 'task' | 'concern';
  projects: Task[];
  onClose: () => void;
  onAddTask: (data: { title: string; description: string; category: TaskCategory; parentTaskId: string | null }) => void;
  onAddConcern: (data: { title: string; description: string; resolutionAction: string }) => void;
}

const CreationModal: React.FC<CreationModalProps> = ({ mode, projects, onClose, onAddTask, onAddConcern }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Task specific state
  const [category, setCategory] = useState<TaskCategory>(TaskCategory.Now);
  // Concern specific state
  const [resolutionAction, setResolutionAction] = useState('');

  const isFormValid = title.trim() !== '' && description.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (mode === 'task') {
      onAddTask({ 
        title: title.trim(), 
        description: description.trim(), 
        category, 
        parentTaskId: null 
      });
    } else {
      onAddConcern({ 
        title: title.trim(), 
        description: description.trim(),
        resolutionAction: resolutionAction.trim()
      });
    }
  };

  const renderTaskFields = () => (
    <>
      <div className="mb-4">
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          구분
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as TaskCategory)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          {Object.values(TaskCategory).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const renderConcernFields = () => (
    <div>
        <label htmlFor="resolutionAction" className="block text-sm font-medium text-gray-700 mb-1">
            초기 해결 방안
        </label>
        <textarea
            id="resolutionAction"
            value={resolutionAction}
            onChange={(e) => setResolutionAction(e.target.value)}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="해결을 위해 어떤 액션을 취해야 할지 입력하세요..."
        />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'task' ? '새로운 할 일 추가' : '새로운 고민 추가'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
            <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    제목
                </label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={mode === 'task' ? "예: 블로그 콘텐츠 기획" : "예: 젊은 고객층 유입 감소"}
                    required
                />
            </div>
            <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                </label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg font-bold"
                    placeholder="상세 내용을 입력하세요."
                    required
                />
            </div>

            {mode === 'task' ? renderTaskFields() : renderConcernFields()}

            <div className="mt-6 flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                    취소
                </button>
                <button
                    type="submit"
                    disabled={!isFormValid}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                >
                    생성
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default CreationModal;