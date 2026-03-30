import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useListProjects, useCreateProject, useDeleteProject } from '@workspace/api-client-react';
import { CyberButton, CyberPanel, CyberInput } from '@/components/ui/cyber-components';
import { FolderGit2, Terminal, Plus, ArrowRight, Activity, Code2, Server, Globe, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const PROJECT_TYPES = [
  { id: 'vanilla', label: 'Vanilla', icon: Globe, desc: 'HTML + CSS + JS' },
  { id: 'react', label: 'React', icon: Code2, desc: 'React + Vite' },
  { id: 'node', label: 'Node.js', icon: Server, desc: 'Express server' },
  { id: 'typescript', label: 'TypeScript', icon: Code2, desc: 'TS + Node' },
  { id: 'python', label: 'Python', icon: Terminal, desc: 'Python script' },
  { id: 'nextjs', label: 'Next.js', icon: Globe, desc: 'React SSR' },
  { id: 'vue', label: 'Vue', icon: Code2, desc: 'Vue + Vite' },
  { id: 'game', label: 'HTML5 Game', icon: Activity, desc: 'Canvas game' },
] as const;

type ProjectType = typeof PROJECT_TYPES[number]['id'];

export function Welcome() {
  const [, setLocation] = useLocation();
  const { data: projects, isLoading } = useListProjects();
  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('vanilla');

  const [isImporting, setIsImporting] = useState(false);
  const [gitUrl, setGitUrl] = useState('');
  const [importingGit, setImportingGit] = useState(false);
  const queryClient = useQueryClient();

  const handleImportGit = async () => {
    if (!gitUrl) return;
    setImportingGit(true);
    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: gitUrl })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Import failed');
      }
      const project = await res.json();
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      setLocation(`/project/${project.id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setImportingGit(false);
    }
  };

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

  const handleDeleteProject = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Remove "${name}" from LiveScriptor? Your project files on disk will NOT be deleted.`)) return;

    try {
      await deleteProjectMutation.mutateAsync({ projectId: id });
      await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    } catch (e) {
      console.error('Failed to delete project:', e);
      alert('Failed to delete project.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col items-center justify-center font-mono">
      <div className="absolute inset-0 bg-[url('/images/cyber-bg.png')] bg-cover bg-center opacity-30 mix-blend-screen cyber-bg-pan origin-center pointer-events-none" />

      {/* 3D Floor Grid */}
      <div
        className="absolute inset-0 cyber-grid opacity-30 pointer-events-none"
        style={{
          transform: 'perspective(600px) rotateX(60deg) translateY(100px) scale(2.5)',
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 100%)'
        }}
      />

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

            {!isCreating && !isImporting ? (
              <div className="flex flex-col gap-4">
                <CyberButton
                  className="w-full py-4 text-lg justify-center"
                  glitchHover
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="w-5 h-5 mr-2 inline" /> Create New Project
                </CyberButton>
                <CyberButton variant="secondary" className="w-full justify-center" onClick={() => setIsImporting(true)}>
                  Import Project
                </CyberButton>
              </div>
            ) : isImporting ? (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <label className="text-xs text-primary uppercase tracking-wider">Git / Directory / ZIP Path</label>
                  <CyberInput
                    placeholder="https://github.com/... or C:\path\to\project"
                    value={gitUrl}
                    onChange={e => setGitUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleImportGit()}
                    autoFocus
                  />
                  <p className="text-muted-foreground text-[10px] mt-1">Accepts Git URLs, absolute directory paths, or .zip paths.</p>
                </div>

                <div className="flex gap-2 mt-4">
                  <CyberButton
                    variant="ghost"
                    onClick={() => { setIsImporting(false); setGitUrl(''); }}
                    className="flex-1"
                  >
                    Abort
                  </CyberButton>
                  <CyberButton
                    onClick={handleImportGit}
                    className="flex-1"
                    disabled={importingGit || !gitUrl}
                  >
                    {importingGit ? 'Importing...' : 'Import'}
                  </CyberButton>
                </div>
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
                  <div className="grid grid-cols-4 gap-2">
                    {PROJECT_TYPES.map(({ id, label, icon: Icon, desc }) => (
                      <button
                        key={id}
                        onClick={() => setProjectType(id)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 border transition-all text-xs ${projectType === id
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
                projects?.map((p, idx) => (
                  <div
                    key={p.id}
                    className="group border border-primary/20 bg-background/50 p-3 cursor-pointer hover:bg-primary/10 hover:border-primary transition-all flex items-center justify-between animate-in fade-in slide-in-from-right-8"
                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
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

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        onClick={(e) => handleDeleteProject(e, p.id, p.name)}
                        title="Delete Configuration"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ArrowRight className="w-4 h-4 text-primary ml-1" />
                    </div>
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
