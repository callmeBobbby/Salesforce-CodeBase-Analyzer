import React, { useState, useEffect } from 'react';

interface FileViewerWithAnalysisProps {
    files: { name: string; content: string; analysis: string }[];
}

export const FileViewerWithAnalysis: React.FC<FileViewerWithAnalysisProps> = ({ files }) => {
    const [selectedFile, setSelectedFile] = useState(files[0]);

    useEffect(() => {
        if (files && files.length > 0) {
            setSelectedFile(files[0]);
        }
    }, [files]);

    if (!selectedFile) {
        return <div>No file selected</div>;
    }

    return (
        <div className="flex h-full">
            <div className="w-full p-4 space-y-4">
                <div className="flex flex-col h-full">
                    <div className="flex-1">
                        <h4 className="text-lg font-semibold mb-2">Code</h4>
                        <pre className="bg-white p-4 rounded border overflow-auto whitespace-pre-wrap h-[400px]">
                            {selectedFile?.content || 'No content available'}
                        </pre>
                    </div>

                    <div className="flex-1 mt-4">
                        <h4 className="text-lg font-semibold mb-2">Analysis</h4>
                        <pre className="bg-white p-4 rounded border overflow-auto whitespace-pre-wrap h-[400px]">
                            {selectedFile?.analysis || 'Analysis not available'}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};
