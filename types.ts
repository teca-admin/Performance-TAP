
export interface PerformanceData {
  [key: string]: string | number;
}

export type AppTab = 'dashboard' | 'data';

export interface DashboardState {
  data: PerformanceData[];
  filteredData: PerformanceData[];
  headers: string[];
  isLoading: boolean;
  error: string | null;
  insights: string | null;
  isAnalyzing: boolean;
  activeTab: AppTab;
}

export enum MetricType {
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  NUMBER = 'number',
  TEXT = 'text'
}
