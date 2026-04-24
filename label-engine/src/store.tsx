import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  LabelDocument,
  LabelElement,
  SavedTemplate,
  LabelSize,
} from "./types";
import { clone, sampleDocument, uid } from "./utils";

const HISTORY_LIMIT = 100;
const LS_DOC_KEY = "label-engine:current-doc";
const LS_TEMPLATES_KEY = "label-engine:templates";

interface EditorState {
  doc: LabelDocument;
  selectedIds: string[];
  snapToGrid: boolean;
  gridSize: number;
  showGuides: boolean;
  templates: SavedTemplate[];
}

interface StoreAPI extends EditorState {
  setDoc: (updater: (d: LabelDocument) => LabelDocument, commit?: boolean) => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  setSelection: (ids: string[]) => void;
  addElement: (el: LabelElement) => void;
  updateElement: (id: string, patch: Partial<LabelElement>, commit?: boolean) => void;
  updateElements: (patches: Record<string, Partial<LabelElement>>, commit?: boolean) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;

  setSize: (s: LabelSize) => void;
  setBackground: (color: string) => void;
  setBackgroundImage: (src: string | undefined) => void;
  setDocName: (n: string) => void;

  setSnap: (on: boolean) => void;
  setGridSize: (n: number) => void;
  setShowGuides: (on: boolean) => void;

  newDocument: () => void;
  loadDocument: (doc: LabelDocument) => void;
  saveProjectToDisk: () => void;
  loadProjectFromFile: (file: File) => Promise<void>;

  saveAsTemplate: (name: string, thumbnail?: string) => void;
  deleteTemplate: (id: string) => void;
  loadTemplate: (id: string) => void;
}

const StoreContext = createContext<StoreAPI | null>(null);

