import React from 'react';
import { SystemStatusData } from '../types';

interface SidebarProps {
  title: string;
  stats: SystemStatusData;
}

const SystemStatusItem: React.FC<{ label: string; value: number | string; unit?: string }> = ({ label, value, unit }) => {
  const isPercentage = typeof value === 'number' && unit === '%';
  return (
    <div className="flex flex-col text-xs uppercase">
      <div className="flex justify-between items-end mb-1">
        <span className="text-cyan-500">{label}</span>
        <span className="font-bold text-cyan-300">
          {value}
          {unit && <span className="text-cyan-500/80 ml-1">{unit}</span>}
        </span>
      </div>
      {isPercentage && (
        <div className="w-full bg-cyan-900/50 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-cyan-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${value}%`, boxShadow: '0 0 5px #22d3ee' }}
          ></div>
        </div>
      )}
    </div>
  );
};


export const Sidebar: React.FC<SidebarProps> = ({ title, stats }) => {
  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <h2 className="text-sm text-cyan-400 tracking-[0.2em] uppercase" style={{ textShadow: '0 0 5px #22d3ee' }}>{title}</h2>
      <div className="flex flex-col space-y-4">
        {/* FIX: Use Object.keys to iterate over stats for better type safety. Object.entries can incorrectly infer the value type as 'unknown'. */}
        {Object.keys(stats).map((key) => (
          <SystemStatusItem key={key} label={key} value={stats[key].value} unit={stats[key].unit} />
        ))}
      </div>
    </div>
  );
};