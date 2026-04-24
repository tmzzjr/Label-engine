import { useRef } from "react";
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  FilePlus,
  Ruler,
  Grid3X3,
  Tag,
  Eye,
  Download,
  LayoutTemplate,
} from "lucide-react";
import { useStore } from "../store";

interface Props {
  onOpenSize: () => void;
  onOpenCreate: () => void;
  onOpenPreview: () => void;
  onOpenExport: () => void;
  onOpenTemplates: () => void;
}

export default function Toolbar({
  onOpenSize,
  onOpenCreate,
  onOpenPreview,
  onOpenExport,
  onOpenTemplates,
}: Props) {
  const {
    doc,
    setDocName,
    undo,
    redo,
    canUndo,
    canRedo,
    saveProjectToDisk,
    loadProjectFromFile,
    newDocument,
    snapToGrid,
    setSnap,
  } = useStore();
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <header className="h-14 flex-shrink-0 flex items-center gap-2 border-b border-brand-200 bg-white px-4">
      <div className="flex items-center gap-2 pr-3 border-r border-brand-100">
        <div className="w-8 h-8 rounded-md bg-brand-700 text-white flex items-center justify-center font-bold">
          L
        </div>
        <span className="font-semibold text-brand-800">Label Engine</span>
      </div>

      <input
        className="input w-56"
        value={doc.name}
        onChange={(e) => setDocName(e.target.value)}
        placeholder="Nome do label"
      />

      <div className="flex items-center gap-1 pl-2">
        <button
          className="icon-btn"
          title="Desfazer (Ctrl+Z)"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 size={18} />
        </button>
        <button
          className="icon-btn"
          title="Refazer (Ctrl+Y)"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 size={18} />
        </button>
      </div>

      <div className="flex items-center gap-1 pl-2 border-l border-brand-100">
        <button className="btn-ghost" title="Novo projeto" onClick={newDocument}>
          <FilePlus size={16} /> Novo
        </button>
        <button
          className="btn-ghost"
          title="Abrir projeto (.json)"
          onClick={() => fileRef.current?.click()}
        >
          <FolderOpen size={16} /> Abrir
        </button>
        <button
          className="btn-ghost"
          title="Salvar projeto como .json"
          onClick={saveProjectToDisk}
        >
          <Save size={16} /> Salvar
        </button>
        <button
          className="btn-ghost"
          title="Templates salvos"
          onClick={onOpenTemplates}
        >
          <LayoutTemplate size={16} /> Templates
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadProjectFromFile(f);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div className="flex items-center gap-1 pl-2 border-l border-brand-100">
        <button className="btn-ghost" onClick={onOpenSize} title="Tamanho do label">
          <Ruler size={16} /> Tamanho
        </button>
        <button
          className={`btn-ghost ${snapToGrid ? "bg-brand-100" : ""}`}
          onClick={() => setSnap(!snapToGrid)}
          title="Snap to grid"
        >
          <Grid3X3 size={16} /> Grid
        </button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button className="btn-secondary" onClick={onOpenPreview}>
          <Eye size={16} /> Preview
        </button>
        <button className="btn-primary" onClick={onOpenCreate}>
          <Tag size={16} /> Criar Label
        </button>
        <button className="btn-primary" onClick={onOpenExport}>
          <Download size={16} /> Exportar
        </button>
      </div>
    </header>
  );
}
