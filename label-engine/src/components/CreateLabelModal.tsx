import { useState } from "react";
import Modal from "./Modal";
import { useStore } from "../store";
import type { CreateLabelForm, LabelElement, TextElement } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const INITIAL: CreateLabelForm = {
  productName: "",
  sku: "",
  lot: "",
  mfgDate: "",
  expDate: "",
  qrLink: "",
  notes: "",
};

const formatDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export default function CreateLabelModal({ open, onClose }: Props) {
  const { doc, setDoc } = useStore();
  const [form, setForm] = useState<CreateLabelForm>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateLabelForm, string>>>({});

  const set = <K extends keyof CreateLabelForm>(k: K, v: CreateLabelForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.productName.trim()) e.productName = "Obrigatório";
    if (!form.lot.trim()) e.lot = "Obrigatório";
    if (!form.mfgDate) e.mfgDate = "Obrigatório";
    if (!form.expDate) e.expDate = "Obrigatório";
    if (
      form.mfgDate &&
      form.expDate &&
      new Date(form.mfgDate) > new Date(form.expDate)
    )
      e.expDate = "Validade deve ser após fabricação";
    if (form.qrLink) {
      try {
        new URL(form.qrLink);
      } catch {
        e.qrLink = "URL inválida";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const apply = () => {
    if (!validate()) return;
    // Map form values onto elements by their .field
    setDoc((d) => {
      const elements = d.elements.map<LabelElement>((el) => {
        if (el.type === "text" && el.field) {
          const t = el as TextElement;
          let value = t.text;
          switch (el.field) {
            case "productName":
              value = form.productName;
              break;
            case "sku":
              value = form.sku ? `SKU: ${form.sku}` : t.text;
              break;
            case "lot":
              value = form.lot ? `LOT: ${form.lot}` : t.text;
              break;
            case "mfgDate":
              value = form.mfgDate ? `MFG: ${formatDate(form.mfgDate)}` : t.text;
              break;
            case "expDate":
              value = form.expDate ? `EXP: ${formatDate(form.expDate)}` : t.text;
              break;
            case "notes":
              value = form.notes || t.text;
              break;
          }
          return { ...t, text: value };
        }
        if (el.type === "qrcode" && el.field === "qrLink" && form.qrLink) {
          return { ...el, value: form.qrLink };
        }
        return el;
      });
      return { ...d, elements };
    });
    onClose();
  };

  const hasQRElement = doc.elements.some((e) => e.type === "qrcode");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Criar Label"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={apply}>
            Aplicar ao Label
          </button>
        </>
      }
    >
      <p className="text-sm text-brand-500 mb-4">
        Preencha os campos abaixo — eles serão mapeados automaticamente para os
        elementos do label com o campo correspondente configurado.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="field-label">
            Nome do Produto <span className="text-rose-500">*</span>
          </label>
          <input
            className="input"
            value={form.productName}
            onChange={(e) => set("productName", e.target.value)}
          />
          {errors.productName && (
            <p className="text-xs text-rose-600 mt-1">{errors.productName}</p>
          )}
        </div>
        <div>
          <label className="field-label">SKU / Código</label>
          <input
            className="input"
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">
            Lote / LOT <span className="text-rose-500">*</span>
          </label>
          <input
            className="input"
            value={form.lot}
            onChange={(e) => set("lot", e.target.value)}
          />
          {errors.lot && (
            <p className="text-xs text-rose-600 mt-1">{errors.lot}</p>
          )}
        </div>
        <div>
          <label className="field-label">
            Data de Fabricação <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            className="input"
            value={form.mfgDate}
            onChange={(e) => set("mfgDate", e.target.value)}
          />
          {errors.mfgDate && (
            <p className="text-xs text-rose-600 mt-1">{errors.mfgDate}</p>
          )}
        </div>
        <div>
          <label className="field-label">
            Data de Validade <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            className="input"
            value={form.expDate}
            onChange={(e) => set("expDate", e.target.value)}
          />
          {errors.expDate && (
            <p className="text-xs text-rose-600 mt-1">{errors.expDate}</p>
          )}
        </div>
        <div className="col-span-2">
          <label className="field-label">Link para QR Code (opcional)</label>
          <input
            className="input"
            placeholder="https://..."
            value={form.qrLink}
            onChange={(e) => set("qrLink", e.target.value)}
          />
          {errors.qrLink && (
            <p className="text-xs text-rose-600 mt-1">{errors.qrLink}</p>
          )}
          {!hasQRElement && form.qrLink && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠ Adicione um elemento QR Code no label com o campo "Link QR"
              para que este link seja aplicado.
            </p>
          )}
        </div>
        <div className="col-span-2">
          <label className="field-label">Observações adicionais</label>
          <textarea
            className="input min-h-[70px]"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
