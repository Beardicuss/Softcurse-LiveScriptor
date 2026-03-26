import React, { useEffect, useRef, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useIdeStore } from '@/hooks/use-ide-store';
import { useGetFileContent, useSaveFileContent } from '@workspace/api-client-react';
import { Code2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const FILE_LANG: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  css: 'css', scss: 'css', html: 'html', json: 'json', md: 'markdown',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', sh: 'shell',
  yaml: 'yaml', yml: 'yaml', xml: 'xml',
};

function getLanguage(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return FILE_LANG[ext] ?? 'plaintext';
}

export function EditorPane({ projectId }: { projectId: string }) {
  const { openFiles, activeTab, closeFile, updateFileContent, openFile, markFileClean, settings } = useIdeStore();
  const queryClient = useQueryClient();
  const saveMutation = useSaveFileContent();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFileObj = openFiles.find(f => f.path === activeTab);

  const { data: fileData, isLoading } = useGetFileContent(
    projectId,
    { path: activeTab || '' },
    { query: { enabled: !!activeTab && activeTab !== 'LIVE_PREVIEW' && !activeFileObj, retry: false, queryKey: [] } as any }
  );

  useEffect(() => {
    if (fileData && !activeFileObj && activeTab === fileData.path) {
      openFile(fileData.path, fileData.content);
    }
  }, [fileData, activeFileObj, activeTab, openFile]);

  const doSave = useCallback((fileObj: typeof activeFileObj) => {
    if (!fileObj || !fileObj.isDirty) return;
    saveMutation.mutate(
      { projectId, data: { path: fileObj.path, content: fileObj.content } },
      {
        onSuccess: () => {
          markFileClean(fileObj.path);
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files/content`] });
        }
      }
    );
  }, [saveMutation, projectId, markFileClean, queryClient]);

  const handleEditorChange = (value: string | undefined) => {
    if (!activeTab || value === undefined) return;
    updateFileContent(activeTab, value);

    if (settings.autoSave) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        const current = useIdeStore.getState().openFiles.find(f => f.path === activeTab);
        doSave(current);
      }, 1500);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        doSave(useIdeStore.getState().openFiles.find(f => f.path === activeTab));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, doSave]);

  const monaco = useMonaco();
  useEffect(() => {
    if (!monaco) return;
    monaco.editor.defineTheme('cyberpunk', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '00a884', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff00ff', fontStyle: 'bold' },
        { token: 'string', foreground: 'ff6b35' },
        { token: 'number', foreground: '0088ff' },
        { token: 'type', foreground: '00ffff' },
      ],
      colors: {
        'editor.background': '#03060d',
        'editor.foreground': '#00ffff',
        'editorLineNumber.foreground': '#005577',
        'editorLineNumber.activeForeground': '#00ffff',
        'editor.selectionBackground': '#0088ff40',
        'editorCursor.foreground': '#ff00ff',
        'editor.lineHighlightBackground': '#00ffff0a',
      }
    });
    monaco.editor.setTheme('cyberpunk');
  }, [monaco]);

  if (activeTab === 'LIVE_PREVIEW') return null;

  return (
    <div className="h-full flex flex-col font-mono text-sm relative">
      <div className="flex bg-card/80 border-b border-primary/20 overflow-x-auto cyber-scrollbar select-none shrink-0 h-10">
        {openFiles.map(f => (
          <div
            key={f.path}
            className={`flex items-center gap-2 px-4 border-r border-primary/20 cursor-pointer transition-colors whitespace-nowrap ${activeTab === f.path ? 'bg-primary/10 text-primary border-b-2 border-b-primary' : 'text-muted-foreground hover:bg-background'}`}
            onClick={() => useIdeStore.getState().setActiveTab(f.path)}
          >
            <Code2 className="w-3.5 h-3.5 shrink-0" />
            <span>{f.path.split('/').pop()}</span>
            {f.isDirty && <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_5px_rgba(255,107,53,0.8)] shrink-0" />}
            <button
              className="ml-1 p-0.5 rounded-sm hover:bg-primary/20 hover:text-primary transition-colors shrink-0"
              onClick={(e) => { e.stopPropagation(); closeFile(f.path); }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {isLoading && <div className="px-4 flex items-center text-muted-foreground animate-pulse text-xs">Loading...</div>}
      </div>

      <div className="flex-1 relative bg-[#03060d]">
        {activeFileObj ? (
          <Editor
            height="100%"
            language={getLanguage(activeFileObj.path)}
            value={activeFileObj.content}
            onChange={handleEditorChange}
            theme="cyberpunk"
            options={{
              fontFamily: '"Space Mono", monospace',
              fontSize: settings.fontSize,
              tabSize: settings.tabSize,
              wordWrap: settings.wordWrap,
              lineNumbers: settings.lineNumbers,
              minimap: { enabled: settings.minimap },
              padding: { top: 16, bottom: 16 },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorWidth: 3,
              scrollBeyondLastLine: false,
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-4">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} className="w-24 h-24 opacity-20 grayscale" alt="Logo empty" />
            <p className="tracking-wider text-sm">SELECT A FILE TO INITIATE HACK SEQUENCE</p>
            <p className="text-xs opacity-50">Ctrl+P to quick-open a file</p>
          </div>
        )}
      </div>
    </div>
  );
}
