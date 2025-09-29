
import { useState, useEffect } from 'react';
import { SystemStatusData } from '../types';

export const useSystemStats = (initialStats: SystemStatusData): SystemStatusData => {
  const [stats, setStats] = useState<SystemStatusData>(initialStats);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(currentStats => {
        const newStats = { ...currentStats };
        Object.keys(newStats).forEach(key => {
          const stat = newStats[key];
          if (!stat.isStatic && typeof stat.value === 'number') {
            const change = (Math.random() - 0.5) * 5;
            let newValue = stat.value + change;
            newValue = Math.max(0, Math.min(100, newValue)); // Clamp between 0 and 100 for percentages
            newStats[key] = { ...stat, value: parseFloat(newValue.toFixed(1)) };
          }
        });
        return newStats;
      });
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return stats;
};
