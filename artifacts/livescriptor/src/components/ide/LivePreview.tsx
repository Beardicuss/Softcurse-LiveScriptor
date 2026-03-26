import React, { useEffect, useState, useCallback } from 'react';
import { useGetFileContent } from '@workspace/api-client-react';
import { CyberButton } from '@/components/ui/cyber-components';
import { Play, RotateCw, Monitor, Tablet, Smartphone } from 'lucide-react';
import { useIdeStore } from '@/hooks/use-ide-store';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_SIZES: Record<DeviceMode, { w: string; label: string }> = {
  desktop: { w: '100%', label: 'Desktop' },
  tablet: { w: '768px', label: 'Tablet' },
  mobile: { w: '375px', label: 'Mobile' },
};

export function LivePreview({ projectId }: { projectId: string }) {
  const { openFiles } = useIdeStore();
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [srcDoc, setSrcDoc] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);

  const getFileState = (path: string) => openFiles.find(f => f.path === path)?.content;

  const htmlQuery = useGetFileContent(projectId, { path: '/index.html' }, { query: { retry: false, queryKey: [] } as any });
  const cssQuery  = useGetFileContent(projectId, { path: '/style.css' },  { query: { retry: false, queryKey: [] } as any });
  const jsQuery   = useGetFileContent(projectId, { path: '/script.js' },  { query: { retry: false, queryKey: [] } as any });

  const runPreview = useCallback(() => {
    setIsBuilding(true);
    setTimeout(() => {
      const rawHtml = getFileState('/index.html') ?? htmlQuery.data?.content ?? '<h1>index.html not found</h1>';
      const css     = getFileState('/style.css')  ?? cssQuery.data?.content  ?? '';
      const js      = getFileState('/script.js')  ?? jsQuery.data?.content   ?? '';

      let doc = rawHtml;

      // Remove external link/script refs so we can inline them safely
      doc = doc.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '');
      doc = doc.replace(/<script[^>]+src=["'][^"']*["'][^>]*><\/script>/gi, '');

      // Inject CSS before </head>, or prepend <style> if no </head>
      const styleTag = css ? `<style>${css}</style>` : '';
      if (/<\/head>/i.test(doc)) {
        doc = doc.replace(/<\/head>/i, `${styleTag}</head>`);
      } else {
        doc = styleTag + doc;
      }

      // Inject JS before </body>, or append if no </body>
      const scriptTag = js ? `<script>\ntry{\n${js}\n}catch(e){console.error(e);}\n</script>` : '';
      if (/<\/body>/i.test(doc)) {
        doc = doc.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else {
        doc = doc + scriptTag;
      }

      setSrcDoc(doc);
      setIsBuilding(false);
    }, 400);
  }, [htmlQuery.data, cssQuery.data, jsQuery.data, openFiles]);

  useEffect(() => {
    if (htmlQuery.isSuccess) {
      runPreview();
    }
  }, [htmlQuery.isSuccess]);

  const deviceConfig = DEVICE_SIZES[device];

  return (
    <div className="w-full h-full flex flex-col font-mono relative bg-[#0a0a0a]">
      <div className="h-10 bg-card border-b border-primary/20 flex items-center justify-between px-4 text-primary shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-accent" />
          <span className="font-bold tracking-wider text-sm">LIVE PREVIEW</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-background border border-primary/20 rounded overflow-hidden">
            {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as [DeviceMode, React.ElementType][]).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setDevice(mode)}
                title={DEVICE_SIZES[mode].label}
                className={`p-1.5 transition-colors ${device === mode ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-primary'}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          <CyberButton variant="ghost" onClick={runPreview} className="!py-1 !px-3 text-xs flex items-center gap-2">
            <RotateCw className={`w-3.5 h-3.5 ${isBuilding ? 'animate-spin' : ''}`} /> RELOAD
          </CyberButton>
        </div>
      </div>

      {isBuilding && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-primary">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="animate-pulse tracking-widest">COMPILING SYSTEM...</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-start justify-center overflow-auto bg-[#0a0a0a] p-4">
        <div
          className="h-full bg-white shadow-[0_0_30px_rgba(0,255,255,0.15)] transition-all duration-300"
          style={{ width: deviceConfig.w, minWidth: device !== 'desktop' ? deviceConfig.w : undefined, maxWidth: '100%' }}
        >
          <iframe
            key={srcDoc}
            srcDoc={srcDoc}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-modals allow-forms"
            title="Live Preview"
          />
        </div>
      </div>
    </div>
  );
}
