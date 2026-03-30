import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Send, Sparkles, FileText, FolderOpen, Search, Terminal, Pencil, Trash2, Package } from 'lucide-react';
import { useAiChat, type ChatMessage } from '@workspace/api-client-react';
import { useIdeStore } from '@/hooks/use-ide-store';
import { useQueryClient } from '@tanstack/react-query';

/** Icon map for tool activity indicators */
const TOOL_ICONS: Record<string, React.ReactNode> = {
  get_file_content: <FileText className="w-3 h-3" />,
  list_directory: <FolderOpen className="w-3 h-3" />,
  get_project_structure: <FolderOpen className="w-3 h-3" />,
  search_in_files: <Search className="w-3 h-3" />,
  write_file: <Pencil className="w-3 h-3" />,
  create_file: <Pencil className="w-3 h-3" />,
  delete_file: <Trash2 className="w-3 h-3" />,
  run_command: <Terminal className="w-3 h-3" />,
  install_package: <Package className="w-3 h-3" />,
};

const TOOL_LABELS: Record<string, string> = {
  get_file_content: "Reading",
  list_directory: "Listing",
  get_project_structure: "Scanning project",
  search_in_files: "Searching",
  write_file: "Writing",
  create_file: "Creating",
  delete_file: "Deleting",
  run_command: "Running",
  install_package: "Installing",
};

interface ToolActivity {
  tool: string;
  args: Record<string, any>;
  result: string;
}

interface AiResponse {
  message: string;
  toolActivity?: ToolActivity[];
  modifiedFiles?: string[];
}

export function AiPanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'AI ASSISTANT ONLINE. I can read, edit, and run your code. Ask me anything!' }
  ]);
  const [toolLog, setToolLog] = useState<ToolActivity[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const chatMutation = useAiChat();
  const { openFiles, activeTab } = useIdeStore();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolLog]);

  /** Gather current editor context to send with the prompt */
  function getEditorContext() {
    const activeFileObj = openFiles.find(f => f.path === activeTab);

    // Try to get Monaco diagnostics
    let diagnostics: any[] = [];
    try {
      const monaco = (window as any).monaco;
      if (monaco && activeTab) {
        const models = monaco.editor.getModels();
        const model = models.find((m: any) => m.uri.path.endsWith(activeTab));
        if (model) {
          diagnostics = monaco.editor.getModelMarkers({ resource: model.uri }).map((m: any) => ({
            startLineNumber: m.startLineNumber,
            severity: m.severity === 8 ? 'error' : m.severity === 4 ? 'warning' : 'info',
            message: m.message,
          }));
        }
      }
    } catch { /* Monaco not available */ }

    // Try to get cursor info
    let cursorInfo: { line: number; column: number } | undefined;
    try {
      const editors = (window as any).monaco?.editor?.getEditors?.();
      if (editors && editors.length > 0) {
        const pos = editors[0].getPosition();
        if (pos) cursorInfo = { line: pos.lineNumber, column: pos.column };
      }
    } catch { /* no editor available */ }

    return {
      filePath: activeFileObj?.path || undefined,
      fileContent: activeFileObj?.content || undefined,
      cursorInfo,
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  }

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setToolLog([]);
    setInput('');

    const editorCtx = getEditorContext();

    chatMutation.mutate({
      data: {
        message: userMsg.content,
        projectId,
        history: messages,
        ...editorCtx,
      }
    }, {
      onSuccess: (res: AiResponse) => {
        // Store tool activity for display
        if (res.toolActivity && res.toolActivity.length > 0) {
          setToolLog(res.toolActivity);
        }

        setMessages(prev => [...prev, { role: 'assistant', content: res.message }]);

        // If the AI modified files, refresh the file tree and any open editors
        if (res.modifiedFiles && res.modifiedFiles.length > 0) {
          queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
          for (const modPath of res.modifiedFiles) {
            queryClient.invalidateQueries({
              queryKey: [`/api/projects/${projectId}/files/content`],
            });
          }
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col font-mono text-sm bg-card/50 border-l border-primary/20">
      <div className="p-3 border-b border-primary/20 flex items-center justify-between text-accent bg-background/50">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          <span className="font-bold tracking-wider">AI PAIR PROGRAMMER</span>
        </div>
        <Sparkles className="w-4 h-4 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto cyber-scrollbar p-3 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
              {msg.role === 'user' ? 'YOU' : 'SYSTEM AI'}
            </span>
            <div className={`p-2.5 rounded max-w-[90%] border ${msg.role === 'user'
                ? 'bg-secondary/10 border-secondary/30 text-foreground'
                : 'bg-accent/10 border-accent/30 text-accent'
              }`}>
              <pre className="whitespace-pre-wrap break-words text-sm font-mono">{msg.content}</pre>
            </div>
          </div>
        ))}

        {/* Tool activity indicators (shown during/after AI processing) */}
        {toolLog.length > 0 && (
          <div className="space-y-1 border border-primary/20 rounded p-2 bg-background/50">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tool Activity</span>
            {toolLog.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-primary/80">
                {TOOL_ICONS[t.tool] || <Terminal className="w-3 h-3" />}
                <span>
                  {TOOL_LABELS[t.tool] || t.tool}
                  {t.args.path && <span className="text-accent ml-1">{t.args.path}</span>}
                  {t.args.command && <span className="text-secondary ml-1 font-semibold">$ {t.args.command}</span>}
                  {t.args.query && <span className="text-accent ml-1">"{t.args.query}"</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {chatMutation.isPending && (
          <div className="flex items-center gap-2 text-accent text-xs animate-pulse">
            <div className="w-2 h-2 bg-accent rounded-full" />
            <div className="w-2 h-2 bg-accent rounded-full delay-75" />
            <div className="w-2 h-2 bg-accent rounded-full delay-150" />
            Processing... AI may be reading & editing your files
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-primary/20 bg-background/80">
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask AI to read, edit, or run your code..."
            className="w-full bg-card border border-primary/30 rounded p-2 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:shadow-[0_0_10px_rgba(255,0,255,0.2)] resize-none min-h-[60px] cyber-scrollbar"
          />
          <button
            onClick={handleSend}
            disabled={chatMutation.isPending || !input.trim()}
            className="absolute right-2 bottom-2 p-1.5 text-primary hover:text-accent hover:bg-accent/10 rounded transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
