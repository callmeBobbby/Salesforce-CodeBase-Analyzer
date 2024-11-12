import React from 'react';
import { AlertCircle, Search } from 'lucide-react';

export interface Issue {
    severity: 'high' | 'medium' | 'low';
    file: string;
    description: string;
    suggestion: string;
}

export interface CodeReview {
    issues: Issue[];
}

export interface Component {
    name: string;
    purpose: string;
}

export interface CodeExplanation {
    summary: string;
    keyComponents: Component[];
}

export interface DetectedIssue {
    priority: 'high' | 'medium' | 'low';
    type: string;
    description: string;
    solution: string;
}

export interface AnalysisProps {
    analysis: {
        codeReview: CodeReview;
        codeExplanation: CodeExplanation;
        issues: DetectedIssue[];
    };
}

export const AnalysisDetails = ({ analysis }: AnalysisProps) => {
    if (!analysis) {
        return <div>No analysis available</div>;
    }
    return (
        <div className="space-y-6 overflow-auto max-h-[800px] p-4">
            <section className="bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 p-4">Full Analysis</h2>
                <div className="space-y-4 p-4">
                    {analysis.codeExplanation.summary && (
                        <div className="p-4 rounded-lg bg-blue-50">
                            <h3 className="font-medium mb-2">Overview</h3>
                            <div className="prose prose-sm max-w-none">
                                <pre className="whitespace-pre-wrap text-sm text-gray-600">
                                    {analysis.codeExplanation.summary}
                                </pre>
                            </div>
                        </div>
                    )}
                    {/* not showing other files analysis below Overview summary */}
                    {/* {analysis.codeReview.issues.map((issue: Issue, index) => (
                        <div key={index} className="p-4 rounded-lg bg-gray-50">
                            <h3 className="font-medium mb-2">{issue.file}</h3>
                            <pre className="whitespace-pre-wrap text-sm text-gray-600">
                                {issue.description}
                            </pre>
                        </div>
                    ))} */}
                </div>
            </section>
        </div>
    );
};




