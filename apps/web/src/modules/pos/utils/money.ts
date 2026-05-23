export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(value);
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0
  }).format(value);
}
