import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileText, X } from 'lucide-react';
import { useIdeStore } from '@/hooks/use-ide-store';
import { useListFiles } from '@workspace/api-client-react';

function flattenFiles(nodes: any[], prefix = ''): { path: string; name: string }[] {
  const result: { path: string; name: string }[] = [];
  for (const node of nodes ?? []) {
    if (node.type === 'file') {
      result.push({ path: node.path, name: node.name });
    } else if (node.children) {
      result.push(...flattenFiles(node.children, node.path));
    }
  }
  return result;
}

export function CommandPalette({ projectId }: { projectId: string }) {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveTab } = useIdeStore();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: files } = useListFiles(projectId, { query: { enabled: commandPaletteOpen } });
  const allFiles = useMemo(() => flattenFiles(files ?? []), [files]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allFiles;
    const q = query.toLowerCase();
    return allFiles.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
  }, [allFiles, query]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const openFile = (path: string) => {
    setActiveTab(path);
    setCommandPaletteOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setCommandPaletteOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) { openFile(filtered[selectedIdx].path); }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-card border border-primary/40 shadow-[0_0_40px_rgba(0,255,255,0.2)] font-mono overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/20">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Go to file..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="text-muted-foreground hover:text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto cyber-scrollbar">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">No files found</div>
          )}
          {filtered.map((file, i) => (
            <div
              key={file.path}
              onClick={() => openFile(file.path)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${i === selectedIdx ? 'bg-primary/15 text-primary' : 'hover:bg-primary/10 text-foreground/80'}`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground ml-auto truncate">{file.path}</span>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-primary/10 text-xs text-muted-foreground flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
