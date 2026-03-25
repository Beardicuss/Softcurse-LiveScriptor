import React, { useState, useRef } from 'react';
import { Search, CaseSensitive, Regex, FileText, ChevronRight } from 'lucide-react';
import { useIdeStore } from '@/hooks/use-ide-store';
import { getApiBaseUrl } from '@/lib/api';

interface SearchResult {
  file: string;
  line: number;
  column: number;
  content: string;
  match: string;
}

export function SearchPanel({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState('');
  const [filePattern, setFilePattern] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const setActiveTab = useIdeStore(s => s.setActiveTab);

  const runSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearched(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/projects/${projectId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, caseSensitive, useRegex, filePattern: filePattern || undefined }),
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.file]) acc[r.file] = [];
    acc[r.file].push(r);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col font-mono text-sm">
      <div className="p-3 border-b border-primary/20 bg-background/50 shrink-0">
        <span className="font-bold tracking-wider text-primary">SEARCH</span>
      </div>

      <div className="p-3 space-y-2 border-b border-primary/20 shrink-0">
        <div className="flex items-center gap-1 bg-background border border-primary/20 rounded px-2 focus-within:border-primary transition-colors">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch()}
            className="flex-1 bg-transparent border-none outline-none py-1.5 px-1 text-xs text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={() => setCaseSensitive(v => !v)}
            title="Case sensitive"
            className={`p-1 rounded transition-colors ${caseSensitive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary'}`}
          >
            <CaseSensitive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setUseRegex(v => !v)}
            title="Use regex"
            className={`p-1 rounded transition-colors ${useRegex ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary'}`}
          >
            <Regex className="w-3.5 h-3.5" />
          </button>
        </div>
        <input
          type="text"
          placeholder="files to include (e.g. *.js)"
          value={filePattern}
          onChange={e => setFilePattern(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runSearch()}
          className="w-full bg-background border border-primary/20 rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={runSearch}
          disabled={isSearching || !query.trim()}
          className="w-full py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-bold tracking-wider transition-colors disabled:opacity-50"
        >
          {isSearching ? 'SCANNING...' : 'EXECUTE SEARCH'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto cyber-scrollbar">
        {searched && !isSearching && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-primary/10">
            {results.length === 0
              ? 'No results found.'
              : `${results.length} result${results.length !== 1 ? 's' : ''} in ${Object.keys(grouped).length} file${Object.keys(grouped).length !== 1 ? 's' : ''}`
            }
          </div>
        )}

        {Object.entries(grouped).map(([file, matches]) => (
          <div key={file} className="border-b border-primary/10">
            <div className="flex items-center gap-2 px-3 py-2 bg-card/40 text-secondary text-xs font-bold">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{file}</span>
              <span className="ml-auto text-muted-foreground font-normal shrink-0">{matches.length}</span>
            </div>
            {matches.map((m, i) => (
              <div
                key={i}
                onClick={() => setActiveTab('/' + m.file)}
                className="flex items-start gap-2 px-4 py-1.5 hover:bg-primary/10 cursor-pointer group transition-colors"
              >
                <span className="text-muted-foreground text-xs shrink-0 w-6 text-right">{m.line}</span>
                <span className="text-foreground/70 text-xs truncate flex-1 group-hover:text-foreground">
                  {m.content}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
