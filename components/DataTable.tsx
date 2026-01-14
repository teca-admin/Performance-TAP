
import React, { useRef } from 'react';
import { PerformanceData } from '../types';

interface DataTableProps {
  headers: string[];
  data: PerformanceData[];
}

const DataTable: React.FC<DataTableProps> = ({ headers, data }) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const group1Count = 14; 
  const gap1Count = 0; 
  const group2Count = 3; 
  const group3Count = 2; 
  const group4Count = 7;
  const gap2Count = 0;
  const group5Count = 3;
  const group6Count = 9;
  const remainingCount = Math.max(0, headers.length - (group1Count + gap1Count + group2Count + group3Count + group4Count + gap2Count + group5Count + group6Count));

  // Largura atualizada para 110px
  const colWidth = 110;
  const colWidthClass = "w-[110px] min-w-[110px] max-w-[110px]";

  const scrollToGroup = (startColIndex: number) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({
        left: startColIndex * colWidth,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl shadow-slate-200/60 border border-slate-200 overflow-hidden transition-all duration-300">
      <div className="px-6 py-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-[9px] font-black text-slate-800 tracking-tight text-left uppercase">Análise Estruturada de Performance</h3>
          <p className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase text-left">Grade Estendida (110px) | Calibri 9px | {data.length} registros</p>
        </div>
        <div className="flex flex-wrap gap-2">
           {[
             { name: "1. Geral", color: "#004181", start: 0 },
             { name: "2. AHL", color: "#22d3ee", start: group1Count, dark: true },
             { name: "3. OHD", color: "#fb394e", start: group1Count + group2Count },
             { name: "4. Rampa", color: "#3c78d8", start: group1Count + group2Count + group3Count },
             { name: "5. Limpeza", color: "#fbbc04", start: group1Count + group2Count + group3Count + group4Count },
             { name: "6. Safety", color: "#20124d", start: group1Count + group2Count + group3Count + group4Count + group5Count }
           ].map((g, i) => (
             <button 
               key={i}
               onClick={() => scrollToGroup(g.start)}
               className={`flex items-center gap-1.5 px-2 py-1 border rounded hover:opacity-80 transition-opacity cursor-pointer ${g.dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
             >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }}></div>
                <span className="text-[9px] font-black uppercase tracking-tighter">{g.name}</span>
             </button>
           ))}
        </div>
      </div>
      
      <div 
        ref={tableContainerRef}
        className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar"
      >
        <table className="text-center border-collapse table-fixed w-full border-spacing-0">
          <thead className="sticky top-0 z-30">
            {/* Definida altura exata h-[28px] para alinhar perfeitamente com o sticky top-[28px] da linha seguinte */}
            <tr className="h-[28px] border-none">
              <th colSpan={group1Count} style={{ width: `${group1Count * colWidth}px` }} className="bg-[#004181] text-white px-1 text-[9px] font-black uppercase border-r border-[#003569] border-b-0 whitespace-nowrap overflow-hidden text-ellipsis">1. GERAL</th>
              <th colSpan={group2Count} style={{ width: `${group2Count * colWidth}px` }} className="bg-[#0c343d] text-white px-1 text-[9px] font-black uppercase border-r border-[#082a32] border-b-0 whitespace-nowrap overflow-hidden text-ellipsis">2. AHL</th>
              <th colSpan={group3Count} style={{ width: `${group3Count * colWidth}px` }} className="bg-[#fb394e] text-white px-1 text-[9px] font-black uppercase border-r border-[#d62b3d] border-b-0 whitespace-nowrap overflow-hidden text-ellipsis">3. OHD</th>
              <th colSpan={group4Count} style={{ width: `${group4Count * colWidth}px` }} className="bg-[#3c78d8] text-white px-1 text-[9px] font-black uppercase border-r border-[#2b59a3] border-b-0 whitespace-nowrap overflow-hidden text-ellipsis">4. RAMPA</th>
              <th colSpan={group5Count} style={{ width: `${group5Count * colWidth}px` }} className="bg-[#fbbc04] text-white px-1 text-[9px] font-black uppercase border-r border-[#c29304] border-b-0 whitespace-nowrap overflow-hidden text-ellipsis">5. LIMPEZA</th>
              <th colSpan={group6Count} style={{ width: `${group6Count * colWidth}px` }} className="bg-[#20124d] text-white px-1 text-[9px] font-black uppercase border-r border-[#150b33] border-b-0 whitespace-nowrap overflow-hidden text-ellipsis">6. SAFETY</th>
            </tr>
            <tr className="bg-slate-50">
              {headers.map((header, idx) => {
                const isG1 = idx < group1Count;
                const isG2 = idx >= group1Count && idx < (group1Count + group2Count);
                const isG3 = idx >= (group1Count + group2Count) && idx < (group1Count + group2Count + group3Count);
                const isG4 = idx >= (group1Count + group2Count + group3Count) && idx < (group1Count + group2Count + group3Count + group4Count);
                const isG5 = idx >= (group1Count + group2Count + group3Count + group4Count) && idx < (group1Count + group2Count + group3Count + group4Count + group5Count);
                const isG6 = idx >= (group1Count + group2Count + group3Count + group4Count + group5Count) && idx < (group1Count + group2Count + group3Count + group4Count + group5Count + group6Count);
                
                let textColor = "text-slate-500";
                let bgColor = "bg-slate-50";
                
                if (isG1) { textColor = "text-[#004181]"; bgColor = "bg-[#004181]/10"; }
                else if (isG2) { textColor = "text-cyan-900"; bgColor = "bg-cyan-100/70"; }
                else if (isG3) { textColor = "text-[#fb394e]"; bgColor = "bg-[#fb394e]/10"; }
                else if (isG4) { textColor = "text-[#3c78d8]"; bgColor = "bg-[#3c78d8]/10"; }
                else if (isG5) { textColor = "text-[#fbbc04]"; bgColor = "bg-[#fbbc04]/10"; }
                else if (isG6) { textColor = "text-[#20124d]"; bgColor = "bg-[#20124d]/10"; }

                return (
                  <th 
                    key={idx} 
                    className={`${colWidthClass} px-2 py-1 text-[9px] font-black border-b border-slate-200 whitespace-nowrap sticky top-[28px] ${bgColor} z-20 overflow-hidden text-ellipsis ${textColor} text-center`}
                    title={header}
                  >
                    {header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? (
              data.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-200 transition-colors group">
                  {headers.map((header, colIdx) => {
                    const isG1 = colIdx < group1Count;
                    const isG2 = colIdx >= group1Count && colIdx < (group1Count + group2Count);
                    const isG3 = colIdx >= (group1Count + group2Count) && colIdx < (group1Count + group2Count + group3Count);
                    const isG4 = colIdx >= (group1Count + group2Count + group3Count) && colIdx < (group1Count + group2Count + group3Count + group4Count);
                    const isG5 = colIdx >= (group1Count + group2Count + group3Count + group4Count) && colIdx < (group1Count + group2Count + group3Count + group4Count + group5Count);
                    const isG6 = colIdx >= (group1Count + group2Count + group3Count + group4Count + group5Count) && colIdx < (group1Count + group2Count + group3Count + group4Count + group5Count + group6Count);
                    
                    let cellBg = "";
                    if (isG1) cellBg = "bg-[#004181]/5";
                    else if (isG2) cellBg = "bg-cyan-50/20";
                    else if (isG3) cellBg = "bg-[#fb394e]/5";
                    else if (isG4) cellBg = "bg-[#3c78d8]/5";
                    else if (isG5) cellBg = "bg-[#fbbc04]/5";
                    else if (isG6) cellBg = "bg-[#20124d]/5";

                    const value = row[header];
                    const displayValue = value !== undefined && value !== '' ? String(value) : '';

                    return (
                      <td 
                        key={colIdx} 
                        className={`${colWidthClass} px-2 py-1 text-[9px] whitespace-nowrap border-r border-slate-50 last:border-r-0 overflow-hidden text-ellipsis text-center ${cellBg}`}
                        title={displayValue}
                      >
                        <span className="font-bold text-slate-700">
                          {displayValue}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Sincronizando BI Performance...</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
