import { useMemo } from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import { useStore } from "../store";
import type { TextElement } from "../types";
import { inToPx } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmExport: () => void;
  previewDataUrl: string | null;
}

type Status = "ok" | "warn" | "fail";

interface Check {
  label: string;
  status: Status;
  detail?: string;
}

export default function PreviewModal({
  open,
  onClose,
  onConfirmExport,
  previewDataUrl,
}: Props) {
  const { doc } = useStore();

  const checks = useMemo<Check[]>(() => {
    const texts = doc.elements.filter(
      (e) => e.type === "text"
    ) as TextElement[];
    const hasLot = texts.some(
      (t) =>
        t.field === "lot" ||
        /lot/i.test(t.text) ||
        /lote/i.test(t.text)
    ) && !texts.every((t) => /^lot:\s*(——|$)/i.test(t.text));
    const hasMfg = texts.some(
      (t) =>
        t.field === "mfgDate" ||
        /mfg/i.test(t.text) ||
        /fabric/i.test(t.text)
    ) && !texts.every((t) => /^mfg:\s*(——|$)/i.test(t.text));
    const hasExp = texts.some(
      (t) =>
        t.field === "expDate" ||
        /exp/i.test(t.text) ||
        /valid/i.test(t.text)
    ) && !texts.every((t) => /^exp:\s*(——|$)/i.test(t.text));
    const qr = doc.elements.find((e) => e.type === "qrcode");

    const w = inToPx(doc.size.widthIn);
    const h = inToPx(doc.size.heightIn);
    const outOfBounds = doc.elements.filter(
      (e) =>
        e.x < 0 ||
        e.y < 0 ||
        e.x + e.width > w + 0.5 ||
        e.y + e.height > h + 0.5
    );
    const smallText = texts.filter((t) => t.fontSize < 7);

    return [
      {
        label: "LOT Number preenchido",
        status: hasLot ? "ok" : "warn",
        detail: hasLot
          ? undefined
          : "Adicione um elemento de texto com LOT ou marque o campo 'Lote'.",
      },
      {
        label: "Data de Fabricação presente",
        status: hasMfg ? "ok" : "warn",
      },
      {
        label: "Data de Validade presente",
        status: hasExp ? "ok" : "warn",
      },
      {
        label: "QR Code funcional",
        status: qr
          ? (qr as any).value?.length > 0
            ? "ok"
            : "warn"
          : "warn",
        detail: qr
          ? (qr as any).value?.length > 0
            ? "QR Code contém dados válidos."
            : "QR Code sem conteúdo."
          : "Sem QR Code no label.",
      },
      {
        label: "Todas as informações legíveis (≥ 7pt)",
        status: smallText.length === 0 ? "ok" : "warn",
        detail:
          smallText.length > 0
            ? `${smallText.length} texto(s) com fonte menor que 7pt.`
            : undefined,
      },
      {
        label: "Elementos dentro dos limites do label",
        status: outOfBounds.length === 0 ? "ok" : "fail",
        detail:
          outOfBounds.length > 0
            ? `${outOfBounds.length} elemento(s) ultrapassam os limites.`
            : undefined,
      },
    ];
  }, [doc]);

  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preview do Label"
      size="xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Voltar e Editar
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onClose();
              onConfirmExport();
            }}
            disabled={failCount > 0}
            title={
              failCount > 0
                ? "Corrija os erros antes de exportar"
                : "Prosseguir para exportação"
            }
          >
            Confirmar e Exportar
          </button>
        </>
      }
    >
      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        <div className="flex items-center justify-center bg-brand-100 rounded-lg p-4 min-h-[320px]">
          {previewDataUrl ? (
            <img
              src={previewDataUrl}
              alt="Preview"
              className="max-w-full max-h-[60vh] shadow-lg bg-white"
              style={{
                aspectRatio: `${doc.size.widthIn} / ${doc.size.heightIn}`,
              }}
            />
          ) : (
            <div className="text-brand-400 text-sm">Gerando preview…</div>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-brand-800 mb-2">
            Checklist de validação
          </h4>
          <ul className="space-y-2">
            {checks.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-brand-800"
              >
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${
                    c.status === "ok"
                      ? "bg-emerald-100 text-emerald-700"
                      : c.status === "warn"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {c.status === "ok" ? (
                    <Check size={12} />
                  ) : c.status === "warn" ? (
                    <AlertTriangle size={12} />
                  ) : (
                    <X size={12} />
                  )}
                </span>
                <div>
                  <div>{c.label}</div>
                  {c.detail && (
                    <div className="text-xs text-brand-500">{c.detail}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 card p-3 text-xs text-brand-600 space-y-1">
            <div>
              <span className="font-semibold">Tamanho:</span>{" "}
              {doc.size.widthIn}" × {doc.size.heightIn}"
            </div>
            <div>
              <span className="font-semibold">Elementos:</span>{" "}
              {doc.elements.length}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
