import { useEffect, useState } from "react";
import { Button } from "../../../shared/components/button";
import type { PosPayment } from "../types/payment.types";
import type { PosSelectedCustomer } from "../types/pos.types";
import { formatMoney } from "../utils/money";

type PaymentMode = "cash" | "card" | "transfer" | "mixed" | "credit";

type PaymentModalProps = {
  open: boolean;
  total: number;
  isSubmitting: boolean;
  error?: string | null;
  selectedCustomer: PosSelectedCustomer | null;
  onClose: () => void;
  onSubmit: (payload: { payments: PosPayment[]; changeAmount?: number; authorizationPin?: string }) => void;
};

export function PaymentModal({ open, total, isSubmitting, error, selectedCustomer, onClose, onSubmit }: PaymentModalProps) {
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [cashAmount, setCashAmount] = useState(String(total));
  const [cardAmount, setCardAmount] = useState(String(total));
  const [transferAmount, setTransferAmount] = useState("0.00");
  const [creditAmount, setCreditAmount] = useState("0.00");
  const [reference, setReference] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [authorizationPin, setAuthorizationPin] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode("cash");
    setCashAmount(total.toFixed(2));
    setCardAmount(total.toFixed(2));
    setTransferAmount("0.00");
    setCreditAmount("0.00");
    setReference("");
    setTransferReference("");
    setAuthorizationPin("");
  }, [open, total]);

  if (!open) {
    return null;
  }

  const cash = Number(cashAmount || 0);
  const card = Number(cardAmount || 0);
  const transfer = Number(transferAmount || 0);
  const credit = Number(creditAmount || 0);
  const cashChange = mode === "cash" ? Math.max(0, cash - total) : 0;
  const mixedDifference = cash + card + transfer + credit - total;
  const availableCredit = selectedCustomer ? selectedCustomer.creditLimit - selectedCustomer.currentBalance : 0;
  const canUseCredit = Boolean(selectedCustomer?.creditEnabled);
  const creditExceedsLimit = credit > Math.max(0, availableCredit);

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

  function submitTransfer() {
    if (!transferReference.trim()) {
      return;
    }

    onSubmit({
      payments: [
        {
          paymentMethod: "transfer",
          amount: total.toFixed(2),
          reference: transferReference.trim(),
          provider: "transferencia"
        }
      ]
    });
  }

  function submitCredit() {
    if (!canUseCredit) {
      return;
    }

    onSubmit({
      payments: [{ paymentMethod: "credit", amount: total.toFixed(2) }],
      authorizationPin: total > availableCredit ? authorizationPin.trim() || undefined : undefined
    });
  }

  function submitMixed() {
    if (
      Math.abs(mixedDifference) > 0.009 ||
      card > 0 && !reference.trim() ||
      transfer > 0 && !transferReference.trim() ||
      credit > 0 && (!canUseCredit || creditExceedsLimit && !authorizationPin.trim())
    ) {
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
    if (transfer > 0) {
      payments.push({
        paymentMethod: "transfer",
        amount: transfer.toFixed(2),
        reference: transferReference.trim(),
        provider: "transferencia"
      });
    }
    if (credit > 0) {
      payments.push({ paymentMethod: "credit", amount: credit.toFixed(2) });
    }

    onSubmit({ payments, authorizationPin: credit > availableCredit ? authorizationPin.trim() || undefined : undefined });
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

        <div className="mt-5 grid grid-cols-5 gap-2">
          {(["cash", "card", "transfer", "mixed", "credit"] as PaymentMode[]).map((item) => (
            <Button
              disabled={isSubmitting || item === "credit" && !canUseCredit}
              key={item}
              onClick={() => setMode(item)}
              variant={mode === item ? "primary" : "secondary"}
            >
              {item === "cash" ? "Efectivo" : item === "card" ? "Tarjeta" : item === "transfer" ? "Transfer." : item === "credit" ? "Fiado" : "Mixto"}
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

          {mode === "transfer" ? (
            <>
              <label className="block text-sm font-semibold" htmlFor="transfer-reference">
                Referencia de transferencia
              </label>
              <input
                className="h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                disabled={isSubmitting}
                id="transfer-reference"
                onChange={(event) => setTransferReference(event.target.value)}
                value={transferReference}
              />
              <Button className="w-full" disabled={!transferReference.trim() || isSubmitting} onClick={submitTransfer}>
                Completar venta
              </Button>
            </>
          ) : null}

          {mode === "credit" ? (
            <>
              <div className="rounded-md bg-tp-soft p-3 text-sm">
                <p className="font-semibold">{selectedCustomer?.name ?? "Sin cliente"}</p>
                <p className="mt-1 text-tp-muted">Disponible: {formatMoney(Math.max(0, availableCredit))}</p>
              </div>
              {total > availableCredit ? (
                <input
                  autoComplete="one-time-code"
                  className="h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                  disabled={isSubmitting}
                  onChange={(event) => setAuthorizationPin(event.target.value)}
                  placeholder="PIN de autorizacion"
                  type="password"
                  value={authorizationPin}
                />
              ) : null}
              <Button
                className="w-full"
                disabled={!canUseCredit || total > availableCredit && !authorizationPin.trim() || isSubmitting}
                onClick={submitCredit}
              >
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
                <div>
                  <label className="text-sm font-semibold" htmlFor="mixed-transfer">
                    Transferencia
                  </label>
                  <input
                    className="mt-2 h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                    disabled={isSubmitting}
                    id="mixed-transfer"
                    inputMode="decimal"
                    onChange={(event) => setTransferAmount(event.target.value)}
                    value={transferAmount}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold" htmlFor="mixed-credit">
                    Fiado
                  </label>
                  <input
                    className="mt-2 h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                    disabled={isSubmitting || !canUseCredit}
                    id="mixed-credit"
                    inputMode="decimal"
                    onChange={(event) => setCreditAmount(event.target.value)}
                    value={creditAmount}
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
              <input
                className="h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                disabled={isSubmitting || transfer <= 0}
                onChange={(event) => setTransferReference(event.target.value)}
                placeholder="Referencia de transferencia"
                value={transferReference}
              />
              {credit > availableCredit ? (
                <input
                  autoComplete="one-time-code"
                  className="h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                  disabled={isSubmitting}
                  onChange={(event) => setAuthorizationPin(event.target.value)}
                  placeholder="PIN de autorizacion para credito"
                  type="password"
                  value={authorizationPin}
                />
              ) : null}
              <p className="text-sm text-tp-muted">
                {Math.abs(mixedDifference) < 0.009
                  ? "Pago completo"
                  : mixedDifference < 0
                    ? `Faltan ${formatMoney(Math.abs(mixedDifference))}`
                    : `Sobran ${formatMoney(mixedDifference)}`}
              </p>
              <Button
                className="w-full"
                disabled={
                  Math.abs(mixedDifference) > 0.009 ||
                  card > 0 && !reference.trim() ||
                  transfer > 0 && !transferReference.trim() ||
                  credit > 0 && (!canUseCredit || creditExceedsLimit && !authorizationPin.trim()) ||
                  isSubmitting
                }
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
