import { useRef } from "react";
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Ruler,
  Grid3X3,
  Tag,
  Eye,
  Download,
  ArrowLeft,
} from "lucide-react";
import { useStore } from "../store";

interface Props {
  onOpenSize: () => void;
  onOpenCreate: () => void;
  onOpenPreview: () => void;
}

export default function Toolbar({
  onOpenSize,
  onOpenCreate,
  onOpenPreview,
}: Props) {
  const {
    doc,
    currentTemplate,
    setDocName,
    undo,
    redo,
    canUndo,
    canRedo,
    saveDocAsJson,
    loadDocFromFile,
    snapToGrid,
    setSnap,
    goTemplates,
    openTemplate,
    currentTemplateId,
  } = useStore();
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="h-14 flex-shrink-0 flex items-center gap-2 border-b border-border bg-surface px-4">
      <button
        className="icon-btn"
        title="Back to template"
        onClick={() =>
          currentTemplateId ? openTemplate(currentTemplateId) : goTemplates()
        }
      >
        <ArrowLeft size={18} />
      </button>

      <div className="flex items-center gap-2 pr-3 border-r border-border">
        <div className="w-8 h-8 rounded-md bg-accent text-white flex items-center justify-center font-bold">
          L
        </div>
        <span className="font-semibold text-fg">Label Engine</span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button
          className="text-muted hover:text-fg"
          onClick={goTemplates}
          title="All templates"
        >
          Templates
        </button>
        <span className="text-subtle">/</span>
        {currentTemplate && (
          <>
            <button
              className="text-muted hover:text-fg"
              onClick={() =>
                currentTemplateId && openTemplate(currentTemplateId)
              }
            >
              {currentTemplate.name}
            </button>
            <span className="text-subtle">/</span>
          </>
        )}
        <input
          className="input w-56 py-1"
          value={doc?.name ?? ""}
          onChange={(e) => setDocName(e.target.value)}
          placeholder="Label name"
        />
      </div>

      <div className="flex items-center gap-1 pl-2 border-l border-border">
        <button
          className="btn-ghost"
          title="Open project (.json)"
          onClick={() => fileRef.current?.click()}
        >
          <FolderOpen size={16} /> Open
        </button>
        <button
          className="btn-ghost"
          title="Save project as .json"
          onClick={saveDocAsJson}
        >
          <Save size={16} /> Save
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadDocFromFile(f);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="flex items-center gap-1 pl-2 border-l border-border">
        <button className="btn-ghost" onClick={onOpenSize} title="Label size">
          <Ruler size={16} /> Size
        </button>
        <button
          className={`btn-ghost ${snapToGrid ? "bg-surface2" : ""}`}
          onClick={() => setSnap(!snapToGrid)}
          title="Snap to grid"
        >
          <Grid3X3 size={16} /> Grid
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button className="btn-secondary" onClick={onOpenCreate}>
          <Tag size={16} /> Create Label
        </button>
        <button className="btn-secondary" onClick={onOpenPreview}>
          <Eye size={16} /> Preview
        </button>
        <button className="btn-primary" onClick={onOpenPreview}>
          <Download size={16} /> Export
        </button>
      </div>

      <div className="flex items-center gap-1 pl-2 ml-2 border-l border-border">
        <button
          className="icon-btn"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 size={18} />
        </button>
        <button
          className="icon-btn"
          title="Redo (Ctrl+Y)"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 size={18} />
        </button>
      </div>
    </header>
  );
}
