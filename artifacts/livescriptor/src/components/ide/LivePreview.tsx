import React, { useEffect, useState, useRef } from 'react';
import { useGetFileContent } from '@workspace/api-client-react';
import { CyberButton } from '@/components/ui/cyber-components';
import { Play, RotateCw } from 'lucide-react';
import { useIdeStore } from '@/hooks/use-ide-store';

export function LivePreview({ projectId }: { projectId: string }) {
  const { openFiles } = useIdeStore();
  
  // Prefer in-memory content if open, else fetch from API
  const getFileState = (path: string) => openFiles.find(f => f.path === path)?.content;

  const htmlQuery = useGetFileContent(projectId, { path: '/index.html' }, { query: { retry: false }});
  const cssQuery = useGetFileContent(projectId, { path: '/style.css' }, { query: { retry: false }});
  const jsQuery = useGetFileContent(projectId, { path: '/script.js' }, { query: { retry: false }});

  const [srcDoc, setSrcDoc] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);

  const runPreview = () => {
    setIsBuilding(true);
    setTimeout(() => {
      const h = getFileState('/index.html') ?? htmlQuery.data?.content ?? '<h1>Index not found</h1>';
      const c = getFileState('/style.css') ?? cssQuery.data?.content ?? '';
      const j = getFileState('/script.js') ?? jsQuery.data?.content ?? '';
      
      setSrcDoc(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>${c}</style>
          </head>
          <body>
            ${h}
            <script>
              try {
                ${j}
              } catch(e) {
                console.error(e);
              }
            </script>
          </body>
        </html>
      `);
      setIsBuilding(false);
    }, 500); // Artificial delay for cyber aesthetic
  };

  useEffect(() => {
    if (htmlQuery.isSuccess) {
      runPreview();
    }
  }, [htmlQuery.isSuccess]);

  return (
    <div className="w-full h-full flex flex-col font-mono relative bg-white">
      <div className="h-10 bg-card border-b border-primary/20 flex items-center justify-between px-4 text-primary shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-accent" />
          <span className="font-bold tracking-wider text-sm">LIVE PREVIEW</span>
        </div>
        <CyberButton variant="ghost" onClick={runPreview} className="!py-1 !px-3 text-xs flex items-center gap-2">
          <RotateCw className={`w-3.5 h-3.5 ${isBuilding ? 'animate-spin' : ''}`} /> RELOAD
        </CyberButton>
      </div>
      
      {isBuilding && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-primary">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin neon-border-primary" />
            <p className="animate-pulse tracking-widest">COMPILING SYSTEM...</p>
          </div>
        </div>
      )}
      
      <iframe 
        srcDoc={srcDoc} 
        className="w-full flex-1 border-none bg-white" 
        sandbox="allow-scripts allow-same-origin allow-modals"
        title="Live Preview"
      />
    </div>
  );
}
