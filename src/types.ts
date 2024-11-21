export interface Repository {
  id: string;
  name: string;
  description: string;
  stars: number;
  language: string;
  lastUpdated: string;
  hasApex: boolean;
  hasLWC: boolean;
}

export interface CodeAnalysis {
  type: 'quality' | 'security' | 'performance' | 'salesforce-best-practices';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  lineNumber?: number;
  fileType: 'apex' | 'lwc' | 'aura' | 'other';
  category?: 'SOQL' | 'DML' | 'Trigger' | 'Component' | 'Controller' | 'Helper';
}

export interface SalesforceFile {
  name: string;
  path: string;
  type: 'apex' | 'lwc' | 'aura' | 'other';
  content: string;
}

export interface GithubAuthState {
  isAuthenticated: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export interface AnalysisStore {
  selectedRepo: Repository | null;
  analyses: CodeAnalysis[];
  files: SalesforceFile[];
  setSelectedRepo: (repo: Repository | null) => void;
  setAnalyses: (analyses: CodeAnalysis[]) => void;
  setFiles: (files: SalesforceFile[]) => void;
}