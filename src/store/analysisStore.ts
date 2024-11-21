import { create } from 'zustand';

interface AnalysisState {
  selectedRepo: string | null;
  analyses: any[];
  files: any[];
  setSelectedRepo: (repo: string) => void;
  setAnalyses: (analyses: any[]) => void;
  setFiles: (files: any[]) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  selectedRepo: null,
  analyses: [],
  files: [],
  setSelectedRepo: (repo) => set({ selectedRepo: repo }),
  setAnalyses: (analyses) => set({ analyses }),
  setFiles: (files) => set({ files }),
}));