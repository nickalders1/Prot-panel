import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  color: 'green' | 'red' | 'yellow' | 'cyan';
  subtitle?: string;
}

const colorClasses = {
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
};

export function MetricCard({ title, value, icon: Icon, trend, color, subtitle }: MetricCardProps) {
  return (
    <div className={`p-6 rounded-lg border backdrop-blur-sm ${colorClasses[color]} transition-all duration-300 hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-300 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <Icon className="w-8 h-8 opacity-80" />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center mt-3 text-sm ${trend >= 0 ? 'text-red-400' : 'text-green-400'}`}>
          <span>{trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
}