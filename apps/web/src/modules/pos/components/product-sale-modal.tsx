import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../../shared/components/button";
import { createId } from "../../../shared/utils/id";
import type { PosCartItem, PosProduct, PosSaleMode } from "../types/pos.types";
import { formatMoney, formatQuantity } from "../utils/money";

type ProductSaleMode = Extract<PosSaleMode, "by_kg" | "by_amount">;

type ProductSaleModalProps = {
  open: boolean;
  product: PosProduct | null;
  pricePerKg: number;
  initialMode: ProductSaleMode;
  onClose: () => void;
  onAddItem: (item: PosCartItem) => void;
};

const kgPresets = ["0.5", "1", "1.5", "2"];
const amountPresets = ["20", "50", "100", "200"];

export function ProductSaleModal({
  open,
  product,
  pricePerKg,
  initialMode,
  onClose,
  onAddItem
}: ProductSaleModalProps) {
  const [mode, setMode] = useState<ProductSaleMode>(initialMode);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode(initialMode);
    setValue("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || !product) {
    return null;
  }

  const activeProduct = product;
  const numericValue = Number(value);
  const isAmountMode = mode === "by_amount";
  const quantityKg = isAmountMode && pricePerKg > 0 ? numericValue / pricePerKg : numericValue;
  const total = isAmountMode ? numericValue : numericValue * pricePerKg;
  const canAdd = numericValue > 0 && pricePerKg > 0 && Number.isFinite(total);
  const presets = isAmountMode ? amountPresets : kgPresets;

  function submit() {
    if (!canAdd) {
      return;
    }

    onAddItem({
      localId: createId(),
      productId: activeProduct.id,
      productName: activeProduct.name,
      productType: activeProduct.productType,
      saleMode: mode,
      quantity: Number(quantityKg.toFixed(3)),
      unit: "kg",
      unitPrice: pricePerKg,
      total: Number(total.toFixed(2))
    });
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <form
        className="w-full max-w-md rounded-md bg-white p-5 text-tp-text shadow-xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Captura rapida</p>
            <h2 className="mt-2 text-2xl font-semibold">{activeProduct.name}</h2>
            <p className="mt-1 text-sm text-tp-muted">{formatMoney(pricePerKg)} / kg</p>
          </div>
          <Button onClick={onClose} variant="ghost">
            Cerrar
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            className="min-h-12"
            onClick={() => {
              setMode("by_kg");
              setValue("");
              inputRef.current?.focus();
            }}
            variant={mode === "by_kg" ? "primary" : "secondary"}
          >
            Kg
          </Button>
          <Button
            className="min-h-12"
            onClick={() => {
              setMode("by_amount");
              setValue("");
              inputRef.current?.focus();
            }}
            variant={mode === "by_amount" ? "primary" : "secondary"}
          >
            $
          </Button>
        </div>

        <label className="mt-5 block text-sm font-semibold" htmlFor="quick-sale-value">
          {isAmountMode ? "Monto" : "Cantidad"}
        </label>
        <input
          className="mt-2 h-16 w-full rounded-md border border-tp-border px-4 text-3xl font-semibold outline-none focus:border-tp-primary"
          id="quick-sale-value"
          inputMode="decimal"
          onChange={(event) => setValue(event.target.value)}
          placeholder={isAmountMode ? "0.00" : "0.000"}
          ref={inputRef}
          value={value}
        />

        <div className="mt-3 grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <Button key={preset} onClick={() => setValue(preset)} variant="secondary">
              {isAmountMode ? formatMoney(Number(preset)) : `${preset} kg`}
            </Button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-md bg-tp-soft p-3">
          <div>
            <p className="text-xs font-semibold uppercase text-tp-muted">Kg</p>
            <p className="mt-1 text-lg font-semibold">{formatQuantity(Number.isFinite(quantityKg) ? quantityKg : 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase text-tp-muted">Total</p>
            <p className="mt-1 text-lg font-semibold">{formatMoney(Number.isFinite(total) ? total : 0)}</p>
          </div>
        </div>

        <Button className="mt-5 w-full" disabled={!canAdd} type="submit">
          Agregar
        </Button>
      </form>
    </div>
  );
}
