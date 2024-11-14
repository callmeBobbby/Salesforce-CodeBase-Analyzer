import { useLocation } from "react-router-dom";
import { AnalysisDetails, CodeExplanation, CodeReview, DetectedIssue } from "./AnalysisDetails";
import { FileExplorer } from "./FileExplorer";
import { FileViewerWithAnalysis } from "./FileViewerWithAnalysis";
import { Header } from "./Header";
import { useState } from "react";
import { Analysis } from "./AnalysisResults";
import useAuthStore from "../store/authStore";


interface FileNode {
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileNode[];
}

export const AnalysisView = () => {


    const location = useLocation(); // You'll need to import useLocation from 'react-router-dom'
    const [analysis, setAnalysis] = useState(location.state?.analysis);
    const { isAuthenticated, token, logout } = useAuthStore();
    const [selectedAnalysis, setSelectedAnalysis] = useState<{
        results: Analysis[];
        files: FileNode[];
        codeReview: CodeReview;
        codeExplanation: CodeExplanation;
        issues: DetectedIssue[];
    } | null>(null);
    const [selectedFile, setSelectedFile] = useState<{ name: string; content: string; analysis: string } | null>(null);



    const handleFileSelect = async (file: { name: string; path: string }) => {
        try {
            const response = await fetch('http://localhost:5000/api/file-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `token ${token}`,
                },
                body: JSON.stringify({ path: file.path })
            });

            if (!response.ok) {
                throw new Error(`Error fetching file content: ${response.statusText}`);
            }

            const data = await response.json();

            // Find the matching analysis from selectedAnalysis.codeReview.issues
            const fileAnalysis = selectedAnalysis?.codeReview.issues.find(
                issue => issue.file === file.name
            );

            setSelectedFile({
                name: file.name,
                content: data.content,
                analysis: fileAnalysis?.description || 'No analysis available for this file'
            });
        } catch (error) {
            console.error("Error fetching file content:", error);
        }
    };

    const handleContentUpdate = async (fileName: string, newContent: string) => {
        // Here you could add logic to save the updated content
        console.log(`Updating content for ${fileName}`);
        // You might want to add an API endpoint to save the changes
    };

    const handleCustomAnalysis = async (fileName: string, prompt: string) => {
        try {
            const fileContent = selectedFile?.content || '';
            const response = await fetch('http://localhost:5000/api/analyze/custom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `token ${token}`,
                },
                body: JSON.stringify({
                    fileName,
                    content: fileContent,
                    prompt
                })
            });

            if (!response.ok) {
                throw new Error('Custom analysis failed');
            }

            const data = await response.json();
            return data.analysis;
        } catch (error) {
            console.error('Custom analysis error:', error);
            return null;
        }
    };


    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* File Explorer */}
                    <div className="md:col-span-1 bg-white rounded-lg shadow">
                        <FileExplorer
                            files={analysis?.files || []}
                            onFileSelect={handleFileSelect}
                        />
                    </div>

                    {/* File Viewer */}
                    <div className="md:col-span-1 bg-white rounded-lg shadow">
                        {selectedFile && (
                            <FileViewerWithAnalysis
                                files={[selectedFile]}
                                onContentUpdate={handleContentUpdate}
                                onCustomAnalysis={handleCustomAnalysis}
                            />
                        )}
                    </div>

                    {/* Analysis Details */}
                    <div className="md:col-span-1 bg-white rounded-lg shadow">
                        <AnalysisDetails analysis={analysis} />
                    </div>
                </div>
            </main>
        </div>
    );
};