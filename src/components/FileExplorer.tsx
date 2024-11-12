import React from 'react';
import { File, Folder } from 'lucide-react';
import axios from 'axios';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (file: { name: string; path: string }) => void; // Updated to pass path
}

export const FileExplorer = ({ files, onFileSelect }: FileExplorerProps) => {
  const handleFileClick = async (file: FileNode) => {
    if (file.type === 'file') {
      // Call onFileSelect with name and path
      onFileSelect({ name: file.name, path: file.path });
    }
  };

  const renderNode = (node: FileNode) => (
    <div key={node.name} className="pl-4">
      <div className="flex items-center py-2 cursor-pointer" onClick={() => handleFileClick(node)}>
        {node.type === 'folder' ? (
          <Folder className="h-4 w-4 text-gray-400" />
        ) : (
          <File className="h-4 w-4 text-gray-400" />
        )}
        <span className="ml-2 text-sm text-gray-700">{node.name}</span>
      </div>
      {node.children && (
        <div className="pl-4">
          {node.children.map((child) => renderNode(child))}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Files</h3>
      {files.map((file) => renderNode(file))}
    </div>
  );
};