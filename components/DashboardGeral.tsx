
import React, { useMemo, useState } from 'react';
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
  totalRecords?: number;
}

type ContractType = 'geral' | 'ahl' | 'ohd' | 'rampa' | 'limpeza' | 'safety';

const DashboardGeral: React.FC<DashboardGeralProps> = ({ data, headers, totalRecords }) => {
  const [activeContract, setActiveContract] = useState<ContractType>('geral');

  // --- DEFINIÇÃO DOS GRUPOS (SLICING) ---
  const groups = {
    geral: { start: 0, count: 14, color: '#004181' },
    ahl: { start: 14, count: 3, color: '#0c343d' },
    ohd: { start: 17, count: 2, color: '#fb394e' },
    rampa: { start: 19, count: 7, color: '#3c78d8' },
    limpeza: { start: 26, count: 3, color: '#fbbc04' },
    safety: { start: 29, count: 9, color: '#20124d' }
  };

  // Obtém apenas os headers do contrato ativo (Blindagem)
  const contractHeaders = useMemo(() => {
    const config = groups[activeContract];
    return headers.slice(config.start, config.start + config.count);
  }, [headers, activeContract]);

  // --- FUNÇÕES DE UTILIDADE ---
  
  const timeToMinutes = (timeStr: string | number): number => {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  // --- MAPEAMENTO DE COLUNAS (Restrito ao Segmento) ---
  const findKeyInContract = (keywords: string[]) => {
    return contractHeaders.find(h => keywords.some(k => h.toLowerCase() === k.toLowerCase())) || '';
  };

  const keys = useMemo(() => {
    // Só mapeamos chaves de métricas para o Geral por enquanto
    if (activeContract !== 'geral') return {};
    
    return {
      data: contractHeaders[1], // Horário de pouso (exemplo de referência temporal)
      std: findKeyInContract(['Previsão Decolagem']),
      abertura: findKeyInContract(['Abertura CHECK IN']),
      fechamento: findKeyInContract(['Fechamento CHECK IN']),
      embarque: findKeyInContract(['Início Embarque']),
      ultimoPax: findKeyInContract(['Último PAX a bordo']),
      pax: findKeyInContract(['PAX Atendidos', 'PAX']),
      orbital: findKeyInContract(['% de PONTUALIDADE ORBITAL']),
      base: findKeyInContract(['% DE PONTUALIDADE DA BASE']),
      metaBags: findKeyInContract(['Meta de BAGS despachadas de Mão']),
      bagsAtendidas: findKeyInContract(['BAGS de Mão Atendidos']),
      checkinTime: findKeyInContract(['MÉDIA DE TEMPO ATENDIMENTO CHECK IN']),
      queueTime: findKeyInContract(['MÉDIA DE TEMPO AGUARDANDO NA FILA']),
    };
  }, [contractHeaders, activeContract]);

  // --- CÁLCULOS DE PERFORMANCE (GERAL) ---
  const performance = useMemo(() => {
    if (!data.length || activeContract !== 'geral') return null;

    let totalPax = 0, sumOrbital = 0, sumBase = 0, sumCheckinTime = 0, sumQueueTime = 0;
    let confAbertura = 0, confFechamento = 0, confEmbarque = 0, confUltimoPax = 0, confBags = 0;

    data.forEach(row => {
      totalPax += Number(row[keys.pax]) || 0;
      sumOrbital += parseFloat(String(row[keys.orbital]).replace('%', '')) || 0;
      sumBase += parseFloat(String(row[keys.base]).replace('%', '')) || 0;
      
      const stdMin = timeToMinutes(row[keys.std]);
      
      if (row[keys.abertura] && stdMin > 0 && timeToMinutes(row[keys.abertura]) <= (stdMin - 210)) confAbertura++;
      if (row[keys.fechamento] && stdMin > 0 && timeToMinutes(row[keys.fechamento]) <= (stdMin - 60)) confFechamento++;
      if (row[keys.embarque] && stdMin > 0 && timeToMinutes(row[keys.embarque]) <= (stdMin - 40)) confEmbarque++;
      if (row[keys.ultimoPax] && stdMin > 0 && timeToMinutes(row[keys.ultimoPax]) <= (stdMin - 10)) confUltimoPax++;
      
      const bagsTarget = Number(row[keys.metaBags]) || 0;
      if (bagsTarget > 0 && Number(row[keys.bagsAtendidas]) >= bagsTarget) confBags++;

      sumCheckinTime += parseFloat(String(row[keys.checkinTime])) || 0;
      sumQueueTime += parseFloat(String(row[keys.queueTime])) || 0;
    });

    const total = data.length;
    return {
      totalFlights: total,
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
  }, [data, keys, activeContract]);

  const slaData = performance ? [
    { name: 'Abertura Check-in', realizado: parseFloat(performance.slaAbertura), meta: 98 },
    { name: 'Fechamento Check-in', realizado: parseFloat(performance.slaFechamento), meta: 98 },
    { name: 'Início Embarque', realizado: parseFloat(performance.slaEmbarque), meta: 95 },
    { name: 'Último Pax a Bordo', realizado: parseFloat(performance.slaUltimoPax), meta: 95 },
    { name: 'Meta Bags Portão', realizado: parseFloat(performance.slaBags), meta: 95 },
  ] : [];

  const isFiltered = totalRecords !== undefined && data.length < totalRecords;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SELETOR DE CONTRATOS */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase ml-2 mr-2">Filtro de Contrato:</span>
          {(Object.keys(groups) as ContractType[]).map((id) => (
            <button
              key={id}
              onClick={() => setActiveContract(id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all border
                ${activeContract === id 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-105' 
                  : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}
              `}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: groups[id].color }}></div>
              <span className="text-[9px] font-black uppercase tracking-tight">
                {id === 'geral' ? '1. GERAL' : 
                 id === 'ahl' ? '2. AHL' : 
                 id === 'ohd' ? '3. OHD' : 
                 id === 'rampa' ? '4. RAMPA' : 
                 id === 'limpeza' ? '5. LIMPEZA' : '6. SAFETY'}
              </span>
            </button>
          ))}
        </div>

        {isFiltered && (
          <div className="flex items-center gap-3 px-4 py-2 bg-[#004181]/5 border border-[#004181]/10 rounded-lg">
            <span className="text-[9px] font-black text-[#004181] uppercase tracking-tighter">
              Amostra: {data.length} voos ativos
            </span>
          </div>
        )}
      </div>

      {activeContract === 'geral' && performance ? (
        <>
          {/* KPIs Superiores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Amostra de Voos" 
              value={`${performance.totalFlights}`} 
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
            />
            <StatCard 
              title="Total PAX" 
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
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Análise de SLA Contratual (Geral)</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Conformidade Operacional do Segmento 1</p>
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
                    <ReferenceLine x={95} stroke="#cbd5e1" strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tight mb-6">Métricas de Fluxo</h3>
              <div className="space-y-8 flex-grow">
                <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-[#004181]">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Média Atendimento</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-800">{performance.avgCheckin}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Min</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-cyan-400">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Tempo de Fila</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-800">{performance.avgQueue}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6" style={{ color: groups[activeContract].color }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-2">
            BI Segmentado: {activeContract.toUpperCase()}
          </h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase max-w-sm leading-relaxed mb-6">
            Módulo de indicadores em desenvolvimento. <br/>
            Este segmento monitora as seguintes colunas da base:
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-2xl">
            {contractHeaders.map((h, i) => (
              <div key={i} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded text-[8px] font-black text-slate-600 uppercase truncate" title={h}>
                {h}
              </div>
            ))}
          </div>
          
          <div className="mt-10 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-slate-300 animate-pulse"></div>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Aguardando definição de KPIs</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardGeral;
