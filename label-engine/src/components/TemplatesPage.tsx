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
  ratio = "4/5",
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
        className="block w-full bg-surface2 hover:bg-surface transition overflow-hidden"
        style={{ aspectRatio: ratio }}
        onClick={onOpen}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={title}
            className="w-full h-full object-contain bg-white"
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
  ratio = "4/5",
}: {
  onClick: () => void;
  label: string;
  ratio?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="card overflow-hidden flex flex-col items-center justify-center gap-3 bg-surface hover:bg-surface2 border-dashed text-muted hover:text-fg transition"
      style={{ aspectRatio: `calc(${ratio} + 0.15)` }}
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
    <div className="h-full overflow-y-auto">
      {/* Top nav */}
      <header className="h-14 px-6 flex items-center gap-3 border-b border-border bg-surface">
        {isDetail && (
          <button className="icon-btn" title="Back" onClick={goTemplates}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="w-8 h-8 rounded-md bg-accent text-white flex items-center justify-center font-bold">
          L
        </div>
        <span className="font-semibold">Label Engine</span>
        <span className="text-muted mx-2">/</span>
        {isDetail ? (
          <>
            <button
              className="text-muted hover:text-fg"
              onClick={goTemplates}
            >
              Templates
            </button>
            <span className="text-muted">/</span>
            <span className="font-medium">{currentTemplate!.name}</span>
          </>
        ) : (
          <span className="font-medium">Templates</span>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-8">
        {!isDetail ? (
          <>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold">Templates</h1>
                <p className="text-muted text-sm mt-1">
                  Choose a template to edit, or start from scratch. Each
                  template can contain multiple label variants.
                </p>
              </div>
            </div>

            {creatingTpl ? (
              <div className="card p-4 mb-6 flex items-center gap-2">
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
                <button
                  className="btn-primary"
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
                  className="btn-ghost"
                  onClick={() => {
                    setCreatingTpl(false);
                    setNewTplName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : null}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-3">
                  <Tag size={20} className="text-accent" />
                  {currentTemplate!.name}
                </h1>
                <p className="text-muted text-sm mt-1">
                  Labels in this template. Each one shares the template design
                  but can have different text, SKU, QR code, etc.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
