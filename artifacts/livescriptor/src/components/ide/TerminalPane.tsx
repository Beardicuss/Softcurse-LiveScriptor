import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import { useExecuteCommand } from '@workspace/api-client-react';

interface LogEntry {
  id: number;
  type: 'cmd' | 'out' | 'err';
  text: string;
}

export function TerminalPane({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, type: 'out', text: 'Softcurse LiveScriptor Terminal v1.0.0' },
    { id: 2, type: 'out', text: 'SYSTEM SECURE. READY FOR INPUT.' }
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const execMutation = useExecuteCommand();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCommand = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(newIdx);
      setInput(history[newIdx] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      setInput(newIdx === -1 ? '' : history[newIdx] ?? '');
      return;
    }
    if (e.key === 'Enter' && input.trim()) {
      const cmd = input.trim();
      setInput('');
      setHistoryIdx(-1);
      setHistory(prev => [cmd, ...prev].slice(0, 100));

      const newId = Date.now();
      setLogs(prev => [...prev, { id: newId, type: 'cmd', text: cmd }]);

      execMutation.mutate({ projectId, data: { command: cmd } }, {
        onSuccess: (data) => {
          const newLogs: LogEntry[] = [];
          if (data.stdout) newLogs.push({ id: Date.now() + 1, type: 'out', text: data.stdout });
          if (data.stderr) newLogs.push({ id: Date.now() + 2, type: 'err', text: data.stderr });
          if (!data.stdout && !data.stderr) newLogs.push({ id: Date.now() + 3, type: 'out', text: '(no output)' });
          setLogs(prev => [...prev, ...newLogs]);
        },
        onError: (err: any) => {
          setLogs(prev => [...prev, { id: Date.now() + 1, type: 'err', text: `Execution failed: ${err.message || 'Unknown error'}` }]);
        }
      });
    }
  }, [input, history, historyIdx, execMutation, projectId]);

  return (
    <div className="h-full flex flex-col font-mono text-xs bg-background/90">
      <div className="px-3 py-1.5 border-b border-primary/20 flex items-center justify-between text-primary shrink-0 bg-card">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5" />
          <span className="font-bold tracking-wider">TERMINAL</span>
        </div>
        <button
          onClick={() => setLogs([{ id: Date.now(), type: 'out', text: 'Console cleared.' }])}
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
          title="Clear terminal"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto cyber-scrollbar p-3 space-y-1 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {logs.map(log => (
          <div key={log.id} className="whitespace-pre-wrap break-all leading-5">
            {log.type === 'cmd' && <span className="text-secondary mr-2">root@softcurse:~$</span>}
            <span className={
              log.type === 'cmd' ? 'text-foreground' :
              log.type === 'err' ? 'text-destructive' :
              'text-muted-foreground'
            }>
              {log.text}
            </span>
          </div>
        ))}
        {execMutation.isPending && (
          <div className="text-secondary animate-pulse">Executing sequence...</div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-2 border-t border-primary/20 flex items-center gap-2 bg-card/50">
        <span className="text-secondary font-bold shrink-0">root@softcurse:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleCommand}
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground focus:ring-0 caret-primary"
          autoComplete="off"
          spellCheck={false}
          placeholder="type a command..."
        />
      </div>
    </div>
  );
}
