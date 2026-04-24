import { useRef, useState } from "react";
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
  ChevronDown,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { useStore } from "../store";

interface Props {
  onOpenSize: () => void;
  onOpenCreate: () => void;
  onOpenPreview: () => void;
  leftOpen: boolean;
  setLeftOpen: (v: boolean) => void;
  rightOpen: boolean;
  setRightOpen: (v: boolean) => void;
}

export default function Toolbar({
  onOpenSize,
  onOpenCreate,
  onOpenPreview,
  leftOpen,
  setLeftOpen,
  rightOpen,
  setRightOpen,
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-14 flex-shrink-0 flex items-center gap-1 border-b border-border bg-surface px-2 sm:px-4">
      {/* Mobile Sidebar Toggles */}
      <button
        className={`icon-btn lg:hidden ${leftOpen ? "icon-btn-active" : ""}`}
        onClick={() => setLeftOpen(!leftOpen)}
        title="Elements"
      >
        <PanelLeft size={20} />
      </button>

      <button
        className="icon-btn"
        title="Back to template"
        onClick={() =>
          currentTemplateId ? openTemplate(currentTemplateId) : goTemplates()
        }
      >
        <ArrowLeft size={18} />
      </button>

      <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-border ml-1">
        <img src="/logo.png" alt="outfitMD Logo" className="h-7 w-auto" />
      </div>

      <div className="flex items-center gap-1 sm:gap-2 text-sm ml-1 min-w-0 flex-1 sm:flex-initial">
        <button
          className="text-muted hover:text-fg hidden md:block whitespace-nowrap"
          onClick={goTemplates}
          title="All templates"
        >
          Templates
        </button>
        <span className="text-subtle hidden md:block">/</span>
        {currentTemplate && (
          <>
            <button
              className="text-muted hover:text-fg hidden lg:block truncate max-w-[100px]"
              onClick={() =>
                currentTemplateId && openTemplate(currentTemplateId)
              }
            >
              {currentTemplate.name}
            </button>
            <span className="text-subtle hidden lg:block">/</span>
          </>
        )}
        <input
          className="input w-32 sm:w-48 lg:w-56 py-1 h-8 sm:h-9"
          value={doc?.name ?? ""}
          onChange={(e) => setDocName(e.target.value)}
          placeholder="Label name"
        />
      </div>

      <div className="flex-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 pr-1 sm:pr-2 mr-1 sm:mr-2 border-r border-border">
        <button
          className="icon-btn w-7 h-7 sm:w-8 sm:h-8"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 size={16} />
        </button>
        <button
          className="icon-btn w-7 h-7 sm:w-8 sm:h-8"
          title="Redo (Ctrl+Y)"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Main Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          className="btn-secondary hidden sm:flex h-8 sm:h-9"
          onClick={onOpenCreate}
        >
          <Tag size={16} /> <span className="hidden xl:inline">Create Label</span>
        </button>
        <button
          className="btn-secondary h-8 sm:h-9 px-2 sm:px-3"
          onClick={onOpenPreview}
          title="Preview"
        >
          <Eye size={16} /> <span className="hidden md:inline">Preview</span>
        </button>
        <button
          className="btn-primary h-8 sm:h-9 px-2 sm:px-3"
          onClick={onOpenPreview}
          title="Export"
        >
          <Download size={16} /> <span className="hidden md:inline">Export</span>
        </button>
      </div>

      {/* Overflow Menu */}
      <div className="relative ml-1 sm:ml-2 pl-1 sm:pl-2 border-l border-border flex items-center gap-1">
        <button
          className="icon-btn sm:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <ChevronDown size={18} className={menuOpen ? "rotate-180" : ""} />
        </button>

        <div className="hidden sm:flex items-center gap-1">
          <button
            className="icon-btn"
            title="Open project (.json)"
            onClick={() => fileRef.current?.click()}
          >
            <FolderOpen size={16} />
          </button>
          <button
            className="icon-btn"
            title="Save project as .json"
            onClick={saveDocAsJson}
          >
            <Save size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={onOpenSize}
            title="Label size"
          >
            <Ruler size={16} />
          </button>
          <button
            className={`icon-btn ${snapToGrid ? "icon-btn-active" : ""}`}
            onClick={() => setSnap(!snapToGrid)}
            title="Snap to grid"
          >
            <Grid3X3 size={16} />
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-xl z-50 p-2 sm:hidden">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface2 rounded"
              onClick={() => {
                fileRef.current?.click();
                setMenuOpen(false);
              }}
            >
              <FolderOpen size={16} /> Open Project
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface2 rounded"
              onClick={() => {
                saveDocAsJson();
                setMenuOpen(false);
              }}
            >
              <Save size={16} /> Save Project
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface2 rounded"
              onClick={() => {
                onOpenSize();
                setMenuOpen(false);
              }}
            >
              <Ruler size={16} /> Label Size
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface2 rounded"
              onClick={() => {
                setSnap(!snapToGrid);
                setMenuOpen(false);
              }}
            >
              <Grid3X3 size={16} /> {snapToGrid ? "Disable Grid" : "Enable Grid"}
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface2 rounded sm:hidden"
              onClick={() => {
                onOpenCreate();
                setMenuOpen(false);
              }}
            >
              <Tag size={16} /> Create Label
            </button>
          </div>
        )}

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

      {/* Right Sidebar Toggle */}
      <button
        className={`icon-btn lg:hidden ml-1 ${rightOpen ? "icon-btn-active" : ""}`}
        onClick={() => setRightOpen(!rightOpen)}
        title="Properties"
      >
        <PanelRight size={20} />
      </button>
    </header>
  );
}
