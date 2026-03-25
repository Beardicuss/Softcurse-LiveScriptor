import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';
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
  const endRef = useRef<HTMLDivElement>(null);
  
  const execMutation = useExecuteCommand();

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      const cmd = input.trim();
      setInput('');
      const newId = Date.now();
      
      setLogs(prev => [...prev, { id: newId, type: 'cmd', text: cmd }]);
      
      execMutation.mutate({ projectId, data: { command: cmd } }, {
        onSuccess: (data) => {
          const newLogs: LogEntry[] = [];
          if (data.stdout) newLogs.push({ id: Date.now() + 1, type: 'out', text: data.stdout });
          if (data.stderr) newLogs.push({ id: Date.now() + 2, type: 'err', text: data.stderr });
          setLogs(prev => [...prev, ...newLogs]);
        },
        onError: (err: any) => {
          setLogs(prev => [...prev, { id: Date.now() + 1, type: 'err', text: `Execution failed: ${err.message || 'Unknown error'}` }]);
        }
      });
    }
  };

  return (
    <div className="h-full flex flex-col font-mono text-xs bg-background/90">
      <div className="px-3 py-1.5 border-b border-primary/20 flex items-center gap-2 text-primary shrink-0 bg-card">
        <TerminalIcon className="w-3.5 h-3.5" />
        <span className="font-bold tracking-wider">TERMINAL</span>
      </div>
      
      <div className="flex-1 overflow-y-auto cyber-scrollbar p-3 space-y-1">
        {logs.map(log => (
          <div key={log.id} className="whitespace-pre-wrap break-all">
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
        <span className="text-secondary font-bold">root@softcurse:~$</span>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleCommand}
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground focus:ring-0"
          autoComplete="off"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
