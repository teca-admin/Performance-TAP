
import { SHEET_CONFIG } from '../constants';

export const fetchSheetData = async () => {
  const apiKey = SHEET_CONFIG.API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Chave de API não configurada.");
  }

  const encodedRange = encodeURIComponent(SHEET_CONFIG.RANGE);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_CONFIG.ID}/values/${encodedRange}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (!response.ok) {
      console.error('Erro detalhado da API:', JSON.stringify(result, null, 2));
      const errorMessage = result.error?.message || response.statusText;
      throw new Error(errorMessage);
    }

    const rows = result.values;

    if (!rows || rows.length === 0) {
      return { headers: [], data: [] };
    }

    // O range A:DF possui 110 colunas no total (0 a 109).
    // Removendo:
    // I-M   (8-12)
    // O-S   (14-18)
    // U-Y   (20-24)
    // AB-AF (27-31)
    // AI-AJ (34-35)
    // AL-AP (37-41)
    // AR-AV (43-47)
    // AY-BH (50-59)
    // BK-BN (62-65)
    // BP-BS (67-70)
    // BU-BX (72-75)
    // BZ-CC (77-80)
    // CE-CH (82-85)
    // CJ-CM (87-90)
    // CO    (92)
    // CQ    (94)
    // CS-CV (96-99)
    const rawHeaders = rows[0] || [];
    const headers: string[] = [];
    const indicesToInclude: number[] = [];
    
    for (let i = 0; i < 110; i++) {
      // Pula os intervalos solicitados
      if (
        (i >= 8 && i <= 12) ||  // I-M
        (i >= 14 && i <= 18) || // O-S
        (i >= 20 && i <= 24) || // U-Y
        (i >= 27 && i <= 31) || // AB-AF
        (i >= 34 && i <= 35) || // AI-AJ
        (i >= 37 && i <= 41) || // AL-AP
        (i >= 43 && i <= 47) || // AR-AV
        (i >= 50 && i <= 59) || // AY-BH
        (i >= 62 && i <= 65) || // BK-BN
        (i >= 67 && i <= 70) || // BP-BS
        (i >= 72 && i <= 75) || // BU-BX
        (i >= 77 && i <= 80) || // BZ-CC
        (i >= 82 && i <= 85) || // CE-CH
        (i >= 87 && i <= 90) || // CJ-CM
        i === 92 ||              // CO
        i === 94 ||              // CQ
        (i >= 96 && i <= 99)    // CS-CV
      ) continue;
      
      indicesToInclude.push(i);
      const headerText = rawHeaders[i]?.trim();
      headers.push(headerText || `Campo ${i + 1}`);
    }
    
    const dataRows = rows.slice(1);

    const formattedData = dataRows.map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        // Mapeia para o índice original na linha bruta da planilha
        const originalIndex = indicesToInclude[index];
        obj[header] = row[originalIndex] !== undefined ? row[originalIndex] : '';
      });
      return obj;
    });

    return { headers, data: formattedData };
  } catch (error: any) {
    console.error('Falha crítica na extração dos dados:', error);
    throw error;
  }
};
