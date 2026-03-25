import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileIcon, FolderIcon, Plus, Trash2, Edit2, RefreshCw } from 'lucide-react';
import { useListFiles, useCreateFile, useDeleteFile, type FileNode } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useIdeStore } from '@/hooks/use-ide-store';
import { CyberInput } from '@/components/ui/cyber-components';

export function FileExplorer({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const { data: files, isLoading, refetch } = useListFiles(projectId);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const createMutation = useCreateFile();

  const handleCreate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newFileName) {
      createMutation.mutate({ 
        projectId, 
        data: { path: `/${newFileName}`, type: newFileName.includes('.') ? 'file' : 'directory', content: '' } 
      }, {
        onSuccess: () => {
          setIsCreating(false);
          setNewFileName('');
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
        }
      });
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewFileName('');
    }
  };

  return (
    <div className="h-full flex flex-col font-mono text-sm">
      <div className="p-3 border-b border-primary/20 flex items-center justify-between text-primary bg-background/50">
        <span className="font-bold tracking-wider">EXPLORER</span>
        <div className="flex gap-2">
          <button onClick={() => setIsCreating(true)} className="hover:text-secondary transition-colors" title="New File/Folder">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => refetch()} className="hover:text-secondary transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto cyber-scrollbar p-2">
        {isLoading && <div className="text-muted-foreground p-2 animate-pulse">Scanning system...</div>}
        
        {isCreating && (
          <div className="mb-2 px-2">
            <CyberInput 
              autoFocus
              placeholder="filename.ext" 
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={handleCreate}
              className="!py-1 !text-xs !bg-background"
            />
          </div>
        )}

        {files && <FileTree nodes={files} projectId={projectId} level={0} />}
      </div>
    </div>
  );
}

function FileTree({ nodes, projectId, level }: { nodes: FileNode[], projectId: string, level: number }) {
  const setActiveTab = useIdeStore(s => s.setActiveTab);

  return (
    <div className="flex flex-col">
      {nodes.map(node => (
        <div key={node.path}>
          {node.type === 'directory' ? (
            <FolderNode node={node} projectId={projectId} level={level} />
          ) : (
            <div
              className="flex items-center justify-between py-1.5 px-2 hover:bg-primary/10 cursor-pointer group transition-colors text-foreground/80 hover:text-primary"
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={() => setActiveTab(node.path)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                <span className="truncate">{node.name}</span>
              </div>
              {/* Could add delete/rename icons here on group-hover */}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FolderNode({ node, projectId, level }: { node: FileNode, projectId: string, level: number }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1.5 px-2 hover:bg-primary/10 cursor-pointer text-foreground/90 hover:text-primary transition-colors"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <FolderIcon className="w-3.5 h-3.5 text-accent" />
        <span className="truncate">{node.name}</span>
      </div>
      {isOpen && node.children && (
        <FileTree nodes={node.children} projectId={projectId} level={level + 1} />
      )}
    </div>
  );
}