function loadTemplates(): SavedTemplate[] {
  try {
    const raw = localStorage.getItem(LS_TEMPLATES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function persistTemplates(list: SavedTemplate[]) {
  try {
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(list));
  } catch {
    // storage full or unavailable; fail silently
  }
}

function loadInitialDoc(): LabelDocument {
  try {
    const raw = localStorage.getItem(LS_DOC_KEY);
    if (raw) return JSON.parse(raw) as LabelDocument;
  } catch {
    /* ignore */
  }
  return sampleDocument();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [doc, setDocState] = useState<LabelDocument>(() => loadInitialDoc());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(8);
  const [showGuides, setShowGuides] = useState(true);
  const [templates, setTemplates] = useState<SavedTemplate[]>(() =>
    loadTemplates()
  );

  const past = useRef<LabelDocument[]>([]);
  const future = useRef<LabelDocument[]>([]);
  const lastCommitted = useRef<LabelDocument>(doc);

  const [, bump] = useState(0);
  const rerender = () => bump((x) => x + 1);

  const persist = useCallback((d: LabelDocument) => {
    try {
      localStorage.setItem(LS_DOC_KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, []);

  const setDoc = useCallback(
    (updater: (d: LabelDocument) => LabelDocument, commit = true) => {
      setDocState((prev) => {
        const next = updater(prev);
        if (commit) {
          past.current.push(lastCommitted.current);
          if (past.current.length > HISTORY_LIMIT) past.current.shift();
          future.current = [];
          lastCommitted.current = next;
          persist(next);
          rerender();
        }
        return next;
      });
    },
    [persist]
  );

  const commit = useCallback(() => {
    if (lastCommitted.current === doc) return;
    past.current.push(lastCommitted.current);
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
    lastCommitted.current = doc;
    persist(doc);
    rerender();
  }, [doc, persist]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(lastCommitted.current);
    lastCommitted.current = prev;
    setDocState(clone(prev));
    persist(prev);
    rerender();
  }, [persist]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(lastCommitted.current);
    lastCommitted.current = next;
    setDocState(clone(next));
    persist(next);
    rerender();
  }, [persist]);

  const setSelection = useCallback((ids: string[]) => setSelectedIds(ids), []);

  const addElement = useCallback(
    (el: LabelElement) => {
      setDoc((d) => ({ ...d, elements: [...d.elements, el] }));
      setSelectedIds([el.id]);
    },
    [setDoc]
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<LabelElement>, shouldCommit = true) => {
      setDoc(
        (d) => ({
          ...d,
          elements: d.elements.map((e) =>
            e.id === id ? ({ ...e, ...patch } as LabelElement) : e
          ),
        }),
        shouldCommit
      );
    },
    [setDoc]
  );

  const updateElements = useCallback(
    (patches: Record<string, Partial<LabelElement>>, shouldCommit = true) => {
      setDoc(
        (d) => ({
          ...d,
          elements: d.elements.map((e) =>
            patches[e.id] ? ({ ...e, ...patches[e.id] } as LabelElement) : e
          ),
        }),
        shouldCommit
      );
    },
    [setDoc]
  );

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length) return;
    setDoc((d) => ({
      ...d,
      elements: d.elements.filter((e) => !selectedIds.includes(e.id)),
    }));
    setSelectedIds([]);
  }, [selectedIds, setDoc]);

  const duplicateSelected = useCallback(() => {
    if (!selectedIds.length) return;
    const copies: LabelElement[] = [];
    setDoc((d) => {
      const newEls = [...d.elements];
      d.elements.forEach((e) => {
        if (selectedIds.includes(e.id)) {
          const c: LabelElement = {
            ...clone(e),
            id: uid(),
            x: e.x + 10,
            y: e.y + 10,
          };
          copies.push(c);
          newEls.push(c);
        }
      });
      return { ...d, elements: newEls };
    });
    setSelectedIds(copies.map((c) => c.id));
  }, [selectedIds, setDoc]);

  const reorder = useCallback(
    (mover: (els: LabelElement[], ids: string[]) => LabelElement[]) => {
      if (!selectedIds.length) return;
      setDoc((d) => ({ ...d, elements: mover(d.elements, selectedIds) }));
    },
    [selectedIds, setDoc]
  );

  const bringForward = useCallback(() => {
    reorder((els, ids) => {
      const out = [...els];
      for (let i = out.length - 2; i >= 0; i--) {
        if (ids.includes(out[i].id) && !ids.includes(out[i + 1].id)) {
          [out[i], out[i + 1]] = [out[i + 1], out[i]];
        }
      }
      return out;
    });
  }, [reorder]);

  const sendBackward = useCallback(() => {
    reorder((els, ids) => {
      const out = [...els];
      for (let i = 1; i < out.length; i++) {
        if (ids.includes(out[i].id) && !ids.includes(out[i - 1].id)) {
          [out[i], out[i - 1]] = [out[i - 1], out[i]];
        }
      }
      return out;
    });
  }, [reorder]);

  const bringToFront = useCallback(() => {
    reorder((els, ids) => [
      ...els.filter((e) => !ids.includes(e.id)),
      ...els.filter((e) => ids.includes(e.id)),
    ]);
  }, [reorder]);

  const sendToBack = useCallback(() => {
    reorder((els, ids) => [
      ...els.filter((e) => ids.includes(e.id)),
      ...els.filter((e) => !ids.includes(e.id)),
    ]);
  }, [reorder]);

  const setSize = useCallback(
    (s: LabelSize) => setDoc((d) => ({ ...d, size: s })),
    [setDoc]
  );
  const setBackground = useCallback(
    (color: string) => setDoc((d) => ({ ...d, background: color })),
    [setDoc]
  );
  const setBackgroundImage = useCallback(
    (src: string | undefined) => setDoc((d) => ({ ...d, backgroundImage: src })),
    [setDoc]
  );
  const setDocName = useCallback(
    (n: string) => setDoc((d) => ({ ...d, name: n })),
    [setDoc]
  );

  const newDocument = useCallback(() => {
    past.current = [];
    future.current = [];
    const d = sampleDocument();
    lastCommitted.current = d;
    setDocState(d);
    setSelectedIds([]);
    persist(d);
  }, [persist]);

  const loadDocument = useCallback(
    (d: LabelDocument) => {
      past.current.push(lastCommitted.current);
      future.current = [];
      const cloned = clone(d);
      cloned.id = uid();
      lastCommitted.current = cloned;
      setDocState(cloned);
      setSelectedIds([]);
      persist(cloned);
    },
    [persist]
  );

  const saveProjectToDisk = useCallback(() => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name || "label"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [doc]);

  const loadProjectFromFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      try {
        const parsed = JSON.parse(text) as LabelDocument;
        loadDocument(parsed);
      } catch (e) {
        alert("Invalid project file.");
      }
    },
    [loadDocument]
  );

  const saveAsTemplate = useCallback(
    (name: string, thumbnail?: string) => {
      const t: SavedTemplate = {
        id: uid(),
        name: name || doc.name || "Template",
        doc: clone(doc),
        createdAt: Date.now(),
        thumbnail,
      };
      const next = [t, ...templates];
      setTemplates(next);
      persistTemplates(next);
    },
    [doc, templates]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      const next = templates.filter((t) => t.id !== id);
      setTemplates(next);
      persistTemplates(next);
    },
    [templates]
  );

  const loadTemplate = useCallback(
    (id: string) => {
      const t = templates.find((x) => x.id === id);
      if (t) loadDocument(t.doc);
    },
    [templates, loadDocument]
  );

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  const api = useMemo<StoreAPI>(
    () => ({
      doc,
      selectedIds,
      snapToGrid,
      gridSize,
      showGuides,
      templates,
      setDoc,
      commit,
      undo,
      redo,
      canUndo,
      canRedo,
      setSelection,
      addElement,
      updateElement,
      updateElements,
      deleteSelected,
      duplicateSelected,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      setSize,
      setBackground,
      setBackgroundImage,
      setDocName,
      setSnap: setSnapToGrid,
      setGridSize,
      setShowGuides,
      newDocument,
      loadDocument,
      saveProjectToDisk,
      loadProjectFromFile,
      saveAsTemplate,
      deleteTemplate,
      loadTemplate,
    }),
    [
      doc,
      selectedIds,
      snapToGrid,
      gridSize,
      showGuides,
      templates,
      setDoc,
      commit,
      undo,
      redo,
      canUndo,
      canRedo,
      setSelection,
      addElement,
      updateElement,
      updateElements,
      deleteSelected,
      duplicateSelected,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      setSize,
      setBackground,
      setBackgroundImage,
      setDocName,
      newDocument,
      loadDocument,
      saveProjectToDisk,
      loadProjectFromFile,
      saveAsTemplate,
      deleteTemplate,
      loadTemplate,
    ]
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
