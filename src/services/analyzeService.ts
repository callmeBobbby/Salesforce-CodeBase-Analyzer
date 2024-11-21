interface AnalysisResult {
  codeReview: {
    issues: Array<{
      severity: 'high' | 'medium' | 'low';
      description: string;
      suggestion: string;
      file: string;
      line: number;
    }>;
    suggestions: string[];
  };
  codeExplanation: {
    summary: string;
    keyComponents: Array<{
      name: string;
      purpose: string;
      relationships: string[];
    }>;
  };
  issues: Array<{
    type: string;
    description: string;
    solution: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export const analyzeRepository = async (repoFullName: string, token: string): Promise<AnalysisResult> => {
  try {
    const response = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        repoName: repoFullName
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Analysis failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
};

export const searchCode = async (repoName: string, query: string, token: string) => {
  try {
    const response = await fetch(`http://localhost:5000/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        repoName,
        query,
        token
      })
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }
    return response.json();
  } catch (error) {
    console.error('Error during code search:', error);
    throw error;
  }
};
