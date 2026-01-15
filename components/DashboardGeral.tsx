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
type FlightFilterType = 'all' | 'perfect' | 'failed';

interface MetricMeta {
  name: string;
  sourceColumn: string;
  rule: string;
  target: string;
  description: string;
}

interface FluxMetricMeta {
  name: string;
  formula: string;
  description: string;
  importance: string;
}

interface FlightAudit {
  flightId: string;
  metricName: string;
  realValue: string | number;
  targetValue: string | number;
  perf: number;
  isOk: boolean;
  rawDetails: {
    label: string;
    column: string;
    value: string | number;
  }[];
  logic: string;
}

const DashboardGeral: React.FC<DashboardGeralProps> = ({ data, headers, totalRecords }) => {
  const [activeContract, setActiveContract] = useState<ContractType>('geral');
  const [selectedMetric, setSelectedMetric] = useState<MetricMeta | null>(null);
  const [selectedFluxMetric, setSelectedFluxMetric] = useState<FluxMetricMeta | null>(null);
  const [selectedFlightAudit, setSelectedFlightAudit] = useState<FlightAudit | null>(null);
  const [flightListFilter, setFlightListFilter] = useState<FlightFilterType>('all');
  
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

  const formatDuration = (totalMinutes: number): string => {
    if (totalMinutes <= 0) return "00:00";
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const parseBrazilianNumber = (val: string | number): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const sanitized = String(val).replace(/\./g, '').replace(',', '.').trim();
    const parsed = parseFloat(sanitized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const pousoHeader = headers[1]; 
    data.forEach(row => {
      const d = parseSheetDate(row[pousoHeader]);
      if (d) years.add(d.getFullYear());
    });
    const yearsArray = Array.from(years).sort((a, b) => a - b);
    return yearsArray.length > 0 ? yearsArray : [new Date().getFullYear()];
  }, [data, headers]);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(availableYears.includes(new Date().getFullYear()) ? new Date().getFullYear() : availableYears[0]);

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

  const findKeyInContract = (keywords: string[]) => {
    return headers.find(h => keywords.some(k => h.toLowerCase() === k.toLowerCase())) || '';
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
    pushback: findKeyInContract(['PUSH BACK', 'Push-back', 'Horário Pushback', 'Horário PUSH BACK']) || headers[13]
  }), [contractHeaders, headers]);

  const metricAuditMeta: Record<string, MetricMeta> = {
    'Abertura de Check-in': {
      name: 'Abertura de Check-in',
      sourceColumn: keys.abertura,
      rule: 'Cálculo: (STD - 210 min) vs Real de Abertura.',
      target: 'STD - 210 minutos (3h 30min antes).',
      description: 'Mede a pontualidade na abertura do balcão de check-in.'
    },
    'Fechamento de Check-in': {
      name: 'Fechamento de Check-in',
      sourceColumn: keys.fechamento,
      rule: 'Cálculo: (STD - 60 min) vs Real de Fechamento.',
      target: 'STD - 60 minutos (1h antes).',
      description: 'Garante o encerramento do processamento a tempo do manifesto.'
    },
    'Início do Embarque': {
      name: 'Início do Embarque',
      sourceColumn: keys.embarque,
      rule: 'Cálculo: (STD - 40 min) vs Real de Início Embarque.',
      target: 'STD - 40 minutos.',
      description: 'Indicador de fluxo para embarque eficiente.'
    },
    'Último PAX a Bordo': {
      name: 'Último PAX a Bordo',
      sourceColumn: keys.ultimoPax,
      rule: 'Cálculo: (STD - 10 min) vs Real do Último PAX.',
      target: 'STD - 10 minutos.',
      description: 'Define o limite para fechamento de portas.'
    },
    'BAGS de Mão': {
      name: 'BAGS de Mão',
      sourceColumn: `${keys.bagsAtendidas}`,
      rule: 'Se PAX >= 107, meta 35 bolsas. Caso < 107, isento (100%).',
      target: 'Min. 35 unidades (se ocupação alta).',
      description: 'Gestão de espaço em cabine e agilidade.'
    }
  };

  const fluxMetaInfo: Record<string, FluxMetricMeta> = {
    'Ciclo Atendimento': {
      name: 'Ciclo Atendimento',
      formula: 'Último PAX a bordo - Abertura de Check-in',
      description: 'Mede o tempo total de processamento dos passageiros desde o início do atendimento no balcão até o fechamento da aeronave.',
      importance: 'Essencial para dimensionar a produtividade da equipe de terra e garantir que o fluxo de passageiros não cause atrasos no STD.'
    },
    'Eficiência de Embarque': {
      name: 'Eficiência de Embarque',
      formula: 'Último PAX a bordo - Início do Embarque',
      description: 'Mede o tempo líquido gasto para embarcar todos os passageiros no portão de embarque.',
      importance: 'Indicador direto de quão rápido a equipe de portão consegue processar a fila e acomodar os passageiros na cabine.'
    },
    'Eficiência Operacional': {
      name: 'Eficiência Operacional',
      formula: 'Horário de Pushback - Horário de Pouso',
      description: 'Mede o turnaround completo da aeronave em solo (tempo de permanência entre a chegada e a partida).',
      importance: 'Reflete a coordenação entre todas as áreas (Rampa, Limpeza, Catering e Tráfego) para liberar a aeronave no menor tempo possível.'
    }
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
    let totalPax = 0, sumOrbital = 0, sumBase = 0;
    let sumPerfAbertura = 0, sumPerfFechamento = 0, sumPerfEmbarque = 0, sumPerfUltimoPax = 0, sumPerfBags = 0;
    let flightsWith100SlaCount = 0;

    // Métricas de Fluxo
    let sumCicloTotal = 0, countCiclo = 0;
    let sumEficienciaPortao = 0, countPortao = 0;
    let sumEficienciaSolo = 0, countSolo = 0;

    const flightDetails = filteredByDate.map(row => {
      const stdMin = timeToMinutes(row[keys.std]);
      const checkinAbertura = timeToMinutes(row[keys.abertura]);
      const checkinFechamento = timeToMinutes(row[keys.fechamento]);
      const embarqueInicio = timeToMinutes(row[keys.embarque]);
      const lastPaxMin = timeToMinutes(row[keys.ultimoPax]);
      const pousoMin = timeToMinutes(row[keys.pouso]);
      const pushbackMin = timeToMinutes(row[keys.pushback]);

      const paxCount = parseBrazilianNumber(row[keys.pax]);
      const bagsRealValue = parseBrazilianNumber(row[keys.bagsAtendidas]);

      // Cálculos de Fluxo (em minutos)
      const cicloTotal = lastPaxMin - checkinAbertura;
      const eficienciaPortao = lastPaxMin - embarqueInicio;
      const eficienciaSolo = pushbackMin - pousoMin;

      if (lastPaxMin > 0 && checkinAbertura > 0 && cicloTotal > 0) {
        sumCicloTotal += cicloTotal;
        countCiclo++;
      }
      if (lastPaxMin > 0 && embarqueInicio > 0 && eficienciaPortao > 0) {
        sumEficienciaPortao += eficienciaPortao;
        countPortao++;
      }
      if (pushbackMin > 0 && pousoMin > 0 && eficienciaSolo > 0) {
        sumEficienciaSolo += eficienciaSolo;
        countSolo++;
      }

      const targetAbertura = stdMin - 210;
      const targetFechamento = stdMin - 60;
      const targetEmbarque = stdMin - 40;
      const targetPax = stdMin - 10;

      const isAberturaOk = row[keys.abertura] && stdMin > 0 && checkinAbertura <= targetAbertura;
      const isFechamentoOk = row[keys.fechamento] && stdMin > 0 && checkinFechamento <= targetFechamento;
      const isEmbarqueOk = row[keys.embarque] && stdMin > 0 && embarqueInicio <= targetEmbarque;
      const isUltimoPaxOk = row[keys.ultimoPax] && stdMin > 0 && lastPaxMin <= targetPax;
      const isBagsOk = paxCount >= 107 ? bagsRealValue >= 35 : true;

      const isPerfect = !!(isAberturaOk && isFechamentoOk && isEmbarqueOk && isUltimoPaxOk && isBagsOk);
      if (isPerfect) {
        flightsWith100SlaCount++;
      }

      const calcTimeEfficiency = (real: number, target: number) => {
        if (real === 0 || target === 0) return 0;
        if (real <= target) return 100;
        return Math.max(0, 100 - (real - target)); 
      };

      const perfAberturaValue = calcTimeEfficiency(checkinAbertura, targetAbertura);
      const perfFechamentoValue = calcTimeEfficiency(checkinFechamento, targetFechamento);
      const perfEmbarqueValue = calcTimeEfficiency(embarqueInicio, targetEmbarque);
      const perfUltimoPaxValue = calcTimeEfficiency(lastPaxMin, targetPax);
      const perfBagsValue = paxCount >= 107 ? Math.min(100, (bagsRealValue / 35) * 100) : 100;

      sumPerfAbertura += perfAberturaValue;
      sumPerfFechamento += perfFechamentoValue;
      sumPerfEmbarque += perfEmbarqueValue;
      sumPerfUltimoPax += perfUltimoPaxValue;
      sumPerfBags += perfBagsValue;

      totalPax += paxCount;
      sumOrbital += parseFloat(String(row[keys.orbital]).replace('%', '').replace(',', '.')) || 0;
      sumBase += parseFloat(String(row[keys.base]).replace('%', '').replace(',', '.')) || 0;

      const metrics = [
        { label: 'Abertura de Check-in', real: String(row[keys.abertura]).split(' ')[1] || row[keys.abertura], target: minutesToTime(targetAbertura), ok: isAberturaOk, perf: perfAberturaValue, logic: `Real (${row[keys.abertura] || '--'}) vs Meta (${minutesToTime(targetAbertura)}). Meta baseada em STD (${row[keys.std]}) - 210 min.`, raw: [{ label: 'STD Voo', column: keys.std, value: row[keys.std] }, { label: 'Abertura Real', column: keys.abertura, value: row[keys.abertura] }] },
        { label: 'Fechamento de Check-in', real: String(row[keys.fechamento]).split(' ')[1] || row[keys.fechamento], target: minutesToTime(targetFechamento), ok: isFechamentoOk, perf: perfFechamentoValue, logic: `Real (${row[keys.fechamento] || '--'}) vs Meta (${minutesToTime(targetFechamento)}). Meta baseada em STD (${row[keys.std]}) - 60 min.`, raw: [{ label: 'STD Voo', column: keys.std, value: row[keys.std] }, { label: 'Fechamento Real', column: keys.fechamento, value: row[keys.fechamento] }] },
        { label: 'Início do Embarque', real: String(row[keys.embarque]).split(' ')[1] || row[keys.embarque], target: minutesToTime(targetEmbarque), ok: isEmbarqueOk, perf: perfEmbarqueValue, logic: `Real (${row[keys.embarque] || '--'}) vs Meta (${minutesToTime(targetEmbarque)}). Meta baseada em STD (${row[keys.std]}) - 40 min.`, raw: [{ label: 'STD Voo', column: keys.std, value: row[keys.std] }, { label: 'Início Real', column: keys.embarque, value: row[keys.embarque] }] },
        { label: 'Último PAX a Bordo', real: String(row[keys.ultimoPax]).split(' ')[1] || row[keys.ultimoPax], target: minutesToTime(targetPax), ok: isUltimoPaxOk, perf: perfUltimoPaxValue, logic: `Real (${row[keys.ultimoPax] || '--'}) vs Meta (${minutesToTime(targetPax)}). Meta baseada em STD (${row[keys.std]}) - 10 min.`, raw: [{ label: 'STD Voo', column: keys.std, value: row[keys.std] }, { label: 'Último PAX Real', column: keys.ultimoPax, value: row[keys.ultimoPax] }] },
        { label: 'BAGS de Mão', real: bagsRealValue, target: paxCount >= 107 ? '35' : '--', ok: isBagsOk, perf: perfBagsValue, logic: paxCount >= 107 ? `Voo com ${paxCount} passageiros (>= 107). Exige min. 35 BAGS. Real: ${bagsRealValue}.` : `Voo com ${paxCount} passageiros (< 107). Isento de meta de bags de mão.`, raw: [{ label: 'Total PAX', column: keys.pax, value: row[keys.pax] }, { label: 'BAGS Coletadas', column: keys.bagsAtendidas, value: row[keys.bagsAtendidas] }] }
      ];

      return {
        id: row[keys.id],
        pouso: row[keys.pouso],
        std: String(row[keys.std]).includes(' ') ? String(row[keys.std]).split(' ')[1] : String(row[keys.std]),
        metrics,
        isPerfect,
        cicloTotal: formatDuration(cicloTotal),
        eficienciaPortao: formatDuration(eficienciaPortao),
        eficienciaSolo: formatDuration(eficienciaSolo)
      };
    });

    return {
      totalFlights: flightsCount,
      potentialFlights: potentialCount,
      flightsWith100Sla: flightsWith100SlaCount,
      flightsBelowSla: flightsCount - flightsWith100SlaCount,
      totalPax,
      avgOrbital: (sumOrbital / flightsCount).toFixed(1),
      avgBase: (sumBase / flightsCount).toFixed(1),
      slaAbertura: (sumPerfAbertura / flightsCount).toFixed(1),
      slaFechamento: (sumPerfFechamento / flightsCount).toFixed(1),
      slaEmbarque: (sumPerfEmbarque / flightsCount).toFixed(1),
      slaUltimoPax: (sumPerfUltimoPax / flightsCount).toFixed(1),
      slaBags: (sumPerfBags / flightsCount).toFixed(1),
      // Formatação das médias em hh:mm
      avgCicloTotal: countCiclo > 0 ? formatDuration(sumCicloTotal / countCiclo) : "00:00",
      avgEficienciaPortao: countPortao > 0 ? formatDuration(sumEficienciaPortao / countPortao) : "00:00",
      avgEficienciaSolo: countSolo > 0 ? formatDuration(sumEficienciaSolo / countSolo) : "00:00",
      flightDetails
    };
  }, [filteredByDate, keys, activeContract, selectedMonth, selectedYear]);

  const displayedFlights = useMemo(() => {
    if (!performance) return [];
    if (flightListFilter === 'perfect') return performance.flightDetails.filter(f => f.isPerfect);
    if (flightListFilter === 'failed') return performance.flightDetails.filter(f => !f.isPerfect);
    return performance.flightDetails;
  }, [performance, flightListFilter]);

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

  const openFlightAudit = (f: any, m: any) => {
    setSelectedFlightAudit({
      flightId: f.id,
      metricName: m.label,
      realValue: m.real,
      targetValue: m.target,
      perf: m.perf,
      isOk: m.ok,
      logic: m.logic,
      rawDetails: m.raw
    });
  };

  const handleCardFilter = (filter: FlightFilterType) => {
    setFlightListFilter(prev => prev === filter ? 'all' : filter);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* MODAL DE EXPLICAÇÃO DE FLUXO */}
      {selectedFluxMetric && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedFluxMetric(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-[#004181] p-6 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Dicionário de Métricas de Fluxo</p>
                <h3 className="text-lg font-black uppercase">{selectedFluxMetric.name}</h3>
              </div>
              <button onClick={() => setSelectedFluxMetric(null)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">O que é?</h4>
                <p className="text-[13px] font-bold text-slate-700 leading-relaxed">{selectedFluxMetric.description}</p>
              </div>
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Fórmula de Cálculo</h4>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[12px] font-black text-[#004181] font-mono">{selectedFluxMetric.formula}</p>
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Importância Estratégica</h4>
                <p className="text-[12px] font-bold text-slate-600 leading-relaxed italic">"{selectedFluxMetric.importance}"</p>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedFluxMetric(null)} className="px-8 py-2 bg-slate-900 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-black transition-all">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AUDITORIA DE MÉTRICAS GERAIS (CABEÇALHO) */}
      {selectedMetric && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-fade-in" onClick={() => setSelectedMetric(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="bg-[#004181] p-6 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Guia de Indicador (SLA)</p>
                <h3 className="text-lg font-black uppercase">{selectedMetric.name}</h3>
              </div>
              <button onClick={() => setSelectedMetric(null)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Rastreabilidade no Banco de Dados</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                  </div>
                  <span className="text-[12px] font-black text-slate-800">{selectedMetric.sourceColumn}</span>
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Padrão de Meta Operacional</h4>
                <p className="text-[14px] font-black text-[#004181]">{selectedMetric.target}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Resumo Lógico</h4>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed">{selectedMetric.rule}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Importância</h4>
                  <p className="text-[11px] font-bold text-slate-600 leading-relaxed">{selectedMetric.description}</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedMetric(null)} className="px-6 py-2 bg-slate-900 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-black transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {selectedFlightAudit && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedFlightAudit(null)}>
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className={`p-6 text-white flex justify-between items-center ${selectedFlightAudit.isOk ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Rastreabilidade: Voo {selectedFlightAudit.flightId}</p>
                  <h3 className="text-xl font-black uppercase">{selectedFlightAudit.metricName}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedFlightAudit(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase mb-3">Realizado (Voo)</span>
                  <span className={`text-2xl font-black ${selectedFlightAudit.isOk ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedFlightAudit.realValue}
                  </span>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase mb-3">Objetivo (Alvo)</span>
                  <span className="text-2xl font-black text-[#004181]">
                    {selectedFlightAudit.targetValue}
                  </span>
                </div>
                <div className="bg-slate-900 p-5 rounded-2xl shadow-xl flex flex-col items-center justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase mb-1">Desempenho</span>
                  <span className="text-3xl font-black text-white">{selectedFlightAudit.perf.toFixed(0)}%</span>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#004181]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    Memória de Cálculo (Lógica do BI)
                  </h4>
                  <div className="p-4 bg-[#004181]/5 border border-[#004181]/10 rounded-xl">
                    <p className="text-[13px] font-bold text-slate-700 leading-relaxed italic">
                      "{selectedFlightAudit.logic}"
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    Dados Originais (Banco de Dados)
                  </h4>
                  <div className="overflow-hidden border border-slate-100 rounded-xl">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Campo</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Coluna na Planilha</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Valor Bruto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedFlightAudit.rawDetails.map((rd, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-[11px] font-black text-slate-700">{rd.label}</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-slate-400 font-mono">{rd.column}</td>
                            <td className="px-4 py-3 text-[11px] font-black text-indigo-600 bg-indigo-50/30">{rd.value || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedFlightAudit(null)} className="px-8 py-3 bg-slate-900 text-white text-[11px] font-black rounded-xl uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-200">
                Confirmado
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-black text-slate-400 uppercase ml-2 mr-2">Contrato Selecionado:</span>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                title="Voos Realizados" 
                value={performance.totalFlights} 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>} 
                onClick={() => setFlightListFilter('all')}
                isActive={flightListFilter === 'all'}
              />
              <StatCard 
                title="Atingido" 
                value={performance.flightsWith100Sla} 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
                onClick={() => handleCardFilter('perfect')}
                isActive={flightListFilter === 'perfect'}
              />
              <StatCard 
                title="Abaixo do SLA" 
                value={performance.flightsBelowSla} 
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
                onClick={() => handleCardFilter('failed')}
                isActive={flightListFilter === 'failed'}
              />
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
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#64748b' }} interval={0} />
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
                <div className="space-y-4 flex-grow">
                  <div 
                    onClick={() => setSelectedFluxMetric(fluxMetaInfo['Ciclo Atendimento'])}
                    className="p-3 bg-slate-50 rounded-lg border-l-4 border-[#004181] cursor-pointer hover:bg-blue-50/50 hover:scale-[1.02] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase group-hover:text-[#004181]">Média: Ciclo Atendimento</p>
                      <svg className="w-3 h-3 text-slate-300 group-hover:text-[#004181]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-800">{performance.avgCicloTotal}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Horas</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => setSelectedFluxMetric(fluxMetaInfo['Eficiência de Embarque'])}
                    className="p-3 bg-slate-50 rounded-lg border-l-4 border-cyan-400 cursor-pointer hover:bg-cyan-50/50 hover:scale-[1.02] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase group-hover:text-cyan-600">Média: Eficiência de Embarque</p>
                      <svg className="w-3 h-3 text-slate-300 group-hover:text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-800">{performance.avgEficienciaPortao}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Horas</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => setSelectedFluxMetric(fluxMetaInfo['Eficiência Operacional'])}
                    className="p-3 bg-slate-50 rounded-lg border-l-4 border-emerald-400 cursor-pointer hover:bg-emerald-50/50 hover:scale-[1.02] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase group-hover:text-emerald-600">Média: Eficiência Operacional</p>
                      <svg className="w-3 h-3 text-slate-300 group-hover:text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-800">{performance.avgEficienciaSolo}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Horas</span>
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
                  <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-tight">
                    {flightListFilter === 'all' ? 'Atendimentos Individuais' : flightListFilter === 'perfect' ? 'Voos: Atingido (100% SLA)' : 'Voos: Abaixo do SLA'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                    Exibindo {displayedFlights.length} voos com base no filtro selecionado acima
                  </p>
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
                      {[
                        { name: 'Abertura de Check-in', meta: '98%' },
                        { name: 'Fechamento de Check-in', meta: '98%' },
                        { name: 'Início do Embarque', meta: '95%' },
                        { name: 'Último PAX a Bordo', meta: '95%' },
                        { name: 'BAGS de Mão', meta: '70%' }
                      ].map(h => (
                        <th 
                          key={h.name} 
                          className="px-4 py-4 text-[11px] font-black text-slate-500 uppercase text-center cursor-help hover:bg-slate-100 transition-colors group"
                          onClick={() => setSelectedMetric(metricAuditMeta[h.name])}
                        >
                          <div className="flex flex-col items-center">
                            <span>{h.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold">SLA: {h.meta}</span>
                            <div className="w-4 h-0.5 bg-[#004181] mt-1 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        </th>
                      ))}
                      {/* NOVOS CABEÇALHOS DE FLUXO */}
                      <th className="px-4 py-4 text-[11px] font-black text-slate-500 uppercase text-center bg-blue-50/30">
                        Ciclo Total
                      </th>
                      <th className="px-4 py-4 text-[11px] font-black text-slate-500 uppercase text-center bg-cyan-50/30">
                        Efic. Portão
                      </th>
                      <th className="px-4 py-4 text-[11px] font-black text-slate-500 uppercase text-center bg-emerald-50/30">
                        Efic. Solo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayedFlights.map((f, i) => (
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
                            <div 
                              className="flex flex-col items-center justify-center group cursor-zoom-in hover:scale-105 transition-transform"
                              onClick={() => openFlightAudit(f, m)}
                            >
                              <div className="flex items-baseline gap-1.5 mb-2">
                                <span className={`text-[13px] font-black leading-none ${m.ok ? 'text-[#10b981]' : 'text-[#fb394e]'}`}>{m.real || '--'}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${m.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{m.perf.toFixed(0)}%</span>
                              </div>
                              <div className="w-full max-w-[70px] h-[1.5px] bg-slate-200 relative mb-2">
                                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-150 ${m.ok ? 'bg-[#10b981]' : 'bg-[#fb394e]'}`}></div>
                              </div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">Meta: {m.target}</div>
                            </div>
                          </td>
                        ))}
                        {/* NOVOS DADOS DE FLUXO POR VOO */}
                        <td className="px-4 py-5 text-center bg-blue-50/10">
                           <div className="flex flex-col items-center">
                             <span className="text-[13px] font-black text-slate-700">{f.cicloTotal}</span>
                             <span className="text-[8px] font-black text-slate-400 uppercase">HH:MM</span>
                           </div>
                        </td>
                        <td className="px-4 py-5 text-center bg-cyan-50/10">
                           <div className="flex flex-col items-center">
                             <span className="text-[13px] font-black text-slate-700">{f.eficienciaPortao}</span>
                             <span className="text-[8px] font-black text-slate-400 uppercase">HH:MM</span>
                           </div>
                        </td>
                        <td className="px-4 py-5 text-center bg-emerald-50/10">
                           <div className="flex flex-col items-center">
                             <span className="text-[13px] font-black text-slate-700">{f.eficienciaSolo}</span>
                             <span className="text-[8px] font-black text-slate-400 uppercase">HH:MM</span>
                           </div>
                        </td>
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