import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  LabelDocument,
  LabelElement,
  LabelSize,
  SavedLabel,
  Template,
} from "./types";
import { clone, emptyDocument, starterDocument, uid } from "./utils";

const HISTORY_LIMIT = 100;
const LS_TEMPLATES_KEY = "label-engine:templates:v2";
const LS_VIEW_STATE_KEY = "label-engine:view-state:v2";

export type View = "templates" | "templateDetail" | "editor";

interface StoreAPI {
  // View routing
  view: View;
  goTemplates: () => void;
  openTemplate: (templateId: string) => void;
  openLabel: (templateId: string, labelId: string) => void;

  // Templates
  templates: Template[];
  currentTemplateId: string | null;
  currentLabelId: string | null;
  currentTemplate: Template | null;
  currentLabel: SavedLabel | null;
  doc: LabelDocument | null;

  createTemplate: (name: string) => void;
  renameTemplate: (id: string, name: string) => void;
  duplicateTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;

  createLabelInTemplate: (templateId: string, name?: string) => void;
  duplicateLabel: (templateId: string, labelId: string) => void;
  renameLabel: (templateId: string, labelId: string, name: string) => void;
  deleteLabel: (templateId: string, labelId: string) => void;
  setLabelThumbnail: (
    templateId: string,
    labelId: string,
    dataUrl: string
  ) => void;
  setTemplateThumbnail: (templateId: string, dataUrl: string) => void;

  // Editor ops on current doc
  selectedIds: string[];
  snapToGrid: boolean;
  gridSize: number;
  showGuides: boolean;

  setDoc: (
    updater: (d: LabelDocument) => LabelDocument,
    commit?: boolean
  ) => void;
  commit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  setSelection: (ids: string[]) => void;
  addElement: (el: LabelElement) => void;
  updateElement: (
    id: string,
    patch: Partial<LabelElement>,
    commit?: boolean
  ) => void;
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

  saveDocAsJson: () => void;
  loadDocFromFile: (file: File) => Promise<void>;
}

const StoreContext = createContext<StoreAPI | null>(null);

