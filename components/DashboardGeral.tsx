
import React, { useMemo } from 'react';
import { PerformanceData } from '../types';
import StatCard from './StatCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

interface DashboardGeralProps {
  data: PerformanceData[];
  headers: string[];
}

const DashboardGeral: React.FC<DashboardGeralProps> = ({ data, headers }) => {
  // --- FUNÇÕES DE UTILIDADE ---
  
  // Converte "HH:mm" para minutos totais desde 00:00
  const timeToMinutes = (timeStr: string | number): number => {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  // Calcula quantos dias específicos existem em um mês
  const countDaysInMonth = (dateStr: string): number => {
    if (!dateStr) return 0;
    // Assume data no formato DD/MM/YYYY ou similar
    const parts = dateStr.split('/');
    if (parts.length < 3) return 12; // Fallback
    
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, 1);
    let count = 0;
    
    while (date.getMonth() === month) {
      const day = date.getDay();
      // 1 = Segunda, 3 = Quarta, 5 = Sexta
      if (day === 1 || day === 3 || day === 5) {
        count++;
      }
      date.setDate(date.getDate() + 1);
    }
    return count;
  };

  // --- MAPEAMENTO DE COLUNAS ---
  const findKey = (keywords: string[]) => {
    return headers.find(h => keywords.some(k => h.toLowerCase() === k.toLowerCase())) || '';
  };

  const keys = {
    data: headers[0], // Geralmente a primeira coluna
    std: findKey(['Previsão Decolagem']),
    abertura: findKey(['Abertura CHECK IN']),
    fechamento: findKey(['Fechamento CHECK IN']),
    embarque: findKey(['Início Embarque']),
    ultimoPax: findKey(['Último PAX a bordo']),
    pax: findKey(['PAX']),
    orbital: findKey(['% de PONTUALIDADE ORBITAL']),
    base: findKey(['% DE PONTUALIDADE DA BASE']),
    metaBags: findKey(['Meta de BAGS despachadas de Mão']),
    bagsAtendidas: findKey(['BAGS de Mão Atendidos']),
    checkinTime: findKey(['MÉDIA DE TEMPO ATENDIMENTO CHECK IN']),
    queueTime: findKey(['MÉDIA DE TEMPO AGUARDANDO NA FILA']),
    voo: findKey(['ID VOO', 'VOO'])
  };

  // --- CÁLCULOS DE PERFORMANCE ---
  const performance = useMemo(() => {
    if (!data.length) return null;

    let totalPax = 0;
    let sumOrbital = 0;
    let sumBase = 0;
    let confAbertura = 0;
    let confFechamento = 0;
    let confEmbarque = 0;
    let confUltimoPax = 0;
    let confBags = 0;
    let sumCheckinTime = 0;
    let sumQueueTime = 0;

    data.forEach(row => {
      totalPax += Number(row[keys.pax]) || 0;
      sumOrbital += parseFloat(String(row[keys.orbital]).replace('%', '')) || 0;
      sumBase += parseFloat(String(row[keys.base]).replace('%', '')) || 0;
      
      const stdMin = timeToMinutes(row[keys.std]);
      
      // SLA Abertura (STD - 3:30 = 210 min)
      if (row[keys.abertura] && stdMin > 0) {
        const target = stdMin - 210;
        const real = timeToMinutes(row[keys.abertura]);
        if (real <= target) confAbertura++;
      }

      // SLA Fechamento (STD - 1:00 = 60 min)
      if (row[keys.fechamento] && stdMin > 0) {
        const target = stdMin - 60;
        const real = timeToMinutes(row[keys.fechamento]);
        if (real <= target) confFechamento++;
      }

      // SLA Início Embarque (STD - 0:40 = 40 min)
      if (row[keys.embarque] && stdMin > 0) {
        const target = stdMin - 40;
        const real = timeToMinutes(row[keys.embarque]);
        if (real <= target) confEmbarque++;
      }

      // SLA Último PAX (STD - 0:10 = 10 min)
      if (row[keys.ultimoPax] && stdMin > 0) {
        const target = stdMin - 10;
        const real = timeToMinutes(row[keys.ultimoPax]);
        if (real <= target) confUltimoPax++;
      }

      // SLA Bags (Real >= Meta)
      const metaBags = Number(row[keys.metaBags]) || 0;
      const atendBags = Number(row[keys.bagsAtendidas]) || 0;
      if (atendBags >= metaBags) confBags++;

      // Tempos Médios
      sumCheckinTime += parseFloat(String(row[keys.checkinTime])) || 0;
      sumQueueTime += parseFloat(String(row[keys.queueTime])) || 0;
    });

    const total = data.length;
    const flightTarget = countDaysInMonth(String(data[0][keys.data]));

    return {
      totalFlights: total,
      flightTarget,
      totalPax,
      avgOrbital: (sumOrbital / total).toFixed(1),
      avgBase: (sumBase / total).toFixed(1),
      slaAbertura: ((confAbertura / total) * 100).toFixed(1),
      slaFechamento: ((confFechamento / total) * 100).toFixed(1),
      slaEmbarque: ((confEmbarque / total) * 100).toFixed(1),
      slaUltimoPax: ((confUltimoPax / total) * 100).toFixed(1),
      slaBags: ((confBags / total) * 100).toFixed(1),
      avgCheckin: (sumCheckinTime / total).toFixed(1),
      avgQueue: (sumQueueTime / total).toFixed(1)
    };
  }, [data, keys]);

  if (!performance) return null;

  const slaData = [
    { name: 'Abertura Check-in', realizado: parseFloat(performance.slaAbertura), meta: 98 },
    { name: 'Fechamento Check-in', realizado: parseFloat(performance.slaFechamento), meta: 98 },
    { name: 'Início Embarque', realizado: parseFloat(performance.slaEmbarque), meta: 95 },
    { name: 'Último Pax a Bordo', realizado: parseFloat(performance.slaUltimoPax), meta: 95 },
    { name: 'Meta Bags Portão', realizado: parseFloat(performance.slaBags), meta: 95 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Voos Realizados" 
          value={`${performance.totalFlights} / ${performance.flightTarget}`} 
          trend={{ 
            value: Math.abs(performance.totalFlights - performance.flightTarget), 
            isPositive: performance.totalFlights >= performance.flightTarget 
          }}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
        />
        <StatCard 
          title="PAX Atendidos" 
          value={performance.totalPax.toLocaleString()} 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard 
          title="Pontualidade Orbital" 
          value={`${performance.avgOrbital}%`} 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard 
          title="Pontualidade Base" 
          value={`${performance.avgBase}%`} 
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Metas de Atendimento (SLA) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Análise de SLA Contratual</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Percentual de Conformidade (Médias do Mês)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#004181] rounded-full"></div>
                <span className="text-[8px] font-black uppercase">Conforme</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-slate-200 rounded-full"></div>
                <span className="text-[8px] font-black uppercase">Meta</span>
              </div>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaData} layout="vertical" margin={{ left: 30, right: 40, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={130}
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: 'bold' }}
                />
                <Bar dataKey="realizado" radius={[0, 4, 4, 0]} barSize={24}>
                  {slaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.realizado >= entry.meta ? '#10b981' : '#fb394e'} />
                  ))}
                </Bar>
                {/* Linha de Referência da Meta */}
                <ReferenceLine x={95} stroke="#cbd5e1" strokeDasharray="3 3" label={{ position: 'top', value: '95%', fontSize: 8, fill: '#94a3b8' }} />
                <ReferenceLine x={98} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'top', value: '98%', fontSize: 8, fill: '#64748b' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Eficiência Operacional */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tight mb-6">Eficiência de Fluxo</h3>
          
          <div className="space-y-8">
            <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-[#004181]">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tempo Médio Check-in</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{performance.avgCheckin}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">Minutos</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-cyan-400">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Aguardando em Fila</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{performance.avgQueue}</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">Minutos</span>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-[#fb394e]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#fb394e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-800 uppercase">Alerta de Meta</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase">Verifique itens em vermelho no SLA</p>
                </div>
              </div>
              <p className="text-[8px] text-slate-400 leading-relaxed italic">
                *Cálculo dinâmico baseado no STD individual de cada voo conforme regra contratual.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardGeral;
