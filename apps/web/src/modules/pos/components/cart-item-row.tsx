import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { POS_OPERATION_LIMITS } from "../config/pos.config";
import type { PosCartItem } from "../types/pos.types";
import { formatMoney, formatQuantity } from "../utils/money";

type CartItemRowProps = {
  item: PosCartItem;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
};

export function CartItemRow({ item, onRemove, onUpdateQuantity }: CartItemRowProps) {
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));
  const isEditableQuantity = item.saleMode === "by_unit" || item.saleMode === "by_package";
  const quantityLabel =
    item.unit === "kg" ? `${formatQuantity(item.quantity)} kg` : `${formatQuantity(item.quantity)} ${item.unit}`;

  useEffect(() => {
    setQuantityInput(String(item.quantity));
  }, [item.quantity]);

  function commitQuantity(value: string) {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > POS_OPERATION_LIMITS.itemKg.max) {
      setQuantityInput(String(item.quantity));
      return;
    }

    onUpdateQuantity(quantity);
  }

  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-tp-border py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{item.productName}</p>
        <p className="mt-1 text-xs text-tp-muted">
          {quantityLabel} - {formatMoney(item.unitPrice)}
        </p>
        {item.priceSourceLabel ? (
          <p className="mt-1 text-xs font-semibold text-tp-secondary">{item.priceSourceLabel}</p>
        ) : null}
        {isEditableQuantity ? (
          <div className="mt-2 flex items-center gap-1">
            <button
              aria-label={`Reducir ${item.productName}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-tp-border text-tp-muted hover:bg-tp-soft"
              onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
              type="button"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <input
              className="h-7 w-14 rounded-md border border-tp-border px-2 text-center text-xs outline-none focus:border-tp-primary"
              inputMode="numeric"
              onBlur={(event) => commitQuantity(event.target.value)}
              onChange={(event) => setQuantityInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitQuantity((event.target as HTMLInputElement).value);
                }
              }}
              value={quantityInput}
            />
            <button
              aria-label={`Aumentar ${item.productName}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-tp-border text-tp-muted hover:bg-tp-soft"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              type="button"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{formatMoney(item.total)}</p>
        <button
          aria-label={`Eliminar ${item.productName}`}
          className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-tp-muted hover:bg-red-50 hover:text-tp-danger"
          onClick={onRemove}
          type="button"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
