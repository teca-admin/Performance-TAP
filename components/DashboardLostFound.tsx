
import React, { useMemo, useState } from 'react';
import { PerformanceData } from '../types';
import StatCard from './StatCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Scatter,
  LabelList
} from 'recharts';

interface DashboardLostFoundProps {
  data: PerformanceData[];
  headers: string[];
}

const DashboardLostFound: React.FC<DashboardLostFoundProps> = ({ data, headers }) => {
  const [filter, setFilter] = useState<'all' | 'perfect' | 'failed'>('all');

  const timeToMinutes = (timeStr: string | number): number => {
    if (!timeStr) return 0;
    const s = String(timeStr);
    const parts = s.includes(' ') ? s.split(' ')[1].split(':') : s.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const minutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const parseFullDate = (dateStr: string | number): Date | null => {
    if (!dateStr) return null;
    const s = String(dateStr);
    const parts = s.split(' ');
    const dParts = parts[0].split('/');
    if (dParts.length < 3) return null;
    const d = new Date(parseInt(dParts[2]), parseInt(dParts[1]) - 1, parseInt(dParts[0]));
    if (parts[1]) {
      const tParts = parts[1].split(':');
      d.setHours(parseInt(tParts[0]), parseInt(tParts[1]), 0, 0);
    }
    return d;
  };

  const keys = useMemo(() => ({
    id: headers.find(h => h.toLowerCase() === 'id voo') || '',
    pouso: headers[1] || '',
    cutoff: headers.find(h => h.toLowerCase() === 'horário de corte (anti colisão)') || '',
    ahlAb: headers.find(h => h.toLowerCase() === 'horário abertura ahl') || '',
    ohdAb: headers.find(h => h.toLowerCase() === 'horário abertura ohd') || '',
    ahlEnt: headers.find(h => h.toLowerCase() === 'ahl entregue a transportadora') || '',
    lista: headers.find(h => h.toLowerCase() === 'data/hr lista de conteúdo solicitada') || ''
  }), [headers]);

  const performance = useMemo(() => {
    let okAhl = 0, cAhl = 0, okOhd = 0, cOhd = 0, okEnt = 0, cEnt = 0, okList = 0, cList = 0;

    const details = data.map(row => {
      const cutoffMin = timeToMinutes(row[keys.cutoff]);
      const targetMin = cutoffMin + 120; // Regra +2h
      const targetStr = minutesToTime(targetMin);

      const ahlMin = timeToMinutes(row[keys.ahlAb]);
      const ohdMin = timeToMinutes(row[keys.ohdAb]);
      const entMin = timeToMinutes(row[keys.ahlEnt]);

      const isAhlOk = ahlMin > 0 ? ahlMin <= targetMin : null;
      const isOhdOk = ohdMin > 0 ? ohdMin <= targetMin : null;
      const isEntOk = entMin > 0 ? entMin <= targetMin : null;

      // Regra 72h: Lista Conteúdo vs Abertura AHL
      let isListOk: boolean | null = null;
      const dateAhl = parseFullDate(row[keys.ahlAb]);
      const dateList = parseFullDate(row[keys.lista]);
      if (dateAhl && dateList) {
        const diffHrs = (dateList.getTime() - dateAhl.getTime()) / (1000 * 3600);
        isListOk = diffHrs <= 72;
      }

      if (isAhlOk !== null) { cAhl++; if (isAhlOk) okAhl++; }
      if (isOhdOk !== null) { cOhd++; if (isOhdOk) okOhd++; }
      if (isEntOk !== null) { cEnt++; if (isEntOk) okEnt++; }
      if (isListOk !== null) { cList++; if (isListOk) okList++; }

      const perfect = (isAhlOk ?? true) && (isOhdOk ?? true) && (isEntOk ?? true) && (isListOk ?? true);

      return {
        id: row[keys.id], pouso: row[keys.pouso], perfect,
        metrics: [
          { label: 'AHL Abertura', val: row[keys.ahlAb] || '--', target: targetStr, ok: isAhlOk ?? true, skip: isAhlOk === null },
          { label: 'OHD Abertura', val: row[keys.ohdAb] || '--', target: targetStr, ok: isOhdOk ?? true, skip: isOhdOk === null },
          { label: 'Entrega Transp.', val: row[keys.ahlEnt] || '--', target: targetStr, ok: isEntOk ?? true, skip: isEntOk === null },
          { label: 'Lista Conteúdo', val: row[keys.lista] ? 'OK' : '--', target: '72h', ok: isListOk ?? true, skip: isListOk === null }
        ]
      };
    });

    return {
      total: details.length,
      perfect: details.filter(d => d.perfect).length,
      failed: details.length - details.filter(d => d.perfect).length,
      chart: [
        { name: 'AHL Ab.', real: cAhl > 0 ? Math.round(okAhl/cAhl*100) : 100, meta: 95 },
        { name: 'OHD Ab.', real: cOhd > 0 ? Math.round(okOhd/cOhd*100) : 100, meta: 95 },
        { name: 'Entrega', real: cEnt > 0 ? Math.round(okEnt/cEnt*100) : 100, meta: 95 },
        { name: 'Lista', real: cList > 0 ? Math.round(okList/cList*100) : 100, meta: 95 },
      ],
      details
    };
  }, [data, keys]);

  const displayed = performance.details.filter(d => filter === 'all' || (filter === 'perfect' ? d.perfect : !d.perfect));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total L&F" value={performance.total} onClick={() => setFilter('all')} isActive={filter === 'all'} />
        <StatCard title="Em SLA" value={performance.perfect} onClick={() => setFilter('perfect')} isActive={filter === 'perfect'} />
        <StatCard title="Fora de SLA" value={performance.failed} onClick={() => setFilter('failed')} isActive={filter === 'failed'} />
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="text-[12px] font-black uppercase mb-6 tracking-widest text-slate-800">Performance Lost and Found - Meta 95%</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performance.chart} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}} />
              <Bar dataKey="real" barSize={40} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="real" position="top" content={(p:any)=><text x={p.x+p.width/2} y={p.y-10} fill="#64748b" fontSize="10" fontWeight="900" textAnchor="middle">{p.value}%</text>} />
                {performance.chart.map((e, i) => <Cell key={i} fill={e.real >= e.meta ? '#10b981' : '#fb394e'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50"><h3 className="text-[11px] font-black uppercase text-slate-800">Auditoria Detalhada L&F</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Voo / Data</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">AHL Ab.</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">OHD Ab.</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Entrega</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500">Lista Cont.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayed.map((f, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-900">{f.id}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{f.pouso}</span>
                    </div>
                  </td>
                  {f.metrics.map((m, idx) => (
                    <td key={idx} className="px-4 py-3">
                      {m.skip ? <span className="text-slate-200 text-[10px] font-black">--</span> : (
                        <div className="flex flex-col items-center">
                          <span className={`text-[11px] font-black ${m.ok ? 'text-emerald-500' : 'text-rose-500'}`}>{m.val}</span>
                          <span className="text-[8px] font-bold text-slate-300 uppercase">Alvo: {m.target}</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardLostFound;
