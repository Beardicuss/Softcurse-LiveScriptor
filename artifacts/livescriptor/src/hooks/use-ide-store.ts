import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OpenFile {
  path: string;
  content: string;
  isDirty: boolean;
}

export interface IdeSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  autoSave: boolean;
  theme: 'cyberpunk' | 'dark' | 'light';
  lineNumbers: 'on' | 'off' | 'relative';
  formatOnSave: boolean;
}

const DEFAULT_SETTINGS: IdeSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
  autoSave: true,
  theme: 'cyberpunk',
  lineNumbers: 'on',
  formatOnSave: false,
};

export type LeftPanelView = 'explorer' | 'search' | 'http';

interface IdeState {
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;

  openFiles: OpenFile[];
  activeTab: string | null;

  openFile: (path: string, content: string) => void;
  closeFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileClean: (path: string) => void;
  setActiveTab: (tab: string | null) => void;

  leftPanelSize: number;
  bottomPanelSize: number;
  rightPanelSize: number;

  setLeftPanelSize: (size: number) => void;
  setBottomPanelSize: (size: number) => void;
  setRightPanelSize: (size: number) => void;

  leftPanelView: LeftPanelView;
  setLeftPanelView: (view: LeftPanelView) => void;

  settings: IdeSettings;
  updateSettings: (patch: Partial<IdeSettings>) => void;

  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useIdeStore = create<IdeState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      setActiveProject: (id) => set({ activeProjectId: id, openFiles: [], activeTab: null }),

      openFiles: [],
      activeTab: null,

      openFile: (path, content) => set((state) => {
        if (state.openFiles.find(f => f.path === path)) {
          return { activeTab: path };
        }
        return {
          openFiles: [...state.openFiles, { path, content, isDirty: false }],
          activeTab: path,
        };
      }),

      closeFile: (path) => set((state) => {
        const newFiles = state.openFiles.filter(f => f.path !== path);
        let newActive = state.activeTab;
        if (newActive === path) {
          newActive = newFiles.length > 0 ? newFiles[newFiles.length - 1].path : null;
        }
        return { openFiles: newFiles, activeTab: newActive };
      }),

      updateFileContent: (path, content) => set((state) => ({
        openFiles: state.openFiles.map(f => f.path === path ? { ...f, content, isDirty: true } : f),
      })),

      markFileClean: (path) => set((state) => ({
        openFiles: state.openFiles.map(f => f.path === path ? { ...f, isDirty: false } : f),
      })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      leftPanelSize: 20,
      bottomPanelSize: 25,
      rightPanelSize: 20,

      setLeftPanelSize: (size) => set({ leftPanelSize: size }),
      setBottomPanelSize: (size) => set({ bottomPanelSize: size }),
      setRightPanelSize: (size) => set({ rightPanelSize: size }),

      leftPanelView: 'explorer',
      setLeftPanelView: (view) => set({ leftPanelView: view }),

      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

      settingsOpen: false,
      setSettingsOpen: (open) => set({ settingsOpen: open }),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'livescriptor-ide-state',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