function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(LS_TEMPLATES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function persistTemplates(list: Template[]) {
  try {
    localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

interface ViewState {
  view: View;
  currentTemplateId: string | null;
  currentLabelId: string | null;
}
function loadViewState(): ViewState {
  try {
    const raw = localStorage.getItem(LS_VIEW_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { view: "templates", currentTemplateId: null, currentLabelId: null };
}
function persistViewState(v: ViewState) {
  try {
    localStorage.setItem(LS_VIEW_STATE_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<Template[]>(() => loadTemplates());
  const initialView = loadViewState();
  const [view, setView] = useState<View>(initialView.view);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(
    initialView.currentTemplateId
  );
  const [currentLabelId, setCurrentLabelId] = useState<string | null>(
    initialView.currentLabelId
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(8);
  const [showGuides, setShowGuides] = useState(true);

  const past = useRef<LabelDocument[]>([]);
  const future = useRef<LabelDocument[]>([]);
  const lastCommitted = useRef<LabelDocument | null>(null);

  // Persist view state
  useEffect(() => {
    persistViewState({ view, currentTemplateId, currentLabelId });
  }, [view, currentTemplateId, currentLabelId]);

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === currentTemplateId) ?? null,
    [templates, currentTemplateId]
  );
  const currentLabel = useMemo(
    () =>
      currentTemplate?.labels.find((l) => l.id === currentLabelId) ?? null,
    [currentTemplate, currentLabelId]
  );

  const doc = currentLabel?.doc ?? null;

  // When current label changes, reset history
  useEffect(() => {
    past.current = [];
    future.current = [];
    lastCommitted.current = doc ? clone(doc) : null;
    setSelectedIds([]);
  }, [currentLabelId, currentTemplateId]);

  const writeDoc = useCallback(
    (next: LabelDocument) => {
      setTemplates((tpls) =>
        tpls.map((t) =>
          t.id === currentTemplateId
            ? {
                ...t,
                labels: t.labels.map((l) =>
                  l.id === currentLabelId
                    ? { ...l, doc: next, updatedAt: Date.now() }
                    : l
                ),
              }
            : t
        )
      );
    },
    [currentTemplateId, currentLabelId]
  );

  // Persist templates when changed
  useEffect(() => {
    persistTemplates(templates);
  }, [templates]);

  const setDoc = useCallback(
    (updater: (d: LabelDocument) => LabelDocument, shouldCommit = true) => {
      let computedNext: LabelDocument | null = null;
      setTemplates((tpls) =>
        tpls.map((t) => {
          if (t.id !== currentTemplateId) return t;
          return {
            ...t,
            labels: t.labels.map((l) => {
              if (l.id !== currentLabelId) return l;
              const newDoc = updater(l.doc);
              computedNext = newDoc;
              return { ...l, doc: newDoc, updatedAt: Date.now() };
            }),
          };
        })
      );
      if (shouldCommit && computedNext) {
        if (lastCommitted.current)
          past.current.push(clone(lastCommitted.current));
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
        future.current = [];
        lastCommitted.current = clone(computedNext);
      }
    },
    [currentTemplateId, currentLabelId]
  );

  const commit = useCallback(() => {
    if (!doc) return;
    if (
      lastCommitted.current &&
      JSON.stringify(lastCommitted.current) === JSON.stringify(doc)
    )
      return;
    if (lastCommitted.current) past.current.push(clone(lastCommitted.current));
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
    lastCommitted.current = clone(doc);
  }, [doc]);

  const undo = useCallback(() => {
    if (!doc) return;
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(clone(doc));
    lastCommitted.current = clone(prev);
    writeDoc(prev);
  }, [doc, writeDoc]);

  const redo = useCallback(() => {
    if (!doc) return;
    const nx = future.current.pop();
    if (!nx) return;
    past.current.push(clone(doc));
    lastCommitted.current = clone(nx);
    writeDoc(nx);
  }, [doc, writeDoc]);

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
    (c: string) => setDoc((d) => ({ ...d, background: c })),
    [setDoc]
  );
  const setBackgroundImage = useCallback(
    (src: string | undefined) => setDoc((d) => ({ ...d, backgroundImage: src })),
    [setDoc]
  );
  const setDocName = useCallback(
    (n: string) => {
      setDoc((d) => ({ ...d, name: n }));
      if (currentTemplateId && currentLabelId) {
        setTemplates((tpls) =>
          tpls.map((t) =>
            t.id === currentTemplateId
              ? {
                  ...t,
                  labels: t.labels.map((l) =>
                    l.id === currentLabelId ? { ...l, name: n } : l
                  ),
                }
              : t
          )
        );
      }
    },
    [setDoc, currentTemplateId, currentLabelId]
  );

  // Template CRUD
  const createTemplate = useCallback((name: string) => {
    const labelId = uid();
    const templateId = uid();
    const base = starterDocument(name);
    const newTpl: Template = {
      id: templateId,
      name,
      labels: [
        {
          id: labelId,
          name: "Label 1",
          doc: base,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
    };
    setTemplates((t) => [newTpl, ...t]);
    setCurrentTemplateId(templateId);
    setCurrentLabelId(labelId);
    setView("editor");
  }, []);

  const renameTemplate = useCallback((id: string, name: string) => {
    setTemplates((t) => t.map((x) => (x.id === id ? { ...x, name } : x)));
  }, []);

  const duplicateTemplate = useCallback((id: string) => {
    setTemplates((tpls) => {
      const src = tpls.find((t) => t.id === id);
      if (!src) return tpls;
      const copy: Template = {
        ...clone(src),
        id: uid(),
        name: `${src.name} (copy)`,
        createdAt: Date.now(),
        labels: src.labels.map((l) => ({
          ...clone(l),
          id: uid(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          doc: { ...clone(l.doc), id: uid() },
        })),
      };
      return [copy, ...tpls];
    });
  }, []);

  const deleteTemplate = useCallback(
    (id: string) => {
      setTemplates((t) => t.filter((x) => x.id !== id));
      if (currentTemplateId === id) {
        setCurrentTemplateId(null);
        setCurrentLabelId(null);
        setView("templates");
      }
    },
    [currentTemplateId]
  );

  const createLabelInTemplate = useCallback(
    (templateId: string, name = "New Label") => {
      const tpl = templates.find((t) => t.id === templateId);
      if (!tpl) return;
      // Copy base doc from first label or empty
      const baseDoc = tpl.labels[0]?.doc
        ? { ...clone(tpl.labels[0].doc), id: uid(), name }
        : emptyDocument(name);
      const newLabel: SavedLabel = {
        id: uid(),
        name,
        doc: baseDoc,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setTemplates((tpls) =>
        tpls.map((t) =>
          t.id === templateId
            ? { ...t, labels: [...t.labels, newLabel] }
            : t
        )
      );
      setCurrentTemplateId(templateId);
      setCurrentLabelId(newLabel.id);
      setView("editor");
    },
    [templates]
  );

  const duplicateLabel = useCallback(
    (templateId: string, labelId: string) => {
      setTemplates((tpls) =>
        tpls.map((t) => {
          if (t.id !== templateId) return t;
          const src = t.labels.find((l) => l.id === labelId);
          if (!src) return t;
          const dup: SavedLabel = {
            ...clone(src),
            id: uid(),
            name: `${src.name} (copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            doc: { ...clone(src.doc), id: uid() },
          };
          return { ...t, labels: [...t.labels, dup] };
        })
      );
    },
    []
  );

  const renameLabel = useCallback(
    (templateId: string, labelId: string, name: string) => {
      setTemplates((tpls) =>
        tpls.map((t) =>
          t.id === templateId
            ? {
                ...t,
                labels: t.labels.map((l) =>
                  l.id === labelId ? { ...l, name, doc: { ...l.doc, name } } : l
                ),
              }
            : t
        )
      );
    },
    []
  );

  const deleteLabel = useCallback(
    (templateId: string, labelId: string) => {
      let nextLabelId: string | null = null;
      setTemplates((tpls) =>
        tpls.map((t) => {
          if (t.id !== templateId) return t;
          const idx = t.labels.findIndex((l) => l.id === labelId);
          const remaining = t.labels.filter((l) => l.id !== labelId);
          if (idx >= 0 && remaining.length > 0) {
            const fallback = remaining[idx] ?? remaining[idx - 1] ?? remaining[0];
            nextLabelId = fallback.id;
          }
          return { ...t, labels: remaining };
        })
      );
      if (currentLabelId === labelId) {
        if (nextLabelId) {
          setCurrentLabelId(nextLabelId);
        } else {
          setCurrentLabelId(null);
          setView("templateDetail");
        }
      }
    },
    [currentLabelId]
  );

  const setLabelThumbnail = useCallback(
    (templateId: string, labelId: string, dataUrl: string) => {
      setTemplates((tpls) =>
        tpls.map((t) =>
          t.id === templateId
            ? {
                ...t,
                labels: t.labels.map((l) =>
                  l.id === labelId ? { ...l, thumbnail: dataUrl } : l
                ),
              }
            : t
        )
      );
    },
    []
  );

  const setTemplateThumbnail = useCallback(
    (templateId: string, dataUrl: string) => {
      setTemplates((tpls) =>
        tpls.map((t) =>
          t.id === templateId ? { ...t, thumbnail: dataUrl } : t
        )
      );
    },
    []
  );

  // Navigation
  const goTemplates = useCallback(() => setView("templates"), []);
  const openTemplate = useCallback((id: string) => {
    setCurrentTemplateId(id);
    setView("templateDetail");
  }, []);
  const openLabel = useCallback((tid: string, lid: string) => {
    setCurrentTemplateId(tid);
    setCurrentLabelId(lid);
    setView("editor");
  }, []);

  // Save/load current doc
  const saveDocAsJson = useCallback(() => {
    if (!doc) return;
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

  const loadDocFromFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      try {
        const parsed = JSON.parse(text) as LabelDocument;
        if (currentTemplateId && currentLabelId) {
          writeDoc({ ...parsed, id: uid() });
        } else {
          // import as new template
          const labelId = uid();
          const templateId = uid();
          const tpl: Template = {
            id: templateId,
            name: parsed.name || "Imported Template",
            labels: [
              {
                id: labelId,
                name: parsed.name || "Label 1",
                doc: { ...parsed, id: uid() },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ],
            createdAt: Date.now(),
          };
          setTemplates((t) => [tpl, ...t]);
          setCurrentTemplateId(templateId);
          setCurrentLabelId(labelId);
          setView("editor");
        }
      } catch {
        alert("Invalid project file.");
      }
    },
    [currentTemplateId, currentLabelId, writeDoc]
  );

  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  const api = useMemo<StoreAPI>(
    () => ({
      view,
      goTemplates,
      openTemplate,
      openLabel,
      templates,
      currentTemplateId,
      currentLabelId,
      currentTemplate,
      currentLabel,
      doc,
      createTemplate,
      renameTemplate,
      duplicateTemplate,
      deleteTemplate,
      createLabelInTemplate,
      duplicateLabel,
      renameLabel,
      deleteLabel,
      setLabelThumbnail,
      setTemplateThumbnail,
      selectedIds,
      snapToGrid,
      gridSize,
      showGuides,
      setDoc,
      commit,
      undo,
      redo,
      canUndo,
      canRedo,
      setSelection: setSelectedIds,
      addElement,
      updateElement,
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
      saveDocAsJson,
      loadDocFromFile,
    }),
    [
      view,
      goTemplates,
      openTemplate,
      openLabel,
      templates,
      currentTemplateId,
      currentLabelId,
      currentTemplate,
      currentLabel,
      doc,
      createTemplate,
      renameTemplate,
      duplicateTemplate,
      deleteTemplate,
      createLabelInTemplate,
      duplicateLabel,
      renameLabel,
      deleteLabel,
      setLabelThumbnail,
      setTemplateThumbnail,
      selectedIds,
      snapToGrid,
      gridSize,
      showGuides,
      setDoc,
      commit,
      undo,
      redo,
      canUndo,
      canRedo,
      addElement,
      updateElement,
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
      saveDocAsJson,
      loadDocFromFile,
    ]
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
