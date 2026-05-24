import { useState } from "react";
import { Button } from "../../../shared/components/button";
import type { PosPayment } from "../types/payment.types";
import { formatMoney } from "../utils/money";

type PaymentMode = "cash" | "card" | "mixed";

type PaymentModalProps = {
  open: boolean;
  total: number;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: { payments: PosPayment[]; changeAmount?: number }) => void;
};

export function PaymentModal({ open, total, isSubmitting, error, onClose, onSubmit }: PaymentModalProps) {
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [cashAmount, setCashAmount] = useState(String(total));
  const [cardAmount, setCardAmount] = useState(String(total));
  const [reference, setReference] = useState("");

  if (!open) {
    return null;
  }

  const cash = Number(cashAmount || 0);
  const card = Number(cardAmount || 0);
  const cashChange = mode === "cash" ? Math.max(0, cash - total) : 0;
  const mixedDifference = cash + card - total;

  function submitCash() {
    if (cash < total) {
      return;
    }

    onSubmit({
      payments: [{ paymentMethod: "cash", amount: total.toFixed(2) }],
      changeAmount: cashChange
    });
  }

  function submitCard() {
    if (!reference.trim()) {
      return;
    }

    onSubmit({
      payments: [
        {
          paymentMethod: "card",
          amount: total.toFixed(2),
          reference: reference.trim(),
          provider: "terminal-demo"
        }
      ]
    });
  }

  function submitMixed() {
    if (Math.abs(mixedDifference) > 0.009 || card > 0 && !reference.trim()) {
      return;
    }

    const payments: PosPayment[] = [];
    if (cash > 0) {
      payments.push({ paymentMethod: "cash", amount: cash.toFixed(2) });
    }
    if (card > 0) {
      payments.push({
        paymentMethod: "card",
        amount: card.toFixed(2),
        reference: reference.trim(),
        provider: "terminal-demo"
      });
    }

    onSubmit({ payments });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <section className="w-full max-w-lg rounded-md bg-white p-5 text-tp-text shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Cobro</p>
            <h2 className="mt-2 text-2xl font-semibold">{formatMoney(total)}</h2>
          </div>
          <Button disabled={isSubmitting} onClick={onClose} variant="ghost">
            Cerrar
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {(["cash", "card", "mixed"] as PaymentMode[]).map((item) => (
            <Button
              disabled={isSubmitting}
              key={item}
              onClick={() => setMode(item)}
              variant={mode === item ? "primary" : "secondary"}
            >
              {item === "cash" ? "Efectivo" : item === "card" ? "Tarjeta" : "Mixto"}
            </Button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {mode === "cash" ? (
            <>
              <label className="block text-sm font-semibold" htmlFor="cash-payment">
                Recibido
              </label>
              <input
                className="h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                disabled={isSubmitting}
                id="cash-payment"
                inputMode="decimal"
                onChange={(event) => setCashAmount(event.target.value)}
                value={cashAmount}
              />
              <p className="text-sm text-tp-muted">Cambio: {formatMoney(cashChange)}</p>
              <Button className="w-full" disabled={cash < total || isSubmitting} onClick={submitCash}>
                Completar venta
              </Button>
            </>
          ) : null}

          {mode === "card" ? (
            <>
              <label className="block text-sm font-semibold" htmlFor="card-reference">
                Folio de la terminal
              </label>
              <input
                className="h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                disabled={isSubmitting}
                id="card-reference"
                onChange={(event) => setReference(event.target.value)}
                value={reference}
              />
              <Button className="w-full" disabled={!reference.trim() || isSubmitting} onClick={submitCard}>
                Completar venta
              </Button>
            </>
          ) : null}

          {mode === "mixed" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold" htmlFor="mixed-cash">
                    Efectivo
                  </label>
                  <input
                    className="mt-2 h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                    disabled={isSubmitting}
                    id="mixed-cash"
                    inputMode="decimal"
                    onChange={(event) => setCashAmount(event.target.value)}
                    value={cashAmount}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor="mixed-card">
                    Tarjeta
                  </label>
                  <input
                    className="mt-2 h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                    disabled={isSubmitting}
                    id="mixed-card"
                    inputMode="decimal"
                    onChange={(event) => setCardAmount(event.target.value)}
                    value={cardAmount}
                  />
                </div>
              </div>
              <input
                className="h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                disabled={isSubmitting}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Folio de tarjeta"
                value={reference}
              />
              <p className="text-sm text-tp-muted">
                {Math.abs(mixedDifference) < 0.009
                  ? "Pago completo"
                  : mixedDifference < 0
                    ? `Faltan ${formatMoney(Math.abs(mixedDifference))}`
                    : `Sobran ${formatMoney(mixedDifference)}`}
              </p>
              <Button
                className="w-full"
                disabled={Math.abs(mixedDifference) > 0.009 || (card > 0 && !reference.trim()) || isSubmitting}
                onClick={submitMixed}
              >
                Completar venta
              </Button>
            </>
          ) : null}
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-tp-danger">{error}</p> : null}
      </section>
    </div>
  );
}
