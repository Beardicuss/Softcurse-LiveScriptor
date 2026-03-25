import React, { useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useIdeStore } from '@/hooks/use-ide-store';
import { useGetFileContent, useSaveFileContent } from '@workspace/api-client-react';
import { Code2, X, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function EditorPane({ projectId }: { projectId: string }) {
  const { openFiles, activeTab, closeFile, updateFileContent, openFile, markFileClean, settings } = useIdeStore();
  const queryClient = useQueryClient();
  const saveMutation = useSaveFileContent();

  const activeFileObj = openFiles.find(f => f.path === activeTab);
  
  // Fetch file content if active tab is a file and not yet loaded in store
  const { data: fileData, isLoading } = useGetFileContent(
    projectId, 
    { path: activeTab || '' }, 
    { query: { enabled: !!activeTab && activeTab !== 'LIVE_PREVIEW' && !activeFileObj, retry: false } }
  );

  useEffect(() => {
    if (fileData && !activeFileObj && activeTab === fileData.path) {
      openFile(fileData.path, fileData.content);
    }
  }, [fileData, activeFileObj, activeTab, openFile]);

  const handleEditorChange = (value: string | undefined) => {
    if (activeTab && value !== undefined) {
      updateFileContent(activeTab, value);
    }
  };

  const handleSave = () => {
    if (activeFileObj && activeFileObj.isDirty) {
      saveMutation.mutate({ projectId, data: { path: activeFileObj.path, content: activeFileObj.content } }, {
        onSuccess: () => {
          markFileClean(activeFileObj.path);
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files/content`] });
        }
      });
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileObj, handleSave]);

  const getLanguage = (path: string) => {
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    return 'plaintext';
  };

  const monaco = useMonaco();
  useEffect(() => {
    if (monaco) {
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
    }
  }, [monaco]);

  if (activeTab === 'LIVE_PREVIEW') {
    return null; // Handled by IDE.tsx routing the active tab to LivePreview component
  }

  return (
    <div className="h-full flex flex-col font-mono text-sm relative">
      <div className="flex bg-card/80 border-b border-primary/20 overflow-x-auto cyber-scrollbar select-none shrink-0 h-10">
        {openFiles.map(f => (
          <div 
            key={f.path} 
            className={`flex items-center gap-2 px-4 border-r border-primary/20 cursor-pointer transition-colors ${activeTab === f.path ? 'bg-primary/10 text-primary border-b-2 border-b-primary neon-text-primary' : 'text-muted-foreground hover:bg-background'}`}
            onClick={() => useIdeStore.getState().setActiveTab(f.path)}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>{f.path.split('/').pop()}</span>
            {f.isDirty && <div className="w-2 h-2 rounded-full bg-destructive shadow-[0_0_5px_rgba(255,107,53,0.8)]" />}
            <button 
              className="ml-2 p-0.5 rounded-sm hover:bg-primary/20 hover:text-primary transition-colors"
              onClick={(e) => { e.stopPropagation(); closeFile(f.path); }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
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
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-4">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} className="w-24 h-24 opacity-20 grayscale" alt="Logo empty" />
            <p>SELECT A FILE TO INITIATE HACK SEQUENCE</p>
          </div>
        )}
      </div>
    </div>
  );
}
