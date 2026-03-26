import React, { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MenuBar } from '@/components/ide/MenuBar';
import { FileExplorer } from '@/components/ide/FileExplorer';
import { EditorPane } from '@/components/ide/EditorPane';
import { TerminalPane } from '@/components/ide/TerminalPane';
import { AiPanel } from '@/components/ide/AiPanel';
import { LivePreview } from '@/components/ide/LivePreview';
import { SettingsModal } from '@/components/ide/SettingsModal';
import { SearchPanel } from '@/components/ide/SearchPanel';
import { HttpClient } from '@/components/ide/HttpClient';
import { CommandPalette } from '@/components/ide/CommandPalette';
import { useIdeStore } from '@/hooks/use-ide-store';
import { useGetProject } from '@workspace/api-client-react';
import { Activity, Files, Search, Globe } from 'lucide-react';

export function IDE() {
  const [match, params] = useRoute('/project/:id');
  const [, setLocation] = useLocation();
  const projectId = params?.id;

  const { activeTab, setActiveProject, leftPanelView, setLeftPanelView, setCommandPaletteOpen } = useIdeStore();
  const { isLoading, isError } = useGetProject(projectId || '', { query: { enabled: !!projectId, retry: false, queryKey: [] } as any });

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

  const SIDEBAR_ICONS = [
    { id: 'explorer' as const, Icon: Files, title: 'Explorer' },
    { id: 'search' as const, Icon: Search, title: 'Search' },
    { id: 'http' as const, Icon: Globe, title: 'HTTP Client' },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden cyber-grid selection:bg-primary/30">
      <MenuBar projectId={projectId} />

      <div className="flex flex-1 min-h-0 relative z-10">
        {/* Activity bar */}
        <div className="w-10 flex flex-col items-center py-2 gap-1 bg-card border-r border-primary/20 shrink-0">
          {SIDEBAR_ICONS.map(({ id, Icon, title }) => (
            <button
              key={id}
              title={title}
              onClick={() => setLeftPanelView(id)}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${leftPanelView === id ? 'text-primary bg-primary/10 border-l-2 border-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
            >
              <Icon className="w-4.5 h-4.5" />
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <PanelGroup direction="horizontal" className="h-full w-full">
            <Panel defaultSize={20} minSize={10} className="border-r border-primary/20 bg-card/80 backdrop-blur-md overflow-hidden">
              {leftPanelView === 'explorer' && <FileExplorer projectId={projectId} />}
              {leftPanelView === 'search' && <SearchPanel projectId={projectId} />}
              {leftPanelView === 'http' && <HttpClient />}
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
      </div>

      <SettingsModal />
      <CommandPalette projectId={projectId} />

      <div className="h-6 border-t border-primary/20 bg-card flex items-center justify-between px-4 text-[10px] font-mono text-muted-foreground shrink-0 select-none z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 hover:text-primary cursor-pointer">
            <Activity className="w-3 h-3 text-secondary" /> SYSTEM STATUS: NOMINAL
          </span>
          <span className="text-primary/50">|</span>
          <span>{activeTab || 'IDLE'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Ctrl+P: Quick Open</span>
          <span>Softcurse OS v3.1</span>
        </div>
      </div>
    </div>
  );
}
