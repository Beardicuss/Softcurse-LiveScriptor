import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Play, Settings, FolderOpen, Download, Search } from 'lucide-react';
import { CyberButton } from '@/components/ui/cyber-components';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { useIdeStore } from '@/hooks/use-ide-store';
import { useGetProject } from '@workspace/api-client-react';
import { downloadProjectZip } from '@/lib/api';

export function MenuBar({ projectId }: { projectId: string }) {
  const [, setLocation] = useLocation();
  const { data: project } = useGetProject(projectId, { query: { retry: false, queryKey: [] } as any });
  const { setActiveTab, setSettingsOpen, setCommandPaletteOpen, leftPanelView, setLeftPanelView } = useIdeStore();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!project || downloading) return;
    setDownloading(true);
    try {
      await downloadProjectZip(projectId, project.name);
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCommandPaletteOpen]);

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary outline-none transition-colors data-[state=open]:bg-primary/10 data-[state=open]:text-primary">File</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-primary/20 neon-border">
              <DropdownMenuItem onClick={() => setLocation('/welcome')} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                New Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/welcome')} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                Close Project
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem onClick={handleDownload} disabled={downloading} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                Download as ZIP
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary outline-none transition-colors data-[state=open]:bg-primary/10 data-[state=open]:text-primary">Edit</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-primary/20 neon-border">
              <DropdownMenuItem onClick={() => setCommandPaletteOpen(true)} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                Command Palette
                <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem onClick={() => setLeftPanelView('search')} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                Search in Files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary outline-none transition-colors data-[state=open]:bg-primary/10 data-[state=open]:text-primary">View</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-primary/20 neon-border">
              <DropdownMenuItem onClick={() => setLeftPanelView('explorer')} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                File Explorer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLeftPanelView('search')} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                Search Panel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1.5 hover:bg-primary/10 hover:text-primary outline-none transition-colors data-[state=open]:bg-primary/10 data-[state=open]:text-primary">Run</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-primary/20 neon-border">
              <DropdownMenuItem onClick={() => setActiveTab('LIVE_PREVIEW')} className="focus:bg-primary/20 focus:text-primary cursor-pointer">
                Live Preview
                <DropdownMenuShortcut><Play className="w-3 h-3 inline" /></DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <button
            onClick={() => { setLeftPanelView('search'); }}
            title="Search (Ctrl+Shift+F)"
            className={`p-2 rounded transition-colors ${leftPanelView === 'search' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
          >
            <Search className="w-4 h-4" />
          </button>

          <CyberButton
            variant="ghost"
            className="!px-3 !py-1.5"
            onClick={() => setActiveTab('LIVE_PREVIEW')}
          >
            <Play className="w-4 h-4 mr-2 inline" /> Preview
          </CyberButton>

          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Download as ZIP"
            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
          </button>

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
