import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../../../shared/components/button";
import type { CompletedSale } from "../types/payment.types";
import { formatMoney } from "../utils/money";

type SaleSuccessModalProps = {
  sale: CompletedSale | null;
  onNewSale: () => void;
};

export function SaleSuccessModal({ sale, onNewSale }: SaleSuccessModalProps) {
  useEffect(() => {
    if (!sale) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        onNewSale();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewSale, sale]);

  if (!sale) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <section className="w-full max-w-md rounded-md bg-white p-6 text-center text-tp-text shadow-xl">
        <CheckCircle2 className="mx-auto h-12 w-12 text-tp-success" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-semibold">Venta completada</h2>
        <p className="mt-2 text-sm text-tp-muted">Folio {sale.saleNumber}</p>
        <p className="mt-5 text-4xl font-semibold">{formatMoney(sale.total)}</p>
        <p className="mt-2 text-sm text-tp-muted">Pago: {sale.paymentSummary}</p>
        {sale.changeAmount ? <p className="mt-1 text-sm text-tp-muted">Cambio: {formatMoney(sale.changeAmount)}</p> : null}
        <Button className="mt-6 w-full" onClick={onNewSale}>
          Nueva venta
        </Button>
      </section>
    </div>
  );
}
