import React from 'react';
import { Task, Concern, TaskStatus, ConcernStatus } from '../types';

type Item = Task | Concern;

interface CardProps {
  item: Item;
  onSelect: (item: Item) => void;
}

const getStatusClass = (status: TaskStatus | ConcernStatus) => {
  switch (status) {
    case TaskStatus.Completed:
    case ConcernStatus.Resolved:
      return 'bg-green-100 text-green-800';
    case TaskStatus.InProgress:
    case ConcernStatus.Analyzing:
      return 'bg-blue-100 text-blue-800';
    case TaskStatus.Pending:
    case ConcernStatus.SolutionDerived:
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const Card: React.FC<CardProps> = ({ item, onSelect }) => {
  const isTask = 'progressPercent' in item;

  return (
    <div 
      onClick={() => onSelect(item)}
      className="bg-white rounded-lg shadow-md p-4 mb-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-gray-800 mb-2 pr-2">{item.title}</h3>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${getStatusClass(item.status)}`}>
          {item.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 truncate">{item.description}</p>
      {isTask && (
        <div className="mt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">진행률</span>
            <span className="text-sm font-medium text-gray-700">{item.progressPercent}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Card;