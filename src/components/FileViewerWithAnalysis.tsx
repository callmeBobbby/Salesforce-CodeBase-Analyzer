import React, { useState, useEffect } from 'react';

interface FileViewerWithAnalysisProps {
    files: { name: string; content: string; analysis: string }[];
    onContentUpdate?: (fileName: string, newContent: string) => void;
}

export const FileViewerWithAnalysis: React.FC<FileViewerWithAnalysisProps> = ({
    files,
    onContentUpdate
}) => {
    const [selectedFile, setSelectedFile] = useState(files[0]);
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState(selectedFile?.content || '');

    useEffect(() => {
        if (files && files.length > 0) {
            setSelectedFile(files[0]);
            setEditableContent(files[0].content);
        }
    }, [files]);

    const handleContentUpdate = () => {
        if (onContentUpdate && selectedFile) {
            onContentUpdate(selectedFile.name, editableContent);
        }
        setIsEditing(false);
    };

    const handleApplyAnalysis = () => {
        if (selectedFile?.analysis) {
            setEditableContent(selectedFile.analysis);
        }
    };

    if (!selectedFile) {
        return <div>No file selected</div>;
    }

    return (
        <div className="flex h-full">
            <div className="w-full p-4 space-y-4">
                <div className="flex flex-col h-full">
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-lg font-semibold">Code</h4>
                            <div className="space-x-2">
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="px-2 py-1 text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    {isEditing ? 'View' : 'Edit'}
                                </button>
                                {isEditing && (
                                    <button
                                        onClick={handleContentUpdate}
                                        className="px-2 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                    >
                                        Save
                                    </button>
                                )}
                            </div>
                        </div>
                        {isEditing ? (
                            <textarea
                                aria-label="File content editor"
                                value={editableContent}
                                onChange={(e) => setEditableContent(e.target.value)}
                                className="w-full h-[400px] p-4 font-mono bg-white rounded border resize-none"
                            />
                        ) : (
                            <pre className="bg-white p-4 rounded border overflow-auto whitespace-pre-wrap h-[400px]">
                                {editableContent || 'No content available'}
                            </pre>
                        )}
                    </div>

                    <div className="flex-1 mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-lg font-semibold">Analysis</h4>
                            <button
                                onClick={handleApplyAnalysis}
                                className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Apply Suggestions
                            </button>
                        </div>
                        <pre className="bg-white p-4 rounded border overflow-auto whitespace-pre-wrap h-[400px]">
                            {selectedFile?.analysis || 'Analysis not available'}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};
