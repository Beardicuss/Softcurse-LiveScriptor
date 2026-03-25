import React from 'react';
import { useLocation } from 'wouter';
import { Activity, Play, Settings, FolderOpen } from 'lucide-react';
import { CyberButton } from '@/components/ui/cyber-components';
import { useIdeStore } from '@/hooks/use-ide-store';
import { useGetProject } from '@workspace/api-client-react';

export function MenuBar({ projectId }: { projectId: string }) {
  const [, setLocation] = useLocation();
  const { data: project } = useGetProject(projectId, { query: { retry: false } });
  const setActiveTab = useIdeStore(s => s.setActiveTab);
  const setSettingsOpen = useIdeStore(s => s.setSettingsOpen);

  return (
    <div className="h-12 border-b border-primary/20 bg-card flex items-center justify-between px-4 select-none shrink-0 relative z-20">
      <div className="flex items-center gap-6">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => setLocation('/welcome')}
        >
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="Logo"
            className="w-7 h-7 group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.9)] transition-all"
          />
          <h1 className="text-xl font-display text-primary neon-text-primary tracking-widest mt-1">LIVESCRIPTOR</h1>
        </div>

        <div className="hidden md:flex items-center gap-1 text-sm font-mono text-muted-foreground">
          <button className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors">File</button>
          <button className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors">Edit</button>
          <button className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors">View</button>
          <button className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors">Run</button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {project && (
          <div className="flex items-center gap-2 bg-background border border-primary/20 px-4 py-1.5 rounded text-sm font-mono">
            <FolderOpen className="w-4 h-4 text-secondary" />
            <span className="text-secondary">{project.name}</span>
            <span className="text-muted-foreground text-xs uppercase px-2 bg-primary/10 rounded">{project.type}</span>
          </div>
        )}

        <div className="h-6 w-px bg-primary/20" />

        <div className="flex items-center gap-2">
          <CyberButton
            variant="ghost"
            className="!px-3 !py-1.5"
            onClick={() => setActiveTab('LIVE_PREVIEW')}
          >
            <Play className="w-4 h-4 mr-2 inline" /> Preview
          </CyberButton>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
