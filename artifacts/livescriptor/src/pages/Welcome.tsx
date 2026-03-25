import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useListProjects, useCreateProject } from '@workspace/api-client-react';
import { CyberButton, CyberPanel, CyberInput } from '@/components/ui/cyber-components';
import { FolderGit2, Terminal, Plus, ArrowRight, Activity, Code2, Server, Globe } from 'lucide-react';
import { format } from 'date-fns';

const PROJECT_TYPES = [
  { id: 'vanilla', label: 'Vanilla', icon: Globe, desc: 'HTML + CSS + JS' },
  { id: 'react', label: 'React', icon: Code2, desc: 'React + Vite starter' },
  { id: 'node', label: 'Node.js', icon: Server, desc: 'Express / Node server' },
] as const;

type ProjectType = typeof PROJECT_TYPES[number]['id'];

export function Welcome() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading } = useListProjects();
  const createProjectMutation = useCreateProject();

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('vanilla');

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    try {
      const proj = await createProjectMutation.mutateAsync({
        data: { name: newProjectName, type: projectType }
      });
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
                <CyberButton variant="secondary" className="w-full justify-center" disabled>
                  Import from Git
                </CyberButton>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <label className="text-xs text-primary uppercase tracking-wider">Project Designation</label>
                  <CyberInput
                    placeholder="E.g. matrix-override"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-primary uppercase tracking-wider">Project Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PROJECT_TYPES.map(({ id, label, icon: Icon, desc }) => (
                      <button
                        key={id}
                        onClick={() => setProjectType(id)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 border transition-all text-xs ${
                          projectType === id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-primary/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-bold tracking-wider">{label}</span>
                        <span className="text-[10px] opacity-60">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <CyberButton
                    variant="ghost"
                    onClick={() => { setIsCreating(false); setNewProjectName(''); setProjectType('vanilla'); }}
                    className="flex-1"
                  >
                    Abort
                  </CyberButton>
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

          <CyberPanel className="p-8 flex flex-col max-h-[500px]">
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
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span className="bg-primary/10 text-primary px-1.5 rounded text-[10px] uppercase">{p.type}</span>
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
