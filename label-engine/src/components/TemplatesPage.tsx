import { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  ArrowLeft,
  Pencil,
  LayoutTemplate,
  Tag,
} from "lucide-react";
import { useStore } from "../store";

function EmptyThumb() {
  return (
    <div className="w-full h-full flex items-center justify-center text-subtle text-xs">
      <LayoutTemplate size={32} strokeWidth={1.2} />
    </div>
  );
}

function Card({
  thumb,
  title,
  subtitle,
  onOpen,
  onDuplicate,
  onDelete,
  onRename,
  ratio = "7/3",
}: {
  thumb?: string;
  title: string;
  subtitle?: string;
  onOpen: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onRename?: (name: string) => void;
  ratio?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const commit = () => {
    setEditing(false);
    if (onRename && draft.trim() && draft !== title) onRename(draft.trim());
  };
  return (
    <div className="card overflow-hidden group relative">
      <button
        className="block w-full bg-surface2 hover:bg-surface transition overflow-hidden flex items-center justify-center p-2"
        style={{ aspectRatio: ratio }}
        onClick={onOpen}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={title}
            className="max-w-full max-h-full object-contain bg-white shadow"
          />
        ) : (
          <EmptyThumb />
        )}
      </button>
      <div className="p-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              className="input py-1 text-sm"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <>
              <div className="text-sm font-medium text-fg truncate">{title}</div>
              {subtitle && (
                <div className="text-[11px] text-muted truncate">{subtitle}</div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
          {onRename && !editing && (
            <button
              className="icon-btn"
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                setDraft(title);
                setEditing(true);
              }}
            >
              <Pencil size={14} />
            </button>
          )}
          {onDuplicate && (
            <button
              className="icon-btn"
              title="Duplicate"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy size={14} />
            </button>
          )}
          {onDelete && (
            <button
              className="icon-btn hover:text-danger"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this?")) onDelete();
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NewCard({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="card overflow-hidden flex flex-col items-center justify-center gap-2 bg-surface hover:bg-surface2 border-dashed text-muted hover:text-fg transition min-h-[180px]"
    >
      <div className="w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center">
        <Plus size={24} />
      </div>
      <div className="text-sm font-medium">{label}</div>
    </button>
  );
}

export default function TemplatesPage() {
  const {
    view,
    templates,
    currentTemplate,
    goTemplates,
    openTemplate,
    openLabel,
    createTemplate,
    duplicateTemplate,
    deleteTemplate,
    renameTemplate,
    createLabelInTemplate,
    duplicateLabel,
    deleteLabel,
    renameLabel,
  } = useStore();

  const [creatingTpl, setCreatingTpl] = useState(false);
  const [newTplName, setNewTplName] = useState("");

  const isDetail = view === "templateDetail" && currentTemplate;

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Top nav — logo anchored left (same slot as editor toolbar) */}
      <header className="h-14 px-2 sm:px-4 flex items-center gap-1 border-b border-border bg-surface flex-shrink-0">
        <button
          className="flex items-center gap-2 pr-3 border-r border-border flex-shrink-0 w-40 hover:opacity-80 transition"
          onClick={goTemplates}
          title="Templates home"
        >
          <img src="/logo.png" alt="outfitMD Logo" className="h-7 w-auto" />
        </button>
        {isDetail && (
          <button className="icon-btn ml-1" title="Back" onClick={goTemplates}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base min-w-0 ml-2">
          {isDetail ? (
            <>
              <button
                className="text-muted hover:text-fg whitespace-nowrap truncate"
                onClick={goTemplates}
              >
                Templates
              </button>
              <span className="text-muted">/</span>
              <span className="font-medium truncate">
                {currentTemplate!.name}
              </span>
            </>
          ) : (
            <span className="font-medium">Templates</span>
          )}
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8">
        {!isDetail ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold">Templates</h1>
                <p className="text-muted text-xs sm:text-sm mt-1">
                  Choose a template to edit, or start from scratch. Each
                  template can contain multiple label variants.
                </p>
              </div>
            </div>

            {creatingTpl ? (
              <div className="card p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  autoFocus
                  className="input flex-1"
                  placeholder="Template name…"
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTplName.trim()) {
                      createTemplate(newTplName.trim());
                      setNewTplName("");
                      setCreatingTpl(false);
                    }
                    if (e.key === "Escape") {
                      setCreatingTpl(false);
                      setNewTplName("");
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    className="btn-primary flex-1 sm:flex-initial"
                    disabled={!newTplName.trim()}
                    onClick={() => {
                      createTemplate(newTplName.trim());
                      setNewTplName("");
                      setCreatingTpl(false);
                    }}
                  >
                    Create
                  </button>
                  <button
                    className="btn-ghost flex-1 sm:flex-initial"
                    onClick={() => {
                      setCreatingTpl(false);
                      setNewTplName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NewCard
                onClick={() => setCreatingTpl(true)}
                label="New Template"
              />
              {templates.map((t) => {
                const firstThumb = t.thumbnail ?? t.labels[0]?.thumbnail;
                return (
                  <Card
                    key={t.id}
                    thumb={firstThumb}
                    title={t.name}
                    subtitle={`${t.labels.length} label${
                      t.labels.length === 1 ? "" : "s"
                    }`}
                    onOpen={() => openTemplate(t.id)}
                    onDuplicate={() => duplicateTemplate(t.id)}
                    onDelete={() => deleteTemplate(t.id)}
                    onRename={(n) => renameTemplate(t.id, n)}
                  />
                );
              })}
            </div>

            {templates.length === 0 && !creatingTpl && (
              <div className="text-center text-muted text-sm mt-12">
                No templates yet. Click <strong>New Template</strong> to start.
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-3">
                  <Tag size={20} className="text-accent" />
                  {currentTemplate!.name}
                </h1>
                <p className="text-muted text-xs sm:text-sm mt-1">
                  Labels in this template. Each one shares the template design
                  but can have different text, SKU, QR code, etc.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <NewCard
                onClick={() =>
                  createLabelInTemplate(currentTemplate!.id, "New Label")
                }
                label="New Label"
              />
              {currentTemplate!.labels.map((l) => (
                <Card
                  key={l.id}
                  thumb={l.thumbnail}
                  title={l.name}
                  subtitle={new Date(l.updatedAt).toLocaleString()}
                  onOpen={() => openLabel(currentTemplate!.id, l.id)}
                  onDuplicate={() =>
                    duplicateLabel(currentTemplate!.id, l.id)
                  }
                  onDelete={() => deleteLabel(currentTemplate!.id, l.id)}
                  onRename={(n) =>
                    renameLabel(currentTemplate!.id, l.id, n)
                  }
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
