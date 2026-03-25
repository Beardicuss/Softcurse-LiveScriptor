import React, { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MenuBar } from '@/components/ide/MenuBar';
import { FileExplorer } from '@/components/ide/FileExplorer';
import { EditorPane } from '@/components/ide/EditorPane';
import { TerminalPane } from '@/components/ide/TerminalPane';
import { AiPanel } from '@/components/ide/AiPanel';
import { LivePreview } from '@/components/ide/LivePreview';
import { useIdeStore } from '@/hooks/use-ide-store';
import { useGetProject } from '@workspace/api-client-react';
import { Activity } from 'lucide-react';

export function IDE() {
  const [match, params] = useRoute('/project/:id');
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  
  const { activeTab, setActiveProject } = useIdeStore();
  const { isLoading, isError } = useGetProject(projectId || '', { query: { enabled: !!projectId, retry: false }});

  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    }
  }, [projectId, setActiveProject]);

  if (!match || !projectId) {
    setLocation('/welcome');
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background cyber-grid font-mono text-primary gap-4">
        <Activity className="w-12 h-12 animate-pulse neon-text-primary" />
        <p className="tracking-widest">CONNECTING TO SYSTEM...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background cyber-grid font-mono text-destructive gap-4">
        <h1 className="text-4xl font-display tracking-widest neon-text-accent">ACCESS DENIED</h1>
        <p>Project databank corrupted or non-existent.</p>
        <button onClick={() => setLocation('/welcome')} className="text-primary hover:underline mt-4">RETURN TO NEXUS</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden cyber-grid selection:bg-primary/30">
      <MenuBar projectId={projectId} />
      
      <div className="flex-1 min-h-0 relative z-10">
        <PanelGroup direction="horizontal" className="h-full w-full">
          <Panel defaultSize={20} minSize={10} className="border-r border-primary/20 bg-card/80 backdrop-blur-md">
            <FileExplorer projectId={projectId} />
          </Panel>
          
          <PanelResizeHandle className="w-1 bg-primary/10 hover:bg-primary/50 transition-colors cursor-col-resize" />
          
          <Panel defaultSize={60} minSize={30}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={70} minSize={20} className="bg-[#03060d] relative">
                {activeTab === 'LIVE_PREVIEW' ? (
                  <LivePreview projectId={projectId} />
                ) : (
                  <EditorPane projectId={projectId} />
                )}
              </Panel>
              
              <PanelResizeHandle className="h-1 bg-primary/10 hover:bg-primary/50 transition-colors cursor-row-resize z-20" />
              
              <Panel defaultSize={30} minSize={10} className="bg-card/80 backdrop-blur-md border-t border-primary/20">
                <TerminalPane projectId={projectId} />
              </Panel>
            </PanelGroup>
          </Panel>
          
          <PanelResizeHandle className="w-1 bg-primary/10 hover:bg-primary/50 transition-colors cursor-col-resize" />
          
          <Panel defaultSize={20} minSize={15} className="bg-card/80 backdrop-blur-md">
            <AiPanel projectId={projectId} />
          </Panel>
        </PanelGroup>
      </div>

      <div className="h-6 border-t border-primary/20 bg-card flex items-center justify-between px-4 text-[10px] font-mono text-muted-foreground shrink-0 select-none z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 hover:text-primary cursor-pointer"><Activity className="w-3 h-3 text-secondary"/> SYSTEM STATUS: NOMINAL</span>
          <span className="text-primary/50">|</span>
          <span>{activeTab || 'IDLE'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>SPACES: 2</span>
          <span>Softcurse OS v3.1</span>
        </div>
      </div>
    </div>
  );
}
