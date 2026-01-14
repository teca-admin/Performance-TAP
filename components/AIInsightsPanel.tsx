
import React from 'react';

interface AIInsightsPanelProps {
  insights: string | null;
  isAnalyzing: boolean;
  onRefresh: () => void;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights, isAnalyzing, onRefresh }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-100 flex items-center justify-center rounded">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-[11px] font-black text-slate-800 tracking-tight uppercase">Strategic Analysis</h3>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isAnalyzing}
          className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 flex items-center gap-1 transition-colors uppercase"
        >
          <svg className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isAnalyzing ? 'Processando...' : 'Atualizar'}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto">
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3 py-4">
            <div className="relative w-8 h-8">
                <div className="absolute top-0 left-0 w-full h-full border-2 border-indigo-100 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-500 text-[9px] font-bold uppercase animate-pulse">Consultando Gemini 3 Flash...</p>
          </div>
        ) : insights ? (
          <div className="text-slate-700 text-[9px] font-medium space-y-2 leading-tight">
            {insights.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-[11px] font-black mt-3 mb-1 uppercase text-slate-900 border-b border-slate-100 pb-0.5">{line.replace('# ', '')}</h1>;
              if (line.startsWith('## ')) return <h2 key={i} className="text-[10px] font-black mt-2 mb-1 uppercase text-indigo-700">{line.replace('## ', '')}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-[9px] font-black mt-2 mb-0.5 uppercase">{line.replace('### ', '')}</h3>;
              if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-3 list-disc text-slate-600">{line.substring(2)}</li>;
              if (line.trim() === '') return <div key={i} className="h-1"></div>;
              return <p key={i} className="">{line}</p>;
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest italic">Inicie a análise para obter insights.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsightsPanel;