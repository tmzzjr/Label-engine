import { useCallback, useEffect, useRef, useState } from "react";
import { StoreProvider, useStore } from "./store";
import Toolbar from "./components/Toolbar";
import ElementsPanel from "./components/ElementsPanel";
import PropertiesPanel from "./components/PropertiesPanel";
import Canvas from "./components/Canvas";
import type { CanvasHandle } from "./components/Canvas";
import SizeSelector from "./components/SizeSelector";
import CreateLabelModal from "./components/CreateLabelModal";
import PreviewModal from "./components/PreviewModal";
import ExportModal from "./components/ExportModal";
import TemplatesPage from "./components/TemplatesPage";
import { renderRaster } from "./exporter";

function Editor() {
  const {
    doc,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    selectedIds,
    updateElement,
    currentTemplateId,
    currentLabelId,
    setLabelThumbnail,
  } = useStore();

  const [sizeOpen, setSizeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const canvasRef = useRef<CanvasHandle | null>(null);

  // Auto-capture thumbnail 900ms after last edit (debounced)
  useEffect(() => {
    if (!doc || !currentTemplateId || !currentLabelId) return;
    const timer = setTimeout(() => {
      const url = canvasRef.current?.toDataURL(0.6);
      if (url) setLabelThumbnail(currentTemplateId, currentLabelId, url);
    }, 900);
    return () => clearTimeout(timer);
  }, [doc, currentTemplateId, currentLabelId, setLabelThumbnail]);

  const openPreview = useCallback(async () => {
    if (!doc) return;
    setPreviewDataUrl(null);
    setPreviewOpen(true);
    try {
      const url = await renderRaster(doc, {
        dpi: 300,
        mimeType: "image/png",
        colorMode: "rgb",
      });
      setPreviewDataUrl(url);
      // also save as thumbnail of the current label
      if (currentTemplateId && currentLabelId) {
        setLabelThumbnail(currentTemplateId, currentLabelId, url);
      }
    } catch {
      setPreviewDataUrl(canvasRef.current?.toDataURL(2) ?? null);
    }
  }, [doc, currentTemplateId, currentLabelId, setLabelThumbnail]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (!inField) {
        if (
          (e.metaKey || e.ctrlKey) &&
          e.key.toLowerCase() === "z" &&
          !e.shiftKey
        ) {
          e.preventDefault();
          undo();
          return;
        }
        if (
          ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") ||
          ((e.metaKey || e.ctrlKey) &&
            e.shiftKey &&
            e.key.toLowerCase() === "z")
        ) {
          e.preventDefault();
          redo();
          return;
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          duplicateSelected();
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          if (selectedIds.length > 0) {
            e.preventDefault();
            deleteSelected();
            return;
          }
        }
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
          selectedIds.length > 0
        ) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx =
            e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy =
            e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          selectedIds.forEach((id) => {
            const el = doc?.elements.find((x) => x.id === id);
            if (!el) return;
            updateElement(id, { x: el.x + dx, y: el.y + dy });
          });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    selectedIds,
    updateElement,
    doc?.elements,
  ]);

  return (
    <div className="h-full flex flex-col">
      <Toolbar
        onOpenSize={() => setSizeOpen(true)}
        onOpenCreate={() => setCreateOpen(true)}
        onOpenPreview={openPreview}
      />
      <div className="flex-1 flex min-h-0">
        <ElementsPanel />
        <CanvasWithGrid canvasRef={canvasRef} />
        <PropertiesPanel />
      </div>

      <SizeSelector open={sizeOpen} onClose={() => setSizeOpen(false)} />
      <CreateLabelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <PreviewModal
        open={previewOpen}
        previewDataUrl={previewDataUrl}
        onClose={() => setPreviewOpen(false)}
        onConfirmExport={() => setExportOpen(true)}
      />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}

function CanvasWithGrid({
  canvasRef,
}: {
  canvasRef: React.Ref<CanvasHandle>;
}) {
  const { snapToGrid } = useStore();
  return <Canvas ref={canvasRef} showGrid={snapToGrid} />;
}

function Router() {
  const { view, currentTemplate, currentLabel } = useStore();
  if (view === "editor" && currentTemplate && currentLabel) {
    return <Editor />;
  }
  return <TemplatesPage />;
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
