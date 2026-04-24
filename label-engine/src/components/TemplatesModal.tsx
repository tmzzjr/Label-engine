import { useState } from "react";
import { Trash2, FilePlus } from "lucide-react";
import Modal from "./Modal";
import { useStore } from "../store";

interface Props {
  open: boolean;
  onClose: () => void;
  getThumbnail: () => string | undefined;
}

export default function TemplatesModal({ open, onClose, getThumbnail }: Props) {
  const {
    templates,
    saveAsTemplate,
    deleteTemplate,
    loadTemplate,
    newDocument,
  } = useStore();
  const [name, setName] = useState("");

  const onSave = () => {
    if (!name.trim()) return;
    saveAsTemplate(name.trim(), getThumbnail());
    setName("");
  };

  return (
    <Modal open={open} onClose={onClose} title="Templates" size="lg">
      <div className="space-y-5">
        <div className="card p-4">
          <h4 className="text-sm font-semibold text-brand-800 mb-2">
            Salvar template atual
          </h4>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Nome do template"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="btn-primary"
              disabled={!name.trim()}
              onClick={onSave}
            >
              Salvar
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-brand-800">
              Templates salvos ({templates.length})
            </h4>
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                newDocument();
                onClose();
              }}
            >
              <FilePlus size={14} /> Novo do zero
            </button>
          </div>
          {templates.length === 0 ? (
            <div className="text-sm text-brand-500 text-center py-6 card">
              Nenhum template salvo ainda.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {templates.map((t) => (
                <div key={t.id} className="card overflow-hidden group">
                  <button
                    className="block w-full aspect-[4/5] bg-brand-100 hover:bg-brand-200 transition overflow-hidden"
                    onClick={() => {
                      loadTemplate(t.id);
                      onClose();
                    }}
                    title="Carregar template"
                  >
                    {t.thumbnail ? (
                      <img
                        src={t.thumbnail}
                        alt={t.name}
                        className="w-full h-full object-contain bg-white"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-400 text-xs">
                        sem preview
                      </div>
                    )}
                  </button>
                  <div className="p-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-brand-800 truncate">
                        {t.name}
                      </div>
                      <div className="text-[10px] text-brand-500">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      className="icon-btn text-rose-600"
                      onClick={() => deleteTemplate(t.id)}
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
