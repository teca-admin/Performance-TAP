
import React, { useState, useEffect, useCallback } from 'react';
import { DashboardState, AppTab, PerformanceData } from './types';
import { fetchSheetData } from './services/googleSheetsService';
import DataTable from './components/DataTable';
import DashboardGeral from './components/DashboardGeral';

const App: React.FC = () => {
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

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-indigo-100 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 font-black text-[9px] uppercase tracking-widest">Sincronizando BI</p>
          <p className="text-slate-400 text-[9px] mt-1 animate-pulse uppercase font-bold tracking-tight">Conectando ao Banco de Dados Principal • Aguarde...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafc] p-6">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-red-50">
          <div className="w-16 h-16 bg-red-50 text-red-500 flex items-center justify-center rounded-xl mx-auto mb-6 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-[12px] font-black text-slate-800 mb-2 tracking-tight uppercase">FALHA NA EXTRAÇÃO</h2>
          <p className="text-[9px] text-slate-500 mb-6 leading-relaxed font-bold uppercase">{state.error}</p>
          <button 
            onClick={loadDashboardData}
            className="w-full bg-slate-900 hover:bg-black text-white text-[9px] font-black py-3 px-6 rounded-lg shadow-lg transition-all uppercase tracking-widest"
          >
            Tentar Reconectar Agora
          </button>
        </div>
      </div>
    );
  }

  const isFiltered = state.filteredData.length < state.data.length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 px-6 py-3">
        <div className="max-w-[1800px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#004181] rounded-lg flex items-center justify-center text-white shadow-xl shadow-blue-100 transition-transform hover:scale-105">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <div>
                <h1 className="text-[12px] font-black text-slate-800 tracking-tight leading-none uppercase">Performance TAP Dashboard</h1>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.1em] mt-1">Monitoramento Estratégico</p>
              </div>
            </div>

            <nav className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setTab('dashboard')}
                className={`relative px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${state.activeTab === 'dashboard' ? 'bg-white text-[#004181] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                📊 Dashboard
                {isFiltered && state.activeTab === 'dashboard' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full border border-white"></span>
                )}
              </button>
              <button 
                onClick={() => setTab('data')}
                className={`relative px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${state.activeTab === 'data' ? 'bg-white text-[#004181] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                🗄️ Banco de Dados
                {isFiltered && state.activeTab === 'data' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full border border-white"></span>
                )}
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {isFiltered && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-orange-50 border border-orange-100 rounded-full">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                <span className="text-[8px] font-black text-orange-700 uppercase">Filtro Ativo no Banco</span>
              </div>
            )}
            <button 
              onClick={loadDashboardData} 
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-slate-200 uppercase tracking-widest"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Sincronizar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-[1800px] w-full mx-auto px-6 py-6">
        {state.activeTab === 'dashboard' ? (
          <DashboardGeral data={state.filteredData} headers={state.headers} totalRecords={state.data.length} />
        ) : (
          <DataTable 
            headers={state.headers} 
            data={state.data} 
            onFilterChange={handleFilteredDataChange}
          />
        )}
      </main>
      
      <footer className="px-6 py-4 text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
        Operação Performance TAP &copy; 2025 • Hub de Inteligência Operacional
      </footer>
    </div>
  );
};

export default App;
