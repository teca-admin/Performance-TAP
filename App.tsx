
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardState, AppTab, PerformanceData } from './types';
import { fetchSheetData } from './services/googleSheetsService';
import DataTable from './components/DataTable';
import DashboardGeral from './components/DashboardGeral';
import DashboardLostFound from './components/DashboardLostFound';

const App: React.FC = () => {
  const [selectedContract, setSelectedContract] = useState<'geral' | 'lostFound'>('geral');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  
  const [state, setState] = useState<DashboardState>({
    data: [],
    filteredData: [],
    headers: [],
    isLoading: true,
    error: null,
    insights: null,
    isAnalyzing: false,
    activeTab: 'dashboard',
  });

  const loadDashboardData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { headers, data } = await fetchSheetData();
      setState(prev => ({ 
        ...prev, 
        data, 
        filteredData: data, 
        headers, 
        isLoading: false 
      }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err.message || 'Erro inesperado ao carregar dados.' 
      }));
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleFilteredDataChange = (newData: PerformanceData[]) => {
    setState(prev => ({ ...prev, filteredData: newData }));
  };

  const setTab = (tab: AppTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  const parseSheetDate = (dateStr: string | number): Date | null => {
    if (!dateStr) return null;
    const parts = String(dateStr).split(' ')[0].split('/');
    if (parts.length < 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  const finalFilteredData = useMemo(() => {
    return state.data.filter(row => {
      const d = parseSheetDate(row[state.headers[1]]);
      return d && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [state.data, state.headers, selectedMonth, selectedYear]);

  const years = useMemo(() => {
    const s = new Set<number>();
    state.data.forEach(r => { 
      const d = parseSheetDate(r[state.headers[1]]); 
      if(d) s.add(d.getFullYear()); 
    });
    return s.size ? Array.from(s).sort() : [2025];
  }, [state.data, state.headers]);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-indigo-100 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">Sincronizando BI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="font-black text-[13px] text-[#004181] uppercase tracking-tighter">TAP PERFORMANCE</div>
          <nav className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setTab('dashboard')}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${state.activeTab === 'dashboard' ? 'bg-white text-[#004181] shadow-sm' : 'text-slate-500'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setTab('data')}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${state.activeTab === 'data' ? 'bg-white text-[#004181] shadow-sm' : 'text-slate-500'}`}
            >
              Banco
            </button>
          </nav>
        </div>
        <button onClick={loadDashboardData} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase">Sincronizar</button>
      </header>

      <main className="max-w-[1800px] w-full mx-auto p-6 flex-grow">
        {state.activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="bg-white p-2 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedContract('geral')} 
                  className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${selectedContract === 'geral' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  1. GERAL
                </button>
                <button 
                  onClick={() => setSelectedContract('lostFound')} 
                  className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${selectedContract === 'lostFound' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  2. LOST & FOUND
                </button>
              </div>
              <div className="flex gap-2">
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black outline-none">
                  {["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"].map((m,i)=><option key={i} value={i}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black outline-none">
                  {years.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {selectedContract === 'geral' ? (
              <DashboardGeral data={finalFilteredData} headers={state.headers} totalRecords={state.data.length} />
            ) : (
              <DashboardLostFound data={finalFilteredData} headers={state.headers} />
            )}
          </div>
        ) : (
          <DataTable headers={state.headers} data={state.data} onFilterChange={handleFilteredDataChange} />
        )}
      </main>
      
      <footer className="px-6 py-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
        TAP Performance Hub &copy; 2025
      </footer>
    </div>
  );
};

export default App;
