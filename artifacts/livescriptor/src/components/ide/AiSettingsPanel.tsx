import React, { useState, useEffect, useCallback } from 'react';
import { Key, Globe, Bot, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const PROVIDERS = [
    { id: 'openai', label: 'OpenAI', url: 'https://api.openai.com/v1', defaultModel: 'gpt-4o', local: false },
    { id: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o', local: false },
    { id: 'gemini', label: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-2.5-flash', local: false },
    { id: 'grok', label: 'xAI Grok', url: 'https://api.x.ai/v1', defaultModel: 'grok-3', local: false },
    { id: 'ollama', label: 'Ollama (Local)', url: 'http://localhost:11434/v1', defaultModel: 'llama3.1', local: true },
    { id: 'lmstudio', label: 'LM Studio (Local)', url: 'http://localhost:1234/v1', defaultModel: 'local-model', local: true },
    { id: 'custom', label: 'Custom (OpenAI-compatible)', url: '', defaultModel: '', local: false },
] as const;

type ProviderId = typeof PROVIDERS[number]['id'];

interface AiSettings {
    ai_provider: string;
    ai_api_key: string;
    ai_base_url: string;
    ai_model: string;
}

export function AiSettingsPanel() {
    const [settings, setSettings] = useState<AiSettings>({
        ai_provider: 'openai',
        ai_api_key: '',
        ai_base_url: 'https://api.openai.com/v1',
        ai_model: 'gpt-4o',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then((data: Record<string, string>) => {
                setSettings({
                    ai_provider: data.ai_provider || 'openai',
                    ai_api_key: data.ai_api_key || '',
                    ai_base_url: data.ai_base_url || 'https://api.openai.com/v1',
                    ai_model: data.ai_model || 'gpt-4o',
                });
            })
            .catch(() => setError('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    const handleProviderChange = (providerId: string) => {
        const provider = PROVIDERS.find(p => p.id === providerId);
        if (!provider) return;
        setSettings(prev => ({
            ...prev,
            ai_provider: providerId,
            ai_base_url: provider.url || prev.ai_base_url,
            ai_model: provider.defaultModel || prev.ai_model,
        }));
    };

    const handleSave = useCallback(async () => {
        setSaving(true);
        setSaved(false);
        setError('');
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error('Failed to save');
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    }, [settings]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading AI settings...
            </div>
        );
    }

    const currentProvider = PROVIDERS.find(p => p.id === settings.ai_provider) || PROVIDERS[0];
    const isCustom = settings.ai_provider === 'custom';
    const isLocal = currentProvider.local;

    return (
        <div>
            <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-4 font-mono">AI Provider Configuration</h3>

            {/* Provider Selection */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-mono text-foreground flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" /> Provider
                    </label>
                    <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider mb-1">Cloud Providers</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {PROVIDERS.filter(p => !p.local && p.id !== 'custom').map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleProviderChange(p.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 text-xs font-mono border transition-all rounded-sm ${settings.ai_provider === p.id
                                    ? 'border-primary bg-primary/10 text-primary shadow-[0_0_8px_rgba(0,255,255,0.15)]'
                                    : 'border-primary/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider mb-1">Local LLMs</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {PROVIDERS.filter(p => p.local).map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleProviderChange(p.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 text-xs font-mono border transition-all rounded-sm ${settings.ai_provider === p.id
                                    ? 'border-green-400 bg-green-400/10 text-green-400 shadow-[0_0_8px_rgba(0,255,100,0.15)]'
                                    : 'border-primary/20 text-muted-foreground hover:border-green-400/40 hover:text-foreground'
                                    }`}
                            >
                                🖥️ {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {PROVIDERS.filter(p => p.id === 'custom').map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleProviderChange(p.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 text-xs font-mono border transition-all rounded-sm col-span-2 ${settings.ai_provider === p.id
                                    ? 'border-secondary bg-secondary/10 text-secondary shadow-[0_0_8px_rgba(255,107,53,0.15)]'
                                    : 'border-primary/20 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                    <label className="text-sm font-mono text-foreground flex items-center gap-2">
                        <Key className="w-4 h-4 text-accent" /> API Key
                    </label>
                    <input
                        type="password"
                        value={settings.ai_api_key}
                        onChange={e => setSettings(prev => ({ ...prev, ai_api_key: e.target.value }))}
                        placeholder={`Enter your ${currentProvider.label} API key...`}
                        className="w-full bg-background border border-primary/30 text-foreground text-sm font-mono px-3 py-2 rounded-sm focus:outline-none focus:border-primary hover:border-primary/60 transition-colors placeholder:text-muted-foreground/50"
                    />
                    <p className="text-[10px] text-muted-foreground/60 font-mono">
                        {isLocal
                            ? 'Local LLMs typically don\'t require an API key. Leave blank if not needed.'
                            : 'Your API key is stored locally and never sent to any third party.'}
                    </p>
                </div>

                {/* Base URL (editable for Custom, shown for others) */}
                <div className="space-y-2">
                    <label className="text-sm font-mono text-foreground flex items-center gap-2">
                        <Globe className="w-4 h-4 text-secondary" /> Base URL
                    </label>
                    <input
                        type="text"
                        value={settings.ai_base_url}
                        onChange={e => setSettings(prev => ({ ...prev, ai_base_url: e.target.value }))}
                        disabled={!isCustom && !isLocal}
                        placeholder="https://api.example.com/v1"
                        className={`w-full bg-background border border-primary/30 text-sm font-mono px-3 py-2 rounded-sm focus:outline-none focus:border-primary transition-colors ${isCustom ? 'text-foreground hover:border-primary/60' : 'text-muted-foreground/60 cursor-not-allowed'
                            }`}
                    />
                </div>

                {/* Model */}
                <div className="space-y-2">
                    <label className="text-sm font-mono text-foreground">Model</label>
                    <input
                        type="text"
                        value={settings.ai_model}
                        onChange={e => setSettings(prev => ({ ...prev, ai_model: e.target.value }))}
                        placeholder="e.g. gpt-4o"
                        className="w-full bg-background border border-primary/30 text-foreground text-sm font-mono px-3 py-2 rounded-sm focus:outline-none focus:border-primary hover:border-primary/60 transition-colors placeholder:text-muted-foreground/50"
                    />
                </div>

                {/* Save / Status */}
                <div className="flex items-center gap-3 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 text-sm font-mono border border-accent/50 text-accent hover:bg-accent/10 hover:border-accent hover:shadow-[0_0_12px_rgba(255,0,255,0.2)] transition-all rounded-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {saving ? 'SAVING...' : 'SAVE CONFIG'}
                    </button>
                    {saved && (
                        <span className="flex items-center gap-1.5 text-xs text-green-400 font-mono animate-in fade-in">
                            <CheckCircle className="w-3.5 h-3.5" /> Configuration saved
                        </span>
                    )}
                    {error && (
                        <span className="flex items-center gap-1.5 text-xs text-destructive font-mono">
                            <AlertCircle className="w-3.5 h-3.5" /> {error}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
