import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useListProjects, useCreateProject, useCreateFile } from '@workspace/api-client-react';
import { CyberButton, CyberPanel, CyberInput } from '@/components/ui/cyber-components';
import { FolderGit2, Terminal, Plus, ArrowRight, Activity } from 'lucide-react';
import { format } from 'date-fns';

export function Welcome() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading } = useListProjects();
  const createProjectMutation = useCreateProject();
  const createFileMutation = useCreateFile();

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    try {
      const proj = await createProjectMutation.mutateAsync({ 
        data: { name: newProjectName, type: 'vanilla' } 
      });
      // Provision default files
      await createFileMutation.mutateAsync({ projectId: proj.id, data: { path: '/index.html', type: 'file', content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Cyber Demo</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1 class="glitch">SYSTEM ONLINE</h1>\n  <script src="script.js"></script>\n</body>\n</html>' } });
      await createFileMutation.mutateAsync({ projectId: proj.id, data: { path: '/style.css', type: 'file', content: 'body { background: #050810; color: #00ffff; font-family: monospace; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }\n.glitch { text-shadow: 0 0 10px #00ffff; }' } });
      await createFileMutation.mutateAsync({ projectId: proj.id, data: { path: '/script.js', type: 'file', content: 'console.log("Welcome to Softcurse LiveScriptor.");' } });
      
      setLocation(`/project/${proj.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col items-center justify-center font-mono">
      <div className="absolute inset-0 bg-[url('/images/cyber-bg.png')] bg-cover bg-center opacity-30 mix-blend-screen" />
      <div className="absolute inset-0 cyber-grid opacity-20" />
      
      <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center">
        <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-32 h-32 mb-6 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)] animate-pulse-neon" />
        
        <h1 className="text-6xl font-display text-primary neon-text-primary tracking-widest mb-2 text-center">
          SOFTCURSE <span className="text-accent neon-text-accent">LIVESCRIPTOR</span>
        </h1>
        <p className="text-muted-foreground mb-12 tracking-widest uppercase">Advanced Next-Gen IDE Environment</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <CyberPanel className="p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3 text-secondary mb-2 border-b border-secondary/20 pb-4">
              <Terminal className="w-6 h-6" />
              <h2 className="text-2xl font-display tracking-widest">INITIALIZE</h2>
            </div>
            
            {!isCreating ? (
              <div className="flex flex-col gap-4">
                <CyberButton 
                  className="w-full py-4 text-lg justify-center" 
                  glitchHover 
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="w-5 h-5 mr-2 inline" /> Create New Project
                </CyberButton>
                <CyberButton variant="secondary" className="w-full justify-center">
                  Import from Git
                </CyberButton>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <label className="text-xs text-primary uppercase">Project Designation</label>
                  <CyberInput 
                    placeholder="E.g. matrix-override" 
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <CyberButton variant="ghost" onClick={() => setIsCreating(false)} className="flex-1">Abort</CyberButton>
                  <CyberButton 
                    onClick={handleCreateProject} 
                    className="flex-1"
                    disabled={createProjectMutation.isPending || !newProjectName}
                  >
                    {createProjectMutation.isPending ? 'Executing...' : 'Deploy'}
                  </CyberButton>
                </div>
              </div>
            )}
          </CyberPanel>

          <CyberPanel className="p-8 flex flex-col max-h-[400px]">
            <div className="flex items-center gap-3 text-primary mb-4 border-b border-primary/20 pb-4 shrink-0">
              <Activity className="w-6 h-6" />
              <h2 className="text-2xl font-display tracking-widest">RECENT SYSTEMS</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto cyber-scrollbar pr-2 space-y-3">
              {isLoading ? (
                <div className="text-muted-foreground animate-pulse">Scanning databanks...</div>
              ) : projects?.length === 0 ? (
                <div className="text-muted-foreground italic">No local instances found.</div>
              ) : (
                projects?.map(p => (
                  <div 
                    key={p.id} 
                    className="group border border-primary/20 bg-background/50 p-3 cursor-pointer hover:bg-primary/10 hover:border-primary transition-all flex items-center justify-between"
                    onClick={() => setLocation(`/project/${p.id}`)}
                  >
                    <div>
                      <h3 className="text-foreground font-bold group-hover:text-primary transition-colors flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-secondary" />
                        {p.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated {format(new Date(p.updatedAt), 'MMM dd HH:mm')}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  </div>
                ))
              )}
            </div>
          </CyberPanel>
        </div>
      </div>
    </div>
  );
}
