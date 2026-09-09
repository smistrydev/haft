import { create } from "zustand";
import type { HandleParams, SavedDesign } from "@/lib/handle/types";
import { defaultParams } from "@/lib/handle/presets";

const STORAGE_KEY = "haft.v3";

interface PersistShape {
  params: HandleParams;
  previewColor: string;
  saved: SavedDesign[];
  showHead: boolean;
  showDimensions: boolean;
  autoRotate: boolean;
}

function load(): Partial<PersistShape> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistShape;
  } catch {
    return {};
  }
}

interface HandleState extends PersistShape {
  presetId: string;
  frameNonce: number;
  setParam: <K extends keyof HandleParams>(key: K, value: HandleParams[K]) => void;
  setParams: (patch: Partial<HandleParams>) => void;
  applyPreset: (id: string, params: HandleParams) => void;
  setPreviewColor: (c: string) => void;
  setShowHead: (v: boolean) => void;
  setShowDimensions: (v: boolean) => void;
  setAutoRotate: (v: boolean) => void;
  frame: () => void;
  saveCurrent: (name: string) => void;
  loadSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
  reset: () => void;
}

function persist(s: HandleState) {
  if (typeof window === "undefined") return;
  const data: PersistShape = {
    params: s.params,
    previewColor: s.previewColor,
    saved: s.saved,
    showHead: s.showHead,
    showDimensions: s.showDimensions,
    autoRotate: s.autoRotate,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

const hydrated = load();

export const useHandleStore = create<HandleState>((set, get) => ({
  params: { ...defaultParams, ...hydrated.params, name: hydrated.params?.name ?? defaultParams.name },
  previewColor: hydrated.previewColor ?? "#e8dfd2",
  saved: hydrated.saved ?? [],
  showHead: hydrated.showHead ?? true,
  showDimensions: hydrated.showDimensions ?? true,
  autoRotate: hydrated.autoRotate ?? true,
  presetId: "paddle",
  frameNonce: 0,
  setParam: (key, value) => {
    set((s) => {
      const next = { ...s, params: { ...s.params, [key]: value } };
      persist(next);
      return next;
    });
  },
  setParams: (patch) => {
    set((s) => {
      const next = { ...s, params: { ...s.params, ...patch } };
      persist(next);
      return next;
    });
  },
  applyPreset: (id, params) => {
    set((s) => {
      const next = {
        ...s,
        presetId: id,
        params: { ...params },
        frameNonce: s.frameNonce + 1,
      };
      persist(next);
      return next;
    });
  },
  setPreviewColor: (c) => {
    set((s) => {
      const next = { ...s, previewColor: c };
      persist(next);
      return next;
    });
  },
  setShowHead: (v) => {
    set((s) => {
      const next = { ...s, showHead: v };
      persist(next);
      return next;
    });
  },
  setShowDimensions: (v) => {
    set((s) => {
      const next = { ...s, showDimensions: v };
      persist(next);
      return next;
    });
  },
  setAutoRotate: (v) => {
    set((s) => {
      const next = { ...s, autoRotate: v };
      persist(next);
      return next;
    });
  },
  frame: () => set((s) => ({ frameNonce: s.frameNonce + 1 })),
  saveCurrent: (name) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
    set((s) => {
      const item: SavedDesign = {
        id,
        name: name.trim() || s.params.name,
        params: { ...s.params, name: name.trim() || s.params.name },
        savedAt: Date.now(),
      };
      const next = { ...s, saved: [item, ...s.saved].slice(0, 24) };
      persist(next);
      return next;
    });
  },
  loadSaved: (id) => {
    const found = get().saved.find((d) => d.id === id);
    if (!found) return;
    set((s) => {
      const next = {
        ...s,
        params: { ...found.params },
        presetId: "custom",
        frameNonce: s.frameNonce + 1,
      };
      persist(next);
      return next;
    });
  },
  deleteSaved: (id) => {
    set((s) => {
      const next = { ...s, saved: s.saved.filter((d) => d.id !== id) };
      persist(next);
      return next;
    });
  },
  reset: () => {
    set((s) => {
      const next = {
        ...s,
        params: { ...defaultParams },
        presetId: "paddle",
        frameNonce: s.frameNonce + 1,
      };
      persist(next);
      return next;
    });
  },
}));
