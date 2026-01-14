
import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Legend,
  Line
} from 'recharts';
import { PerformanceData } from '../types';
import { COLORS } from '../constants';

interface VisualsProps {
  data: PerformanceData[];
  headers: string[];
}

const Visuals: React.FC<VisualsProps> = ({ data, headers }) => {
  const findKey = (keywords: string[]) => {
    return headers.find(h => 
      keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
    ) || null;
  };

  const dateKey = findKey(['data', 'date', 'período']) || headers[0];
  const investKey = findKey(['investimento', 'custo', 'spend', 'valor']) || headers[1];
  const conversionKey = findKey(['conversão', 'lead', 'venda', 'resultado']) || headers[2];

  const chartData = data
    .filter(item => item[dateKey])
    .slice(-30)
    .map(item => {
      const rawVal = String(item[investKey] || '0').replace(/[^\d.,]/g, '').replace(',', '.');
      const rawConv = String(item[conversionKey] || '0').replace(/[^\d.,]/g, '').replace(',', '.');
      
      return {
        name: String(item[dateKey] || ''),
        investimento: parseFloat(rawVal) || 0,
        conversoes: parseFloat(rawConv) || 0,
      };
    });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Tendência de Performance</h3>
          <span className="text-xs font-medium text-slate-400 px-2 py-1 bg-slate-50 rounded">Últimos 30 registros</span>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} minTickGap={30} />
              <YAxis yId="left" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
              <YAxis yId="right" orientation="right" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                formatter={(value: number, name: string) => [
                  name === 'investimento' ? formatCurrency(value) : value, 
                  name.charAt(0).toUpperCase() + name.slice(1)
                ]}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area yId="left" type="monotone" dataKey="investimento" name="investimento" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorInvest)" strokeWidth={3} dot={{ r: 4, fill: COLORS.primary, stroke: '#fff' }} />
              <Line yId="right" type="monotone" dataKey="conversoes" name="conversoes" stroke={COLORS.secondary} strokeWidth={3} dot={{ r: 4, fill: COLORS.secondary, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Visuals;
