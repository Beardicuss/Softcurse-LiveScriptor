import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, Plus, FolderPlus, RefreshCw,
  Trash2, Edit2, FolderOpen, Folder, ChevronsUp,
  FileText, FileCode, FileImage, FileJson, Globe,
} from 'lucide-react';
import { useListFiles, useCreateFile, useDeleteFile, useRenameFile, type FileNode } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useIdeStore } from '@/hooks/use-ide-store';
import { CyberInput } from '@/components/ui/cyber-components';

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const iconClass = 'w-3.5 h-3.5 shrink-0';
  if (['html', 'htm'].includes(ext)) return <Globe className={`${iconClass} text-orange-400`} />;
  if (['js', 'jsx', 'mjs'].includes(ext)) return <FileCode className={`${iconClass} text-yellow-400`} />;
  if (['ts', 'tsx'].includes(ext)) return <FileCode className={`${iconClass} text-blue-400`} />;
  if (['css', 'scss', 'sass', 'less'].includes(ext)) return <FileCode className={`${iconClass} text-purple-400`} />;
  if (['json'].includes(ext)) return <FileJson className={`${iconClass} text-yellow-600`} />;
  if (['md', 'mdx'].includes(ext)) return <FileText className={`${iconClass} text-gray-400`} />;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return <FileImage className={`${iconClass} text-pink-400`} />;
  if (['py'].includes(ext)) return <FileCode className={`${iconClass} text-green-400`} />;
  if (['go', 'rs', 'rb', 'php'].includes(ext)) return <FileCode className={`${iconClass} text-cyan-400`} />;
  return <FileText className={`${iconClass} text-muted-foreground`} />;
}

interface ContextMenu {
  x: number;
  y: number;
  node: FileNode;
}

