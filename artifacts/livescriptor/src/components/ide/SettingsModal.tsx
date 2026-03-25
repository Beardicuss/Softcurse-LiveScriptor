import React from 'react';
import { X, Settings, Monitor, Type, ToggleLeft, ToggleRight, AlignLeft, Code2, Save } from 'lucide-react';
import { useIdeStore, IdeSettings } from '@/hooks/use-ide-store';

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-primary/10 last:border-0">
      <div className="flex-1 pr-8">
        <p className="text-sm font-mono text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function CyberToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 border ${
        checked ? 'bg-primary/20 border-primary' : 'bg-background border-primary/30'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
        checked ? 'translate-x-6 bg-primary shadow-[0_0_8px_#00ffff]' : 'bg-muted-foreground'
      }`} />
    </button>
  );
}

function CyberSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-background border border-primary/30 text-foreground text-sm font-mono px-3 py-1.5 rounded focus:outline-none focus:border-primary hover:border-primary/60 transition-colors"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function NumberStepper({ value, onChange, min, max, step = 1 }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-7 border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-colors flex items-center justify-center font-mono text-sm rounded"
      >−</button>
      <span className="w-8 text-center font-mono text-sm text-foreground">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-7 border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-colors flex items-center justify-center font-mono text-sm rounded"
      >+</button>
    </div>
  );
}

type SettingsSection = 'editor' | 'appearance' | 'files';

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, settings, updateSettings } = useIdeStore();
  const [activeSection, setActiveSection] = React.useState<SettingsSection>('editor');

  if (!settingsOpen) return null;

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'editor', label: 'Editor', icon: <Code2 className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Monitor className="w-4 h-4" /> },
    { id: 'files', label: 'Files', icon: <Save className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setSettingsOpen(false)}
      />
      <div className="relative w-[720px] max-w-[95vw] max-h-[85vh] bg-card border border-primary/30 shadow-[0_0_40px_rgba(0,255,255,0.15)] flex flex-col overflow-hidden rounded-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-background/80 shrink-0">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display tracking-widest text-primary neon-text-primary">SETTINGS</h2>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-1.5 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-40 shrink-0 border-r border-primary/20 bg-background/50 p-3 space-y-1">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-mono rounded transition-all ${
                  activeSection === s.id
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === 'editor' && (
              <div>
                <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-4 font-mono">Editor Preferences</h3>
                <SettingRow label="Font Size" description="Editor font size in pixels">
                  <NumberStepper value={settings.fontSize} onChange={v => updateSettings({ fontSize: v })} min={10} max={32} />
                </SettingRow>
                <SettingRow label="Tab Size" description="Number of spaces per tab">
                  <NumberStepper value={settings.tabSize} onChange={v => updateSettings({ tabSize: v })} min={1} max={8} />
                </SettingRow>
                <SettingRow label="Word Wrap" description="Control how lines wrap">
                  <CyberSelect
                    value={settings.wordWrap}
                    onChange={v => updateSettings({ wordWrap: v as IdeSettings['wordWrap'] })}
                    options={[
                      { value: 'off', label: 'Off' },
                      { value: 'on', label: 'On' },
                      { value: 'wordWrapColumn', label: 'Column' },
                      { value: 'bounded', label: 'Bounded' },
                    ]}
                  />
                </SettingRow>
                <SettingRow label="Line Numbers" description="Show line numbers in editor">
                  <CyberSelect
                    value={settings.lineNumbers}
                    onChange={v => updateSettings({ lineNumbers: v as IdeSettings['lineNumbers'] })}
                    options={[
                      { value: 'on', label: 'On' },
                      { value: 'off', label: 'Off' },
                      { value: 'relative', label: 'Relative' },
                    ]}
                  />
                </SettingRow>
                <SettingRow label="Minimap" description="Show the code minimap on the right">
                  <CyberToggle checked={settings.minimap} onChange={v => updateSettings({ minimap: v })} />
                </SettingRow>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div>
                <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-4 font-mono">UI Appearance</h3>
                <SettingRow label="Color Theme" description="IDE color scheme">
                  <CyberSelect
                    value={settings.theme}
                    onChange={v => updateSettings({ theme: v as IdeSettings['theme'] })}
                    options={[
                      { value: 'cyberpunk', label: 'Cyberpunk (Default)' },
                      { value: 'dark', label: 'Dark Matter' },
                      { value: 'light', label: 'Ghost Light' },
                    ]}
                  />
                </SettingRow>
                <div className="mt-6 p-4 border border-primary/20 bg-background/40 rounded-sm">
                  <p className="text-xs font-mono text-muted-foreground">Theme preview</p>
                  <div className="mt-3 space-y-1.5">
                    <div className="text-xs font-mono">
                      <span className="text-[#00ffff]">function</span>
                      <span className="text-foreground"> </span>
                      <span className="text-[#00ffc8]">init</span>
                      <span className="text-foreground">()</span>
                      <span className="text-primary"> {'{'}</span>
                    </div>
                    <div className="text-xs font-mono pl-4">
                      <span className="text-muted-foreground">// </span>
                      <span className="text-muted-foreground">System boot sequence</span>
                    </div>
                    <div className="text-xs font-mono pl-4">
                      <span className="text-[#ff6b35]">console</span>
                      <span className="text-foreground">.log(</span>
                      <span className="text-[#00ffc8]">"ONLINE"</span>
                      <span className="text-foreground">);</span>
                    </div>
                    <div className="text-xs font-mono">
                      <span className="text-primary">{'}'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'files' && (
              <div>
                <h3 className="text-xs uppercase tracking-widest text-primary/60 mb-4 font-mono">File Management</h3>
                <SettingRow label="Auto Save" description="Automatically save files after changes">
                  <CyberToggle checked={settings.autoSave} onChange={v => updateSettings({ autoSave: v })} />
                </SettingRow>
                <SettingRow label="Format on Save" description="Run code formatter when saving files">
                  <CyberToggle checked={settings.formatOnSave} onChange={v => updateSettings({ formatOnSave: v })} />
                </SettingRow>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-primary/20 bg-background/50 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground font-mono">Settings are saved automatically</p>
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-1.5 text-sm font-mono border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-all rounded-sm"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
