import React, { useState } from 'react';
import { Send, Plus, Trash2, Globe } from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-green-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  PATCH: 'text-purple-400',
  DELETE: 'text-red-400',
  HEAD: 'text-cyan-400',
  OPTIONS: 'text-gray-400',
};

interface Header { key: string; value: string; enabled: boolean; }

interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

function formatBody(body: string): string {
  try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; }
}

export function HttpClient() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('https://');
  const [headers, setHeaders] = useState<Header[]>([{ key: 'Content-Type', value: 'application/json', enabled: true }]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'headers' | 'body'>('headers');
  const [resTab, setResTab] = useState<'body' | 'headers'>('body');

  const sendRequest = async () => {
    if (!url.trim() || url === 'https://') return;
    setIsLoading(true);
    setError(null);
    setResponse(null);
    const start = Date.now();

    try {
      const reqHeaders: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => { reqHeaders[h.key] = h.value; });

      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: ['GET', 'HEAD'].includes(method) ? undefined : (body || undefined),
      });

      const text = await res.text();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: text,
        time: Date.now() - start,
        size: new TextEncoder().encode(text).length,
      });
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const addHeader = () => setHeaders(prev => [...prev, { key: '', value: '', enabled: true }]);
  const removeHeader = (i: number) => setHeaders(prev => prev.filter((_, idx) => idx !== i));
  const updateHeader = (i: number, field: keyof Header, val: string | boolean) =>
    setHeaders(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h));

  const statusColor = response
    ? response.status < 300 ? 'text-green-400'
    : response.status < 400 ? 'text-yellow-400'
    : 'text-red-400'
    : '';

  return (
    <div className="h-full flex flex-col font-mono text-xs overflow-hidden">
      <div className="p-3 border-b border-primary/20 bg-background/50 shrink-0">
        <div className="flex items-center gap-2 text-primary mb-1">
          <Globe className="w-4 h-4" />
          <span className="font-bold tracking-wider text-sm">HTTP CLIENT</span>
        </div>
      </div>

      <div className="p-3 border-b border-primary/20 space-y-2 shrink-0">
        <div className="flex gap-2">
          <select
            value={method}
            onChange={e => setMethod(e.target.value as HttpMethod)}
            className={`bg-card border border-primary/20 px-2 py-1.5 outline-none font-bold text-xs ${METHOD_COLORS[method]} focus:border-primary`}
          >
            {METHODS.map(m => (
              <option key={m} value={m} className="text-foreground">{m}</option>
            ))}
          </select>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendRequest()}
            placeholder="https://api.example.com/endpoint"
            className="flex-1 bg-background border border-primary/20 px-2 py-1.5 text-foreground outline-none focus:border-primary transition-colors text-xs min-w-0"
          />
          <button
            onClick={sendRequest}
            disabled={isLoading}
            className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoading ? <span className="animate-pulse">•••</span> : <><Send className="w-3.5 h-3.5" /> SEND</>}
          </button>
        </div>

        <div className="flex gap-1 text-xs">
          {(['headers', 'body'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1 uppercase tracking-wider transition-colors ${activeTab === t ? 'bg-primary/20 text-primary border-b border-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              {t} {t === 'headers' && <span className="text-muted-foreground">({headers.filter(h => h.enabled && h.key).length})</span>}
            </button>
          ))}
        </div>

        {activeTab === 'headers' && (
          <div className="space-y-1 max-h-32 overflow-y-auto cyber-scrollbar">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-1 items-center">
                <input
                  type="checkbox"
                  checked={h.enabled}
                  onChange={e => updateHeader(i, 'enabled', e.target.checked)}
                  className="accent-primary shrink-0"
                />
                <input
                  placeholder="Key"
                  value={h.key}
                  onChange={e => updateHeader(i, 'key', e.target.value)}
                  className="flex-1 bg-background border border-primary/10 px-1.5 py-0.5 outline-none focus:border-primary text-xs min-w-0"
                />
                <input
                  placeholder="Value"
                  value={h.value}
                  onChange={e => updateHeader(i, 'value', e.target.value)}
                  className="flex-1 bg-background border border-primary/10 px-1.5 py-0.5 outline-none focus:border-primary text-xs min-w-0"
                />
                <button onClick={() => removeHeader(i)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            <button onClick={addHeader} className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs">
              <Plus className="w-3 h-3" /> Add header
            </button>
          </div>
        )}

        {activeTab === 'body' && !['GET', 'HEAD'].includes(method) && (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            rows={4}
            className="w-full bg-background border border-primary/20 px-2 py-1.5 text-foreground outline-none focus:border-primary text-xs font-mono resize-none cyber-scrollbar"
          />
        )}
        {activeTab === 'body' && ['GET', 'HEAD'].includes(method) && (
          <p className="text-muted-foreground text-xs italic">No body for {method} requests.</p>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 m-3 text-destructive text-xs">
            ERROR: {error}
          </div>
        )}

        {response && (
          <>
            <div className="flex items-center gap-4 px-3 py-2 border-b border-primary/20 bg-card/40 shrink-0">
              <span className={`font-bold ${statusColor}`}>{response.status} {response.statusText}</span>
              <span className="text-muted-foreground">{response.time}ms</span>
              <span className="text-muted-foreground">{(response.size / 1024).toFixed(2)} KB</span>
            </div>

            <div className="flex gap-1 px-3 py-1.5 border-b border-primary/10 shrink-0">
              {(['body', 'headers'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setResTab(t)}
                  className={`px-2 py-0.5 uppercase tracking-wider text-xs transition-colors ${resTab === t ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto cyber-scrollbar p-3">
              {resTab === 'body' && (
                <pre className="text-foreground/80 whitespace-pre-wrap break-all text-xs leading-5">
                  {formatBody(response.body)}
                </pre>
              )}
              {resTab === 'headers' && (
                <div className="space-y-1">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-secondary shrink-0">{k}:</span>
                      <span className="text-foreground/70 break-all">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!response && !error && !isLoading && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
            <Globe className="w-8 h-8 opacity-20" />
            <p className="text-xs">Enter a URL and send a request</p>
          </div>
        )}
      </div>
    </div>
  );
}