export function FileExplorer({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const { data: files, isLoading, refetch } = useListFiles(projectId);
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newName, setNewName] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renaming, setRenaming] = useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [collapseSignal, setCollapseSignal] = useState(0);
  const createMutation = useCreateFile();
  const deleteMutation = useDeleteFile();
  const renameMutation = useRenameFile();

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });

  const handleCreate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newName) {
      const isFolder = isCreating === 'folder';
      const path = `/${newName}`;
      createMutation.mutate(
        { projectId, data: { path, type: isFolder ? 'directory' : 'file', content: '' } },
        { onSuccess: () => { setIsCreating(null); setNewName(''); invalidate(); } }
      );
    } else if (e.key === 'Escape') {
      setIsCreating(null);
      setNewName('');
    }
  };

  const handleDelete = (node: FileNode) => {
    setContextMenu(null);
    if (!confirm(`Delete "${node.name}"?`)) return;
    deleteMutation.mutate({ projectId, data: { path: node.path } }, { onSuccess: invalidate });
  };

  const startRename = (node: FileNode) => {
    setContextMenu(null);
    setRenaming(node);
    setRenameValue(node.name);
  };

  const handleRename = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && renaming && renameValue && renameValue !== renaming.name) {
      const dir = renaming.path.substring(0, renaming.path.lastIndexOf('/'));
      const newPath = `${dir}/${renameValue}`;
      renameMutation.mutate(
        { projectId, data: { oldPath: renaming.path, newPath } },
        { onSuccess: () => { setRenaming(null); invalidate(); } }
      );
    } else if (e.key === 'Escape') {
      setRenaming(null);
    }
  };

  return (
    <div
      className="h-full flex flex-col font-mono text-sm"
      onContextMenu={e => { e.preventDefault(); setContextMenu(null); }}
    >
      <div className="p-3 border-b border-primary/20 flex items-center justify-between text-primary bg-background/50 shrink-0">
        <span className="font-bold tracking-wider">EXPLORER</span>
        <div className="flex gap-1">
          <button onClick={() => setIsCreating('file')} className="p-1 hover:text-secondary transition-colors" title="New File">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsCreating('folder')} className="p-1 hover:text-secondary transition-colors" title="New Folder">
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => refetch()} className="p-1 hover:text-secondary transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setCollapseSignal(s => s + 1)} className="p-1 hover:text-secondary transition-colors" title="Collapse All">
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto cyber-scrollbar p-2">
        {isLoading && <div className="text-muted-foreground p-2 animate-pulse text-xs">Scanning system...</div>}

        {isCreating && (
          <div className="mb-2 px-2">
            <CyberInput
              autoFocus
              placeholder={isCreating === 'folder' ? 'folder-name' : 'filename.ext'}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleCreate}
              className="!py-1 !text-xs !bg-background"
            />
          </div>
        )}

        {files && (
          <FileTree
            nodes={files}
            projectId={projectId}
            level={0}
            onContextMenu={(e, node) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ x: e.clientX, y: e.clientY, node });
            }}
            renaming={renaming}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            handleRename={handleRename}
            collapseSignal={collapseSignal}
          />
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-primary/30 shadow-[0_0_20px_rgba(0,255,255,0.1)] py-1 min-w-[140px] font-mono text-xs"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-primary/10 hover:text-primary flex items-center gap-2 transition-colors"
            onClick={() => startRename(contextMenu.node)}
          >
            <Edit2 className="w-3 h-3" /> Rename
          </button>
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 hover:text-destructive flex items-center gap-2 transition-colors"
            onClick={() => handleDelete(contextMenu.node)}
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function FileTree({
  nodes, projectId, level, onContextMenu, renaming, renameValue, setRenameValue, handleRename, collapseSignal,
}: {
  nodes: FileNode[];
  projectId: string;
  level: number;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  renaming: FileNode | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  handleRename: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  collapseSignal: number;
}) {
  const { setActiveTab, activeTab } = useIdeStore();

  return (
    <div className="flex flex-col">
      {nodes.map(node => (
        <div key={node.path}>
          {node.type === 'directory' ? (
            <FolderNode
              node={node}
              projectId={projectId}
              level={level}
              onContextMenu={onContextMenu}
              renaming={renaming}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              handleRename={handleRename}
              collapseSignal={collapseSignal}
            />
          ) : renaming?.path === node.path ? (
            <div className="px-2" style={{ paddingLeft: `${level * 12 + 8}px` }}>
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={handleRename}
                className="w-full bg-background border border-primary/40 px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
          ) : (
            <div
              className={`flex items-center justify-between py-1 px-2 cursor-pointer group transition-colors ${activeTab === node.path ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-primary/5 hover:text-primary'}`}
              style={{ paddingLeft: `${level * 12 + 8}px` }}
              onClick={() => setActiveTab(node.path)}
              onContextMenu={e => onContextMenu(e, node)}
            >
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                {getFileIcon(node.name)}
                <span className="truncate text-xs">{node.name}</span>
              </div>
              <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                <button
                  className="p-0.5 hover:text-destructive transition-colors"
                  onClick={e => { e.stopPropagation(); onContextMenu(e as any, node); }}
                  title="More actions"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FolderNode({ node, projectId, level, onContextMenu, renaming, renameValue, setRenameValue, handleRename, collapseSignal }: {
  node: FileNode;
  projectId: string;
  level: number;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  renaming: FileNode | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  handleRename: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  collapseSignal: number;
}) {
  const [isOpen, setIsOpen] = useState(level === 0);

  useEffect(() => {
    if (collapseSignal > 0) setIsOpen(false);
  }, [collapseSignal]);

  return (
    <div>
      {renaming?.path === node.path ? (
        <div className="px-2" style={{ paddingLeft: `${level * 12 + 4}px` }}>
          <input
            autoFocus
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={handleRename}
            className="w-full bg-background border border-primary/40 px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-primary"
          />
        </div>
      ) : (
        <div
          className="flex items-center gap-1 py-1 px-2 hover:bg-primary/5 cursor-pointer text-foreground/90 hover:text-primary transition-colors"
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onClick={() => setIsOpen(!isOpen)}
          onContextMenu={e => onContextMenu(e, node)}
        >
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
          {isOpen ? <FolderOpen className="w-3.5 h-3.5 text-accent shrink-0" /> : <Folder className="w-3.5 h-3.5 text-accent shrink-0" />}
          <span className="truncate text-xs">{node.name}</span>
        </div>
      )}
      {isOpen && node.children && (
        <FileTree
          nodes={node.children}
          projectId={projectId}
          level={level + 1}
          onContextMenu={onContextMenu}
          renaming={renaming}
          renameValue={renameValue}
          setRenameValue={setRenameValue}
          handleRename={handleRename}
          collapseSignal={collapseSignal}
        />
      )}
    </div>
  );
}
