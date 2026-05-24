import { Trash2 } from "lucide-react";
import type { PosCartItem } from "../types/pos.types";
import { formatMoney, formatQuantity } from "../utils/money";

type CartItemRowProps = {
  item: PosCartItem;
  onRemove: () => void;
};

export function CartItemRow({ item, onRemove }: CartItemRowProps) {
  const quantityLabel =
    item.unit === "kg" ? `${formatQuantity(item.quantity)} kg` : `${formatQuantity(item.quantity)} ${item.unit}`;

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
