import { create } from 'zustand';

export interface OpenFile {
  path: string;
  content: string;
  isDirty: boolean;
}

interface IdeState {
  // Active Project
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;

  // Editor State
  openFiles: OpenFile[];
  activeTab: string | null; // Can be a file path or 'LIVE_PREVIEW'
  
  openFile: (path: string, content: string) => void;
  closeFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileClean: (path: string) => void;
  setActiveTab: (tab: string | null) => void;

  // Panel States
  leftPanelSize: number;
  bottomPanelSize: number;
  rightPanelSize: number;
  
  setLeftPanelSize: (size: number) => void;
  setBottomPanelSize: (size: number) => void;
  setRightPanelSize: (size: number) => void;
}

export const useIdeStore = create<IdeState>((set) => ({
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
      activeTab: path
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
    openFiles: state.openFiles.map(f => f.path === path ? { ...f, content, isDirty: true } : f)
  })),
  
  markFileClean: (path) => set((state) => ({
    openFiles: state.openFiles.map(f => f.path === path ? { ...f, isDirty: false } : f)
  })),
  
  setActiveTab: (tab) => set({ activeTab: tab }),

  leftPanelSize: 20,
  bottomPanelSize: 25,
  rightPanelSize: 20,
  
  setLeftPanelSize: (size) => set({ leftPanelSize: size }),
  setBottomPanelSize: (size) => set({ bottomPanelSize: size }),
  setRightPanelSize: (size) => set({ rightPanelSize: size }),
}));
