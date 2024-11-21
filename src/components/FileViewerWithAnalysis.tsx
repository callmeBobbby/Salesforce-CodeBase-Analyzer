import React, { useState, useEffect } from 'react';

interface FileViewerWithAnalysisProps {
    files: { name: string; content: string; analysis: string }[];
    onContentUpdate?: (fileName: string, newContent: string) => void;
    onCustomAnalysis: (fileName: string, prompt: string) => Promise<any>;
}

export const FileViewerWithAnalysis: React.FC<FileViewerWithAnalysisProps> = ({
    files,
    onContentUpdate,
    onCustomAnalysis
}) => {
    const [selectedFile, setSelectedFile] = useState(files[0]);
    const [isEditing, setIsEditing] = useState(false);
    const [editableContent, setEditableContent] = useState(selectedFile?.content || '');
    const [customPrompt, setCustomPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (files && files.length > 0) {
            setSelectedFile(files[0]);
            setEditableContent(files[0].content);
        }
    }, [files]);

    const handleCustomAnalysis = async (e: React.KeyboardEvent | React.MouseEvent) => {
        if (customPrompt.trim() === '') return;

        setIsLoading(true);

        try {
            const result = await onCustomAnalysis(selectedFile.name, customPrompt);
            if (result) {
                setSelectedFile(prev => ({
                    ...prev!,
                    analysis: result.analysis || result // handle both result formats
                }));
                setCustomPrompt(''); // Clear input after successful analysis
            }
        } catch (error) {
            console.error('Error during custom analysis:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const handleContentUpdate = () => {
        if (onContentUpdate && selectedFile) {
            onContentUpdate(selectedFile.name, editableContent);
        }
        setIsEditing(false);
    };

    // Add new function to handle insert
    const handleInsertAnalysis = () => {
        if (!selectedFile?.analysis) return;

        // Extract only the code blocks from analysis
        const codeRegex = /```[\s\S]*?```/g;
        const matches = selectedFile.analysis.match(codeRegex);

        if (matches) {
            // Clean the code block by removing ``` markers
            const cleanCode = matches[0].replace(/```(?:javascript|apex|java)?\n?/g, '').replace(/```/g, '').trim();

            if (isEditing) {
                // If in edit mode, insert at cursor position
                const textarea = document.querySelector('textarea');
                const cursorPosition = textarea?.selectionStart || 0;
                const newContent = editableContent.slice(0, cursorPosition) +
                    cleanCode +
                    editableContent.slice(cursorPosition);
                setEditableContent(newContent);
            } else {
                // If not in edit mode, switch to edit mode and append
                setIsEditing(true);
                setEditableContent(prev => prev + '\n' + cleanCode);
            }
        }
    };

    // Modify the Insert button to use the new function
    <button
        onClick={handleInsertAnalysis}
        className="flex items-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        disabled={!selectedFile?.analysis}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            className="h-5 w-5 mr-2 fill-current text-white"
        >
            <path d="M352 96l64 0c17.7 0 32 14.3 32 32l0 256c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0c53 0 96-43 96-96l0-256c0-53-43-96-96-96l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32zm-9.4 182.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L242.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z" />
        </svg>
        Insert
    </button>


    const handleClearPrompt = () => {
        setCustomPrompt('');
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
                            <h4 className="text-lg font-semibold mr-4">Analysis</h4>
                            <div className="relative w-full max-w-md mx-auto">
                                <input
                                    type="text"
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCustomAnalysis(e);
                                        }
                                    }}
                                    placeholder="Enter prompt...."
                                    className="w-full px-12 py-2 border rounded text-sm"
                                />
                                {/* Search Icon */}
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 text-gray-400 hover:text-gray-500 cursor-pointer"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        onClick={(e) => handleCustomAnalysis(e)}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                </div>

                                {/* Cross Icon */}
                                {customPrompt && (
                                    <div
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer"
                                        onClick={handleClearPrompt}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4 text-gray-400 hover:text-gray-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleInsertAnalysis}
                                className="flex items-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                disabled={!selectedFile?.analysis}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 512 512"
                                    className="h-5 w-5 mr-2 fill-current text-white"
                                >
                                    <path d="M352 96l64 0c17.7 0 32 14.3 32 32l0 256c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0c53 0 96-43 96-96l0-256c0-53-43-96-96-96l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32zm-9.4 182.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L242.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z" />
                                </svg>
                                Insert
                            </button>
                        </div>


                        {isLoading ? (
                            <div className="flex justify-center items-center h-[400px]">
                                <div className="relative">
                                    <div className="w-12 h-12 border-4 border-indigo-200 rounded-full animate-spin">
                                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
                                    </div>
                                    <div className="mt-4 text-center text-sm text-gray-600">
                                        Analyzing...
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <pre className="bg-white p-4 rounded border overflow-auto whitespace-pre-wrap h-[400px]">
                                {selectedFile?.analysis || 'Analysis not available'}
                            </pre>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
