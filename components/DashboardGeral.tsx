import React, { useMemo, useState, useEffect } from 'react';
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

interface DashboardGeralProps {
  data: PerformanceData[];
  headers: string[];
  totalRecords?: number;
}

type ContractType = 'geral' | 'ahl' | 'ohd' | 'rampa' | 'limpeza' | 'safety';

const DashboardGeral: React.FC<DashboardGeralProps> = ({ data, headers, totalRecords }) => {
  const [activeContract, setActiveContract] = useState<ContractType>('geral');
  
  // --- UTILITÁRIOS DE DATA E TEMPO ---
  const parseSheetDate = (dateStr: string | number): Date | null => {
    if (!dateStr) return null;
    const s = String(dateStr);
    const parts = s.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length < 3) return null;
    return new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
  };

  const minutesToTime = (totalMinutes: number): string => {
    if (totalMinutes < 0) return "00:00";
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Identificar dinamicamente os anos disponíveis no banco de dados
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const pousoHeader = headers[1]; 
    
    data.forEach(row => {
      const d = parseSheetDate(row[pousoHeader]);
      if (d) years.add(d.getFullYear());
    });
    
    if (years.size === 0) return [2025, 2026];
    return Array.from(years).sort((a, b) => a - b);
  }, [data, headers]);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(availableYears.includes(new Date().getFullYear()) ? new Date().getFullYear() : availableYears[0]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  const groups = {
    geral: { start: 0, count: 14, color: '#004181' },
    ahl: { start: 14, count: 3, color: '#0c343d' },
    ohd: { start: 17, count: 2, color: '#fb394e' },
    rampa: { start: 19, count: 7, color: '#3c78d8' },
    limpeza: { start: 26, count: 3, color: '#fbbc04' },
    safety: { start: 29, count: 9, color: '#20124d' }
  };

  const contractHeaders = useMemo(() => {
    const config = groups[activeContract];
    return headers.slice(config.start, config.start + config.count);
  }, [headers, activeContract]);

  const timeToMinutes = (timeStr: string | number): number => {
    if (!timeStr) return 0;
    const s = String(timeStr);
    const parts = s.includes(' ') ? s.split(' ')[1].split(':') : s.split(':');
    if (parts.length < 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const getPotentialFlightsCount = (month: number, year: number): number => {
    let count = 0;
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      const day = date.getDay(); 
      if (day === 1 || day === 3 || day === 5) count++;
      date.setDate(date.getDate() + 1);
    }
    return count;
  };

  const findKeyInContract = (keywords: string[]) => {
    return contractHeaders.find(h => keywords.some(k => h.toLowerCase() === k.toLowerCase())) || '';
  };

  const keys = useMemo(() => ({
    id: findKeyInContract(['ID Voo']),
    pouso: headers[1], 
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
  }), [contractHeaders, headers]);

  const filteredByDate = useMemo(() => {
    return data.filter(row => {
      const d = parseSheetDate(row[keys.pouso]);
      return d && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [data, keys.pouso, selectedMonth, selectedYear]);

  const performance = useMemo(() => {
    if (!filteredByDate.length || activeContract !== 'geral') return null;

    const potentialCount = getPotentialFlightsCount(selectedMonth, selectedYear);
    const flightsCount = filteredByDate.length;
    let totalPax = 0, sumOrbital = 0, sumBase = 0, sumCheckinTime = 0, sumQueueTime = 0;
    
    // Acumuladores para as médias de performance
    let sumPerfAbertura = 0, sumPerfFechamento = 0, sumPerfEmbarque = 0, sumPerfUltimoPax = 0, sumPerfBags = 0;

    const flightDetails = filteredByDate.map(row => {
      const stdMin = timeToMinutes(row[keys.std]);
      const checkinAbertura = timeToMinutes(row[keys.abertura]);
      const checkinFechamento = timeToMinutes(row[keys.fechamento]);
      const embarqueInicio = timeToMinutes(row[keys.embarque]);
      const paxFinal = timeToMinutes(row[keys.ultimoPax]);
      const paxCount = Number(row[keys.pax]) || 0;
      const bagsReal = Number(row[keys.bagsAtendidas]) || 0;

      const targetAbertura = stdMin - 210;
      const targetFechamento = stdMin - 60;
      const targetEmbarque = stdMin - 40;
      const targetPax = stdMin - 10;

      const isAberturaOk = row[keys.abertura] && stdMin > 0 && checkinAbertura <= targetAbertura;
      const isFechamentoOk = row[keys.fechamento] && stdMin > 0 && checkinFechamento <= targetFechamento;
      const isEmbarqueOk = row[keys.embarque] && stdMin > 0 && embarqueInicio <= targetEmbarque;
      const isUltimoPaxOk = row[keys.ultimoPax] && stdMin > 0 && paxFinal <= targetPax;
      const isBagsOk = paxCount >= 107 ? bagsReal >= 35 : true;

      // Cálculo de Eficiência Individual (Percentual Atingido x Meta)
      const calcTimeEfficiency = (real: number, target: number) => {
        if (real === 0 || target === 0) return 0;
        if (real <= target) return 100;
        return Math.max(0, 100 - (real - target)); 
      };

      const perfAbertura = calcTimeEfficiency(checkinAbertura, targetAbertura);
      const perfFechamento = calcTimeEfficiency(checkinFechamento, targetFechamento);
      const perfEmbarque = calcTimeEfficiency(embarqueInicio, targetEmbarque);
      const perfUltimoPax = calcTimeEfficiency(paxFinal, targetPax);
      const perfBags = paxCount >= 107 ? Math.min(100, (bagsReal / 35) * 100) : 100;

      sumPerfAbertura += perfAbertura;
      sumPerfFechamento += perfFechamento;
      sumPerfEmbarque += perfEmbarque;
      sumPerfUltimoPax += perfUltimoPax;
      sumPerfBags += perfBags;

      totalPax += paxCount;
      sumOrbital += parseFloat(String(row[keys.orbital]).replace('%', '')) || 0;
      sumBase += parseFloat(String(row[keys.base]).replace('%', '')) || 0;
      sumCheckinTime += parseFloat(String(row[keys.checkinTime])) || 0;
      sumQueueTime += parseFloat(String(row[keys.queueTime])) || 0;

      return {
        id: row[keys.id],
        pouso: row[keys.pouso],
        std: String(row[keys.std]).includes(' ') ? String(row[keys.std]).split(' ')[1] : String(row[keys.std]),
        metrics: [
          { label: 'Abertura CKIN', real: String(row[keys.abertura]).split(' ')[1] || row[keys.abertura], target: minutesToTime(targetAbertura), ok: isAberturaOk, perf: perfAbertura },
          { label: 'Fecham. CKIN', real: String(row[keys.fechamento]).split(' ')[1] || row[keys.fechamento], target: minutesToTime(targetFechamento), ok: isFechamentoOk, perf: perfFechamento },
          { label: 'Início Emb.', real: String(row[keys.embarque]).split(' ')[1] || row[keys.embarque], target: minutesToTime(targetEmbarque), ok: isEmbarqueOk, perf: perfEmbarque },
          { label: 'Ult. Pax Emb.', real: String(row[keys.ultimoPax]).split(' ')[1] || row[keys.ultimoPax], target: minutesToTime(targetPax), ok: isUltimoPaxOk, perf: perfUltimoPax },
          { label: 'Bags Portão', real: bagsReal, target: paxCount >= 107 ? '35' : '--', ok: isBagsOk, perf: perfBags }
        ]
      };
    });

    return {
      totalFlights: flightsCount,
      potentialFlights: potentialCount,
      totalPax,
      avgOrbital: (sumOrbital / flightsCount).toFixed(1),
      avgBase: (sumBase / flightsCount).toFixed(1),
      slaAbertura: (sumPerfAbertura / flightsCount).toFixed(1),
      slaFechamento: (sumPerfFechamento / flightsCount).toFixed(1),
      slaEmbarque: (sumPerfEmbarque / flightsCount).toFixed(1),
      slaUltimoPax: (sumPerfUltimoPax / flightsCount).toFixed(1),
      slaBags: (sumPerfBags / flightsCount).toFixed(1),
      avgCheckin: (sumCheckinTime / flightsCount).toFixed(1),
      avgQueue: (sumQueueTime / flightsCount).toFixed(1),
      flightDetails
    };
  }, [filteredByDate, keys, activeContract, selectedMonth, selectedYear]);

  const slaData = useMemo(() => performance ? [
    { name: 'Abertura', fullName: 'Abertura de Check-in', realizado: parseFloat(performance.slaAbertura), meta: 98 },
    { name: 'Fechamento', fullName: 'Fechamento de Check-in', realizado: parseFloat(performance.slaFechamento), meta: 98 },
    { name: 'Embarque', fullName: 'Início do Embarque', realizado: parseFloat(performance.slaEmbarque), meta: 95 },
    { name: 'Último Pax', fullName: 'Último PAX a Bordo', realizado: parseFloat(performance.slaUltimoPax), meta: 95 },
    { name: 'Bags Mão', fullName: 'Meta de BAGS de Mão', realizado: parseFloat(performance.slaBags), meta: 70 },
  ] : [], [performance]);

  const CustomTargetTick = (props: any) => {
    const { x, y, width, payload } = props;
    if (x === undefined || y === undefined || !payload) return null;
    return (
      <g>
        <line x1={x} x2={x + width} y1={y} y2={y} stroke="#004181" strokeWidth={2} strokeLinecap="round" strokeDasharray="3 2" />
        <text x={x + width + 4} y={y + 3} fill="#004181" fontSize="10" fontWeight="900" className="uppercase tracking-tighter">
          {payload.value}%
        </text>
      </g>
    );
  };

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-black text-slate-400 uppercase ml-2 mr-2">Filtro de Contrato:</span>
            {(Object.keys(groups) as ContractType[]).map((id) => (
              <button
                key={id}
                onClick={() => setActiveContract(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border ${activeContract === id ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-105' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: groups[id].color }}></div>
                <span className="text-[11px] font-black uppercase tracking-tight">
                  {id === 'geral' ? '1. GERAL' : id === 'ahl' ? '2. AHL' : id === 'ohd' ? '3. OHD' : id === 'rampa' ? '4. RAMPA' : id === 'limpeza' ? '5. LIMPEZA' : '6. SAFETY'}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mr-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-[#004181]/10">
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-[#004181]/10">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {activeContract === 'geral' ? (
        performance ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Voos Realizados / Potencial" value={`${performance.totalFlights} / ${performance.potentialFlights}`} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>} />
              <StatCard title="Total PAX" value={performance.totalPax.toLocaleString()} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
              <StatCard title="Pontualidade Orbital" value={`${performance.avgOrbital}%`} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <StatCard title="Pontualidade Base" value={`${performance.avgBase}%`} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Consolidado Mensal: Média de Performance</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Média do Percentual de Atingimento vs Meta Individualizada</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-[#004181] rounded-full border border-white"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase">Meta SLA</span>
                     </div>
                  </div>
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={slaData} margin={{ top: 25, right: 40, left: 0, bottom: 20 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} interval={0} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }} formatter={(value: any, name: string) => name === 'realizado' ? [`${value}%`, 'Média Realizada'] : [`${value}%`, 'Meta SLA']} labelFormatter={(label, props) => props[0]?.payload?.fullName || label} />
                      <Bar dataKey="realizado" barSize={40} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="realizado" position="top" offset={10} content={(props: any) => (
                          <text x={props.x + props.width / 2} y={props.y - 10} fill="#64748b" fontSize="10" fontWeight="900" textAnchor="middle" className="uppercase">
                            {props.value}%
                          </text>
                        )} />
                        {slaData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.realizado >= entry.meta ? '#10b981' : '#f1f5f9'} 
                          />
                        ))}
                      </Bar>
                      <Scatter dataKey="meta" shape={<CustomTargetTick />} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-tight mb-6">Métricas de Fluxo do Mês</h3>
                <div className="space-y-6 flex-grow">
                  <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-[#004181]">
                    <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Média Atendimento</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-800">{performance.avgCheckin}</span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Min</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border-l-4 border-cyan-400">
                    <p className="text-[11px] font-black text-slate-400 uppercase mb-1">Tempo de Fila</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-800">{performance.avgQueue}</span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Min</span>
                    </div>
                  </div>
                  <div className="mt-auto p-4 bg-slate-900 rounded-lg text-white">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Resumo da Amostra</p>
                    <p className="text-[12px] font-bold leading-tight">Foram processados {performance.totalFlights} voos de um potencial de {performance.potentialFlights} atendimentos (Seg/Qua/Sex).</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-tight">Atendimentos Individuais</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Comparativo Realizado vs Meta por Voo</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-sm"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">Conforme</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#fb394e] shadow-sm"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">Não Conforme</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase">ID Voo / STD / Data</th>
                      {['Abertura CKIN', 'Fecham. CKIN', 'Início Emb.', 'Ult. Pax Emb.', 'Bags Portão'].map(h => (
                        <th key={h} className="px-4 py-4 text-[11px] font-black text-slate-500 uppercase text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {performance.flightDetails.map((f, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-[14px] font-black text-slate-900 leading-none">{f.id}</span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="px-1.5 py-0.5 bg-[#004181]/10 text-[#004181] text-[10px] font-black rounded uppercase">STD: {f.std}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{f.pouso}</span>
                            </div>
                          </div>
                        </td>
                        {f.metrics.map((m, idx) => (
                          <td key={idx} className="px-4 py-5">
                            <div className="flex flex-col items-center justify-center group">
                              <div className="flex items-baseline gap-1.5 mb-2">
                                <span className={`text-[13px] font-black leading-none ${m.ok ? 'text-[#10b981]' : 'text-[#fb394e]'}`}>{m.real || '--'}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${m.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{m.perf.toFixed(0)}%</span>
                              </div>
                              <div className="w-full max-w-[70px] h-[1.5px] bg-slate-200 relative mb-2">
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125 ${m.ok ? 'bg-[#10b981]' : 'bg-[#fb394e]'}`}></div>
                              </div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">Meta: {m.target}</div>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest mb-2">Sem Dados Disponíveis</h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase max-w-sm">Não encontramos registros para {months[selectedMonth]} de {selectedYear}.</p>
          </div>
        )
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6" style={{ color: groups[activeContract].color }}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-widest mb-2">BI Segmentado: {activeContract.toUpperCase()}</h3>
          <p className="text-[11px] text-slate-400 font-bold uppercase max-w-sm leading-relaxed mb-6">Módulo de indicadores em desenvolvimento. <br/> Este segmento monitora as seguintes colunas da base:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-2xl">
            {contractHeaders.map((h, i) => (
              <div key={i} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded text-[10px] font-black text-slate-600 uppercase truncate" title={h}>{h}</div>
            ))}
          </div>
          <div className="mt-10 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-slate-300 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aguardando definição de KPIs</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardGeral;