import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  isActive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, onClick, isActive }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-xl shadow-sm border transition-all duration-300 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''
      } ${
        isActive 
          ? 'border-[#004181] ring-2 ring-[#004181]/10 bg-blue-50/30' 
          : 'border-slate-100'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-black uppercase tracking-wider ${isActive ? 'text-[#004181]' : 'text-slate-500'}`}>
          {title}
        </span>
        <div className={`p-2 rounded-lg ${isActive ? 'bg-[#004181] text-white' : 'bg-blue-50 text-blue-600'}`}>
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900">{value}</h3>
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span className="ml-1 font-semibold">{trend.value}%</span>
            <span className="ml-2 text-slate-400 font-normal">vs anterior</span>
          </div>
        )}
      </div>
      {isActive && (
        <div className="mt-4 pt-2 border-t border-[#004181]/10 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#004181] animate-pulse"></div>
          <span className="text-[9px] font-black text-[#004181] uppercase tracking-tighter">Filtro Ativo</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;