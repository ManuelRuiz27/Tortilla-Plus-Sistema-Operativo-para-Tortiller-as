import { Button } from "../../../shared/components/button";
import type { PosCartItem } from "../types/pos.types";
import { formatMoney } from "../utils/money";
import { CartItemRow } from "./cart-item-row";

type CartPanelProps = {
  items: PosCartItem[];
  subtotal: number;
  total: number;
  onRemoveItem: (localId: string) => void;
  onClearCart: () => void;
  onCancelTicket: () => void;
  onCheckout: () => void;
};

export function CartPanel({
  items,
  subtotal,
  total,
  onRemoveItem,
  onClearCart,
  onCancelTicket,
  onCheckout
}: CartPanelProps) {
  const canCheckout = items.length > 0 && total > 0;

  function clearWithConfirm() {
    if (items.length === 0 || window.confirm("Vaciar esta venta?")) {
      onClearCart();
    }
  }

  return (
    <aside className="flex min-h-0 flex-col rounded-md border border-tp-border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Venta actual</h2>
        <button
          className="text-xs font-semibold text-tp-muted hover:text-tp-danger disabled:opacity-40"
          disabled={items.length === 0}
          onClick={clearWithConfirm}
          type="button"
        >
          Vaciar
        </button>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="grid h-full min-h-52 place-items-center text-center text-sm text-tp-muted">
            Agrega productos para comenzar.
          </div>
        ) : (
          items.map((item) => (
            <CartItemRow
              item={item}
              key={item.localId}
              onRemove={() => onRemoveItem(item.localId)}
            />
          ))
        )}
      </div>
      <div className="border-t border-tp-border pt-4">
        <div className="mb-3 flex items-center justify-between text-sm text-tp-muted">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <p className="text-xs font-semibold uppercase text-tp-muted">Total</p>
        <p className="mt-1 text-5xl font-semibold">{formatMoney(total)}</p>
        <Button className="mt-4 w-full" disabled={!canCheckout} onClick={onCheckout}>
          Cobrar
        </Button>
        <Button
          className="mt-2 w-full"
          disabled={items.length === 0}
          onClick={onCancelTicket}
          variant="danger"
        >
          Cancelar venta
        </Button>
      </div>
    </aside>
  );
}
