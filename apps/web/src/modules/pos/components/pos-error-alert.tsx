import type { ApiError } from "../../../api/api-error";

type PosErrorAlertProps = {
  error: ApiError | string | null;
  onDismiss?: () => void;
};

const POS_ERROR_MESSAGES: Record<string, string> = {
  NO_OPEN_CASH_SESSION: "No hay caja abierta para vender.",
  CARD_REFERENCE_REQUIRED: "Captura la referencia de la terminal.",
  PAYMENT_TOTAL_MISMATCH: "El pago no coincide con el total.",
  PRODUCT_INACTIVE: "Este producto ya no está activo.",
  PRICE_NOT_FOUND: "Este producto no tiene precio configurado.",
  INSUFFICIENT_STOCK: "Stock insuficiente.",
  NEGATIVE_STOCK_NOT_ALLOWED: "No se permite stock negativo para este producto.",
  BRANCH_ACCESS_DENIED: "No tienes acceso a esta sucursal.",
  UNKNOWN_ERROR: "No se pudo completar la operación."
};

function getErrorMessage(error: ApiError | string): string {
  if (typeof error === "string") {
    return error;
  }

  return POS_ERROR_MESSAGES[error.error] ?? error.message;
}

export function PosErrorAlert({ error, onDismiss }: PosErrorAlertProps) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-tp-danger">
      <div className="flex items-start justify-between gap-3">
        <p>{getErrorMessage(error)}</p>
        {onDismiss ? (
          <button className="font-semibold hover:underline" onClick={onDismiss} type="button">
            Cerrar
          </button>
        ) : null}
      </div>
    </div>
  );
}
