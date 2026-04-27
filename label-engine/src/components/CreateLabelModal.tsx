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
  concentration: "",
  qrLink: "",
  inventoryQrLink: "",
  notes: "",
};

const formatDate = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  // MM/DD/YYYY
  return `${m}/${d}/${y}`;
};

export default function CreateLabelModal({ open, onClose }: Props) {
  const { doc, setDoc } = useStore();
  const [form, setForm] = useState<CreateLabelForm>(INITIAL);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateLabelForm, string>>
  >({});

  const set = <K extends keyof CreateLabelForm>(k: K, v: CreateLabelForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.productName.trim()) e.productName = "Required";
    if (!form.lot.trim()) e.lot = "Required";
    if (!form.mfgDate) e.mfgDate = "Required";
    if (!form.expDate) e.expDate = "Required";
    if (
      form.mfgDate &&
      form.expDate &&
      new Date(form.mfgDate) > new Date(form.expDate)
    )
      e.expDate = "Expiration must be after manufacture date";
    if (form.qrLink) {
      try {
        new URL(form.qrLink);
      } catch {
        e.qrLink = "Invalid URL";
      }
    }
    if (form.inventoryQrLink) {
      try {
        new URL(form.inventoryQrLink);
      } catch {
        e.inventoryQrLink = "Invalid URL";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const apply = () => {
    if (!validate()) return;
    if (!doc) return;
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
            case "concentration":
              value = form.concentration
                ? `${form.concentration} mg/ml`
                : t.text;
              break;
            case "notes":
              value = form.notes || t.text;
              break;
          }
          return { ...t, text: value };
        }
        if (el.type === "qrcode") {
          if (el.field === "qrLink" && form.qrLink) {
            return { ...el, value: form.qrLink };
          }
          if (el.field === "inventoryQr" && form.inventoryQrLink) {
            return { ...el, value: form.inventoryQrLink };
          }
        }
        return el;
      });
      return { ...d, elements };
    });
    onClose();
  };

  const qrElements = doc?.elements.filter((e) => e.type === "qrcode") ?? [];
  const hasQrLink = qrElements.some((e) => e.field === "qrLink");
  const hasInvQr = qrElements.some((e) => e.field === "inventoryQr");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Label"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={apply}>
            Apply to Label
          </button>
        </>
      }
    >
      <p className="text-sm text-muted mb-4">
        Fill in the fields below — they'll be automatically mapped to the
        corresponding elements on your label.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="field-label">
            Product Name <span className="text-danger">*</span>
          </label>
          <input
            className="input"
            value={form.productName}
            onChange={(e) => set("productName", e.target.value)}
          />
          {errors.productName && (
            <p className="text-xs text-danger mt-1">{errors.productName}</p>
          )}
        </div>
        <div>
          <label className="field-label">SKU / Code</label>
          <input
            className="input"
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">
            LOT Number <span className="text-danger">*</span>
          </label>
          <input
            className="input"
            value={form.lot}
            onChange={(e) => set("lot", e.target.value)}
          />
          {errors.lot && <p className="text-xs text-danger mt-1">{errors.lot}</p>}
        </div>
        <div>
          <label className="field-label">
            Manufacture Date <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            className="input"
            value={form.mfgDate}
            onChange={(e) => set("mfgDate", e.target.value)}
          />
          {errors.mfgDate && (
            <p className="text-xs text-danger mt-1">{errors.mfgDate}</p>
          )}
        </div>
        <div>
          <label className="field-label">
            Expiration Date <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            className="input"
            value={form.expDate}
            onChange={(e) => set("expDate", e.target.value)}
          />
          {errors.expDate && (
            <p className="text-xs text-danger mt-1">{errors.expDate}</p>
          )}
        </div>
        <div>
          <label className="field-label">Concentration (mg/ml)</label>
          <input
            className="input"
            placeholder="e.g. 250"
            value={form.concentration}
            onChange={(e) => set("concentration", e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="field-label">QR Code Link (product)</label>
          <input
            className="input"
            placeholder="https://..."
            value={form.qrLink}
            onChange={(e) => set("qrLink", e.target.value)}
          />
          {errors.qrLink && (
            <p className="text-xs text-danger mt-1">{errors.qrLink}</p>
          )}
          {!hasQrLink && form.qrLink && (
            <p className="text-xs text-warning mt-1">
              ⚠ Add a QR Code element with field "QR Link (product)" for this
              to apply.
            </p>
          )}
        </div>
        <div className="col-span-2">
          <label className="field-label">Inventory QR Code</label>
          <input
            className="input"
            placeholder="https://inventory.example.com/..."
            value={form.inventoryQrLink}
            onChange={(e) => set("inventoryQrLink", e.target.value)}
          />
          {errors.inventoryQrLink && (
            <p className="text-xs text-danger mt-1">{errors.inventoryQrLink}</p>
          )}
          {!hasInvQr && form.inventoryQrLink && (
            <p className="text-xs text-warning mt-1">
              ⚠ Add a QR Code element with field "Inventory QR" for this to
              apply.
            </p>
          )}
        </div>
        <div className="col-span-2">
          <label className="field-label">Additional Notes</label>
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
