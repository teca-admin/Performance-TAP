
import { GoogleGenAI } from "@google/genai";
import { PerformanceData } from "../types";

export const generateInsights = async (data: PerformanceData[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Limiting data to avoid token limits but providing a representative sample
  const dataSummary = JSON.stringify(data.slice(0, 15));
  
  const prompt = `
    Analise os seguintes dados de performance de marketing/vendas extraídos de uma planilha Google.
    Os dados estão em formato JSON.
    
    Dados: ${dataSummary}
    
    Por favor, forneça:
    1. Um resumo executivo dos principais indicadores.
    2. Identificação de tendências (estão subindo ou descendo?).
    3. 3 sugestões acionáveis para melhorar os resultados com base nos números.
    
    Responda em Português do Brasil, usando formatação Markdown clara. Seja direto e profissional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Erro no Gemini:", error);
    return "Erro ao processar insights com IA.";
  }
};
