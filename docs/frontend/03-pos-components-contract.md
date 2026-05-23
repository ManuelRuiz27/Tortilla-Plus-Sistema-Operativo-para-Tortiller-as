# Tortilla Plus — POS Components Contract V0.1

## 1. Objetivo

Definir los componentes funcionales del **POS PWA** para que el equipo frontend pueda construir la vista de venta sin improvisar responsabilidades, props, eventos ni estados.

Este contrato cubre:

```txt
/app/pos
/app/pos/cash/open
/app/pos/sale
modal de cobro
modal de venta exitosa
atajos de teclado
errores operativos
```

No cubre todavía:

```txt
crédito/fiado
clientes recurrentes
devoluciones
cierre de caja completo
rutas
facturación
reportes
```

---

## 2. Principio de componentes

Cada componente debe tener una sola responsabilidad.

Mala práctica:

```txt
SalePage con toda la lógica de productos, carrito, cobro, errores, atajos y API.
```

Correcto:

```txt
SalePage
├─ PosHeader
├─ ProductQuickGrid
├─ WeightSaleInput
├─ AmountSaleInput
├─ CartPanel
├─ PaymentModal
├─ SaleSuccessModal
└─ KeyboardShortcutsProvider
```

---

## 3. Estructura recomendada

```txt
/src/modules/pos
├─ pages/
│  ├─ pos-router-page.tsx
│  ├─ open-cash-page.tsx
│  └─ sale-page.tsx
│
├─ components/
│  ├─ pos-header.tsx
│  ├─ open-cash-form.tsx
│  ├─ product-quick-grid.tsx
│  ├─ weight-sale-input.tsx
│  ├─ amount-sale-input.tsx
│  ├─ package-quick-button.tsx
│  ├─ retail-product-card.tsx
│  ├─ cart-panel.tsx
│  ├─ cart-item-row.tsx
│  ├─ payment-modal.tsx
│  ├─ cash-payment-form.tsx
│  ├─ card-payment-form.tsx
│  ├─ mixed-payment-form.tsx
│  ├─ sale-success-modal.tsx
│  ├─ pos-error-alert.tsx
│  └─ keyboard-shortcuts-provider.tsx
│
├─ hooks/
│  ├─ use-current-cash-session.ts
│  ├─ use-open-cash-session.ts
│  ├─ use-pos-products.ts
│  ├─ use-create-sale.ts
│  ├─ use-add-sale-item.ts
│  ├─ use-complete-sale.ts
│  ├─ use-cancel-draft-sale.ts
│  └─ use-pos-keyboard-shortcuts.ts
│
├─ stores/
│  └─ pos-cart.store.ts
│
├─ schemas/
│  ├─ open-cash.schema.ts
│  ├─ sale-item.schema.ts
│  └─ payment.schema.ts
│
└─ types/
   ├─ pos.types.ts
   └─ payment.types.ts
```

---

## 4. Tipos base

### 4.1 Product

```ts
export type PosProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  productType: "tortilla" | "masa" | "package" | "retail" | "service";
  unit: "kg" | "piece" | "package" | "liter" | "service";
  isSellable: boolean;
  isStockTracked: boolean;
  requiresProduction: boolean;
  status: "active" | "inactive" | "deleted";
  prices: PosProductPrice[];
};
```

### 4.2 Product price

```ts
export type PosProductPrice = {
  branchId: string;
  saleMode: "by_kg" | "by_amount" | "by_package" | "by_unit";
  price: number;
  currency: "MXN";
};
```

### 4.3 Cart item

```ts
export type PosCartItem = {
  localId: string;
  productId: string;
  productName: string;
  productType: "tortilla" | "masa" | "package" | "retail" | "service";
  saleMode: "by_kg" | "by_amount" | "by_package" | "by_unit";
  quantity: number;
  unit: "kg" | "piece" | "package" | "liter" | "service";
  unitPrice: number;
  total: number;
};
```

### 4.4 Payment

```ts
export type PosPayment =
  | {
      paymentMethod: "cash";
      amount: string;
    }
  | {
      paymentMethod: "card";
      amount: string;
      reference: string;
      provider?: string;
    };
```

### 4.5 Mixed payment

```ts
export type PosMixedPayment = {
  cashAmount: number;
  cardAmount: number;
  cardReference: string;
  cardProvider?: string;
};
```

---

## 5. Page: PosRouterPage

### Archivo

```txt
/src/modules/pos/pages/pos-router-page.tsx
```

### Responsabilidad

Validar si el usuario puede entrar al POS y redirigirlo.

### Lógica

```txt
1. Validar sesión.
2. Validar branch activa.
3. Consultar caja abierta.
4. Si no hay caja abierta → /app/pos/cash/open
5. Si hay caja abierta → /app/pos/sale
```

### Hooks usados

```txt
useAuthStore
useBranchStore
useCurrentCashSession
```

### Estados

```txt
loading
noBranch
cashNotOpen
cashOpen
error
```

### No debe hacer

```txt
No debe renderizar venta.
No debe renderizar productos.
No debe abrir caja.
No debe tener lógica de carrito.
```

---

## 6. Component: PosHeader

### Archivo

```txt
/src/modules/pos/components/pos-header.tsx
```

### Responsabilidad

Mostrar contexto operativo del cajero.

### Props

```ts
type PosHeaderProps = {
  branchName: string;
  cashSessionId: string | null;
  cashierName: string;
  currentTime: string;
  onLogout: () => void;
  onChangeBranch?: () => void;
  canChangeBranch: boolean;
};
```

### Debe mostrar

```txt
Sucursal activa
Estado de caja
Nombre del usuario
Hora actual
Botón salir
Botón cambiar sucursal si aplica
```

### Reglas

- Si no hay caja activa, mostrar estado: `Caja no abierta`.
- Si hay caja activa, mostrar: `Caja abierta`.
- No mostrar reportes ni métricas aquí.

### Ejemplo visual funcional

```txt
Sucursal Principal | Caja abierta | Cajero: Juan | 10:42 AM | Salir
```

---

## 7. Page: OpenCashPage

### Archivo

```txt
/src/modules/pos/pages/open-cash-page.tsx
```

### Responsabilidad

Renderizar flujo de apertura de caja.

### Componentes internos

```txt
PosHeader
OpenCashForm
PosErrorAlert
```

### Hooks usados

```txt
useOpenCashSession
useCurrentCashSession
useBranchStore
useAuthStore
```

### Flujo

```txt
1. Consultar caja abierta.
2. Si ya hay caja abierta, redirigir a /app/pos/sale.
3. Mostrar formulario de apertura.
4. En submit, llamar POST /cash-sessions/open.
5. Guardar cashSessionId.
6. Redirigir a venta.
```

---

## 8. Component: OpenCashForm

### Archivo

```txt
/src/modules/pos/components/open-cash-form.tsx
```

### Responsabilidad

Capturar monto inicial de caja.

### Props

```ts
type OpenCashFormProps = {
  branchName: string;
  suggestedAmount: number;
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (values: OpenCashFormValues) => void;
};
```

### Values

```ts
type OpenCashFormValues = {
  openingAmountCounted: number;
  openingNote?: string;
};
```

### Validación Zod

```ts
export const openCashSchema = z.object({
  openingAmountCounted: z
    .number()
    .min(0, "El saldo contado no puede ser negativo."),
  openingNote: z.string().max(250).optional(),
});
```

### Reglas UX

- `openingAmountCounted` obligatorio.
- Si `openingAmountCounted !== suggestedAmount`, mostrar advertencia.
- No bloquear por discrepancia.
- Botón principal: `Abrir caja`.

### Errores

| Error backend | UI |
|---|---|
| `CASH_SESSION_ALREADY_OPEN` | Ya hay una caja abierta en esta sucursal. |
| `BRANCH_ACCESS_DENIED` | No tienes acceso a esta sucursal. |
| `PERMISSION_REQUIRED` | No tienes permiso para abrir caja. |

---

## 9. Page: SalePage

### Archivo

```txt
/src/modules/pos/pages/sale-page.tsx
```

### Responsabilidad

Pantalla principal de venta.

### Componentes internos

```txt
PosHeader
WeightSaleInput
AmountSaleInput
ProductQuickGrid
CartPanel
PaymentModal
SaleSuccessModal
PosErrorAlert
KeyboardShortcutsProvider
```

### Hooks usados

```txt
usePosProducts
useCreateSale
useAddSaleItem
useCompleteSale
useCancelDraftSale
usePosCartStore
useCurrentCashSession
```

### Regla

La venta debe poder operarse con teclado y pocos clics.

### Layout funcional

```txt
┌────────────────────────────────────────────────────┐
│ PosHeader                                           │
├─────────────────────────────┬──────────────────────┤
│ Captura rápida              │ CartPanel             │
│ - Tortilla kg               │ - Items               │
│ - Tortilla $                │ - Total               │
│ - Masa kg                   │ - Cobrar              │
│ - Masa $                    │ - Cancelar            │
│ - Paquete 800g              │                      │
│ ProductQuickGrid            │                      │
└─────────────────────────────┴──────────────────────┘
```

---

## 10. Component: WeightSaleInput

### Archivo

```txt
/src/modules/pos/components/weight-sale-input.tsx
```

### Responsabilidad

Capturar venta por kilo para tortilla o masa.

### Props

```ts
type WeightSaleInputProps = {
  product: PosProduct;
  pricePerKg: number;
  label: string;
  shortcut?: string;
  onAddItem: (item: PosCartItem) => void;
};
```

### Comportamiento

```txt
1. Usuario captura kg.
2. Componente calcula total.
3. Al confirmar, agrega item al carrito.
4. Limpia input.
```

### Cálculo

```ts
total = quantityKg * pricePerKg;
```

### Validaciones

```txt
quantityKg > 0
pricePerKg > 0
```

### Ejemplo

```txt
Tortilla kg
Cantidad: 1.5
Precio: $28
Total: $42
```

---

## 11. Component: AmountSaleInput

### Archivo

```txt
/src/modules/pos/components/amount-sale-input.tsx
```

### Responsabilidad

Capturar venta por monto en pesos.

### Props

```ts
type AmountSaleInputProps = {
  product: PosProduct;
  pricePerKg: number;
  label: string;
  shortcut?: string;
  onAddItem: (item: PosCartItem) => void;
};
```

### Comportamiento

```txt
1. Usuario captura monto.
2. Componente calcula kg aproximados.
3. Agrega item con saleMode by_amount.
4. Mantiene total igual al monto capturado.
```

### Cálculo

```ts
quantityKg = amount / pricePerKg;
total = amount;
```

### Validaciones

```txt
amount > 0
pricePerKg > 0
```

### Regla crítica

El cálculo frontend solo sirve para mostrar.  
El backend debe recalcular o validar.

---

## 12. Component: PackageQuickButton

### Archivo

```txt
/src/modules/pos/components/package-quick-button.tsx
```

### Responsabilidad

Agregar paquetes configurables al carrito.

### Props

```ts
type PackageQuickButtonProps = {
  product: PosProduct;
  unitPrice: number;
  defaultQuantity?: number;
  shortcut?: string;
  onAddItem: (item: PosCartItem) => void;
};
```

### Comportamiento

```txt
Click → agrega 1 paquete
Shift + click → abre selector de cantidad
```

### Item generado

```ts
{
  productId: product.id,
  productName: product.name,
  productType: "package",
  saleMode: "by_package",
  quantity: selectedQuantity,
  unit: "package",
  unitPrice,
  total: selectedQuantity * unitPrice
}
```

### Regla

El frontend no calcula descuento de inventario.  
Eso pertenece al backend.

---

## 13. Component: ProductQuickGrid

### Archivo

```txt
/src/modules/pos/components/product-quick-grid.tsx
```

### Responsabilidad

Mostrar productos retail/frecuentes para venta rápida.

### Props

```ts
type ProductQuickGridProps = {
  products: PosProduct[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onAddProduct: (product: PosProduct) => void;
};
```

### Debe incluir

```txt
buscador
grid de productos
estado loading
estado vacío
```

### Filtro recomendado

```txt
nombre
sku
barcode futuro
```

### No debe incluir

```txt
No debe completar venta.
No debe abrir modal de cobro.
No debe modificar caja.
```

---

## 14. Component: RetailProductCard

### Archivo

```txt
/src/modules/pos/components/retail-product-card.tsx
```

### Responsabilidad

Representar un producto retail en el grid.

### Props

```ts
type RetailProductCardProps = {
  product: PosProduct;
  price: number;
  onClick: () => void;
};
```

### Debe mostrar

```txt
nombre
precio
unidad
```

### Acción

```txt
Click → agrega 1 unidad al carrito
```

---

## 15. Component: CartPanel

### Archivo

```txt
/src/modules/pos/components/cart-panel.tsx
```

### Responsabilidad

Mostrar items, totales y acciones de venta.

### Props

```ts
type CartPanelProps = {
  items: PosCartItem[];
  subtotal: number;
  total: number;
  canCheckout: boolean;
  onRemoveItem: (localId: string) => void;
  onClearCart: () => void;
  onCancelTicket: () => void;
  onCheckout: () => void;
};
```

### Debe mostrar

```txt
lista de items
subtotal
total
botón cobrar
botón cancelar ticket
botón limpiar
```

### Reglas

- Si `items.length === 0`, deshabilitar cobrar.
- Si total es 0, deshabilitar cobrar.
- Confirmar antes de limpiar carrito.
- Confirmar antes de cancelar ticket.

---

## 16. Component: CartItemRow

### Archivo

```txt
/src/modules/pos/components/cart-item-row.tsx
```

### Responsabilidad

Mostrar un item del carrito.

### Props

```ts
type CartItemRowProps = {
  item: PosCartItem;
  onRemove: () => void;
};
```

### Debe mostrar

```txt
producto
cantidad
unidad
precio unitario
total
botón eliminar
```

### Formatos

```txt
kg → 3 decimales máximo
money → 2 decimales
```

---

## 17. Component: PaymentModal

### Archivo

```txt
/src/modules/pos/components/payment-modal.tsx
```

### Responsabilidad

Gestionar cobro de la venta.

### Props

```ts
type PaymentModalProps = {
  open: boolean;
  total: number;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmitCash: (payment: { amount: number }) => void;
  onSubmitCard: (payment: { amount: number; reference: string; provider?: string }) => void;
  onSubmitMixed: (payment: PosMixedPayment) => void;
};
```

### Tabs o modos

```txt
Efectivo
Tarjeta
Mixto
```

### Reglas

- No permitir submit doble.
- No cerrar modal mientras `isSubmitting`.
- Si backend falla, mantener modal abierto.
- Si venta completa, cerrar modal y abrir success.

---

## 18. Component: CashPaymentForm

### Archivo

```txt
/src/modules/pos/components/cash-payment-form.tsx
```

### Props

```ts
type CashPaymentFormProps = {
  total: number;
  isSubmitting: boolean;
  onSubmit: (payment: { amount: number }) => void;
};
```

### Campos

```txt
total
recibido
cambio
```

### Validación

```ts
receivedAmount >= total
```

### UX

Botones rápidos:

```txt
$20
$50
$100
$200
$500
Exacto
```

Enter confirma si el monto es válido.

---

## 19. Component: CardPaymentForm

### Archivo

```txt
/src/modules/pos/components/card-payment-form.tsx
```

### Props

```ts
type CardPaymentFormProps = {
  total: number;
  isSubmitting: boolean;
  onSubmit: (payment: {
    amount: number;
    reference: string;
    provider?: string;
  }) => void;
};
```

### Campos

```txt
monto
referencia
proveedor/terminal
```

### Validaciones

```txt
amount === total
reference requerida
```

### Error principal

```txt
CARD_REFERENCE_REQUIRED
```

UI:

```txt
Captura la referencia de la terminal.
```

---

## 20. Component: MixedPaymentForm

### Archivo

```txt
/src/modules/pos/components/mixed-payment-form.tsx
```

### Props

```ts
type MixedPaymentFormProps = {
  total: number;
  isSubmitting: boolean;
  onSubmit: (payment: PosMixedPayment) => void;
};
```

### Campos

```txt
efectivo
tarjeta
referencia tarjeta
proveedor/terminal
```

### Validación

```ts
cashAmount + cardAmount === total;
cardAmount > 0 requires cardReference;
cashAmount >= 0;
cardAmount >= 0;
```

### UX

Mostrar diferencia en tiempo real:

```txt
Faltan $10
Sobran $5
Pago completo
```

---

## 21. Component: SaleSuccessModal

### Archivo

```txt
/src/modules/pos/components/sale-success-modal.tsx
```

### Responsabilidad

Confirmar venta completada.

### Props

```ts
type SaleSuccessModalProps = {
  open: boolean;
  saleNumber: string;
  total: number;
  paymentSummary: string;
  changeAmount?: number;
  onNewSale: () => void;
  onPrintTicket?: () => void;
};
```

### Debe mostrar

```txt
Venta completada
Folio
Total
Pago
Cambio
Nueva venta
Imprimir ticket futuro
```

### Atajos

```txt
Enter → nueva venta
Esc → cerrar modal
```

### Regla

Al confirmar nueva venta:

```txt
clearCart()
clearSaleDraft()
focus captura rápida
```

---

## 22. Component: PosErrorAlert

### Archivo

```txt
/src/modules/pos/components/pos-error-alert.tsx
```

### Responsabilidad

Mostrar errores operativos legibles.

### Props

```ts
type PosErrorAlertProps = {
  error: ApiError | string | null;
  onDismiss?: () => void;
};
```

### Mapeo mínimo

```ts
const POS_ERROR_MESSAGES: Record<string, string> = {
  NO_OPEN_CASH_SESSION: "No hay caja abierta para vender.",
  CARD_REFERENCE_REQUIRED: "Captura la referencia de la terminal.",
  PAYMENT_TOTAL_MISMATCH: "El pago no coincide con el total.",
  PRODUCT_INACTIVE: "Este producto ya no está activo.",
  PRICE_NOT_FOUND: "Este producto no tiene precio configurado.",
  INSUFFICIENT_STOCK: "Stock insuficiente.",
  NEGATIVE_STOCK_NOT_ALLOWED: "No se permite stock negativo para este producto.",
  BRANCH_ACCESS_DENIED: "No tienes acceso a esta sucursal.",
};
```

### Regla

No mostrar códigos técnicos al cajero salvo en modo debug.

---

## 23. Component: KeyboardShortcutsProvider

### Archivo

```txt
/src/modules/pos/components/keyboard-shortcuts-provider.tsx
```

### Responsabilidad

Centralizar atajos de teclado del POS.

### Props

```ts
type KeyboardShortcutsProviderProps = {
  enabled: boolean;
  onTortillaKg: () => void;
  onTortillaAmount: () => void;
  onMasaKg: () => void;
  onMasaAmount: () => void;
  onPackage800g: () => void;
  onCheckout: () => void;
  onCancelTicket: () => void;
  onSearch: () => void;
  children: React.ReactNode;
};
```

### Atajos

```txt
F1  Tortilla kg
F2  Tortilla por monto
F3  Masa kg
F4  Masa por monto
F5  Paquete 800g
F8  Cobrar
F9  Cancelar ticket
Esc Cerrar modal
Enter Confirmar acción principal
Ctrl + F Buscar producto
```

### Reglas

- Desactivar atajos cuando el usuario escribe en input, excepto Enter/Esc contextual.
- Desactivar atajos durante submit.
- No interceptar atajos críticos del navegador sin necesidad.

---

## 24. Hooks

### 24.1 useCurrentCashSession

```ts
type UseCurrentCashSessionParams = {
  branchId: string;
};

type UseCurrentCashSessionResult = {
  cashSession: CashSession | null;
  status: "loading" | "error" | "success";
  error: ApiError | null;
  refetch: () => void;
};
```

Endpoint:

```txt
GET /cash-sessions/open?branchId=
```

---

### 24.2 useOpenCashSession

```ts
type OpenCashPayload = {
  branchId: string;
  openingAmountCounted: string;
  openingNote?: string;
};
```

Endpoint:

```txt
POST /cash-sessions/open
```

On success:

```txt
guardar cashSessionId
redirigir a /app/pos/sale
```

---

### 24.3 usePosProducts

```ts
type UsePosProductsParams = {
  branchId: string;
};

type UsePosProductsResult = {
  products: PosProduct[];
  tortillaProduct: PosProduct | null;
  masaProduct: PosProduct | null;
  package800gProduct: PosProduct | null;
  retailProducts: PosProduct[];
  isLoading: boolean;
  error: ApiError | null;
};
```

Endpoints:

```txt
GET /products
GET /prices/branch/{branchId}
```

Regla:

Unificar productos + precios para vista POS.

---

### 24.4 useCreateSale

```ts
type CreateSalePayload = {
  branchId: string;
};
```

Endpoint:

```txt
POST /sales
```

---

### 24.5 useAddSaleItem

```ts
type AddSaleItemPayload =
  | {
      saleId: string;
      productId: string;
      saleMode: "by_kg" | "by_package" | "by_unit";
      quantity: string;
    }
  | {
      saleId: string;
      productId: string;
      saleMode: "by_amount";
      amount: string;
    };
```

Endpoint:

```txt
POST /sales/{id}/items
```

Regla:

```txt
Enviar los items después de crear el draft y antes de completar la venta.
Para by_amount enviar amount, no quantity calculada por el frontend.
```

---

### 24.6 useCompleteSale

```ts
type CompleteSalePayload = {
  saleId: string;
  payments: PosPayment[];
};
```

Endpoint:

```txt
POST /sales/{id}/complete
```

Regla:

Si falla, mantener carrito y modal de cobro.

Los formularios pueden manejar montos como número para cálculo visual, pero el payload enviado al backend debe serializar `amount` como string decimal (`"86.00"`).

---

### 24.7 useCancelDraftSale

Endpoint:

```txt
POST /sales/{id}/cancel-draft
```

Uso:

```txt
Solo si la venta draft ya existe en backend.
Si no existe, solo clearCart().
```

---

## 25. Stores

### 25.1 pos-cart.store.ts

```ts
type PosCartStore = {
  items: PosCartItem[];
  subtotal: number;
  total: number;
  saleDraftId: string | null;

  addItem: (item: PosCartItem) => void;
  removeItem: (localId: string) => void;
  clearCart: () => void;

  setSaleDraftId: (saleId: string) => void;
  clearSaleDraftId: () => void;
};
```

### Reglas

- El carrito local no es fuente financiera definitiva.
- El backend recalcula total.
- Si backend responde diferente, mostrar total backend antes de cobrar si aplica.
- No persistir carrito indefinidamente sin estrategia clara.

Para V1:

```txt
persistencia local opcional solo durante sesión
```

---

## 26. Schemas Zod

### 26.1 sale-item.schema.ts

```ts
export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  saleMode: z.enum(["by_kg", "by_amount", "by_package", "by_unit"]),
});
```

### 26.2 cash-payment.schema.ts

```ts
export const cashPaymentSchema = z.object({
  receivedAmount: z.number().positive(),
});
```

Validación adicional:

```ts
receivedAmount >= total
```

### 26.3 card-payment.schema.ts

```ts
export const cardPaymentSchema = z.object({
  amount: z.number().positive(),
  reference: z.string().min(1, "Captura la referencia de la terminal."),
  provider: z.string().optional(),
});
```

### 26.4 mixed-payment.schema.ts

```ts
export const mixedPaymentSchema = z.object({
  cashAmount: z.number().min(0),
  cardAmount: z.number().min(0),
  cardReference: z.string().optional(),
  cardProvider: z.string().optional(),
});
```

Validaciones externas:

```txt
cashAmount + cardAmount === total
cardAmount > 0 requiere cardReference
```

---

## 27. Flujo interno recomendado de venta

```txt
1. Cajero agrega items al carrito.
2. Cajero presiona cobrar.
3. PaymentModal valida método de pago.
4. Frontend llama POST /sales con branchId.
5. Backend responde venta draft.
6. Frontend envía cada item con POST /sales/{id}/items.
7. Frontend llama POST /sales/{id}/complete con pagos.
8. Backend completa venta y descuenta inventario.
9. Frontend limpia carrito.
10. Frontend muestra SaleSuccessModal.
```

### Si falla `POST /sales`

```txt
No abrir éxito.
Mantener carrito.
Mostrar error.
```

### Si falla `POST /sales/{id}/items`

```txt
No abrir éxito.
Mantener carrito.
Mostrar error.
Si se creó draft, permitir cancelar draft.
```

### Si falla `POST /sales/{id}/complete`

```txt
Mantener carrito.
Mantener modal de cobro.
Mostrar error.
Si se creó draft, permitir cancelar draft.
```

---

## 28. QA Components

### CMP-QA-001

`OpenCashForm` no permite saldo negativo.

### CMP-QA-002

`OpenCashForm` muestra advertencia si saldo contado difiere del sugerido.

### CMP-QA-003

`WeightSaleInput` calcula total correctamente.

### CMP-QA-004

`AmountSaleInput` calcula kg aproximados correctamente.

### CMP-QA-005

`PackageQuickButton` agrega item con `saleMode = by_package`.

### CMP-QA-006

`ProductQuickGrid` filtra por nombre.

### CMP-QA-007

`RetailProductCard` agrega 1 unidad al carrito.

### CMP-QA-008

`CartPanel` deshabilita cobrar con carrito vacío.

### CMP-QA-009

`CartPanel` calcula total desde items.

### CMP-QA-010

`PaymentModal` muestra modos efectivo, tarjeta y mixto.

### CMP-QA-011

`CashPaymentForm` calcula cambio.

### CMP-QA-012

`CashPaymentForm` bloquea recibido menor al total.

### CMP-QA-013

`CardPaymentForm` exige referencia.

### CMP-QA-014

`MixedPaymentForm` bloquea suma distinta al total.

### CMP-QA-015

`SaleSuccessModal` ejecuta nueva venta con Enter.

### CMP-QA-016

`KeyboardShortcutsProvider` ejecuta F8 para cobrar.

### CMP-QA-017

`KeyboardShortcutsProvider` no dispara F1/F2 mientras se escribe en input.

### CMP-QA-018

`PosErrorAlert` traduce errores backend a mensajes claros.

---

## 29. Definition of Done Components V0.1

```txt
[ ] Componentes creados en estructura definida
[ ] Props tipadas
[ ] Schemas Zod creados
[ ] Hooks API conectados o mockeados
[ ] Stores funcionando
[ ] Carrito agrega/elimina/limpia items
[ ] Inputs calculan totales correctamente
[ ] Modal de cobro valida efectivo/tarjeta/mixto
[ ] Modal de éxito limpia venta
[ ] Atajos básicos implementados
[ ] Errores operativos mapeados
[ ] Tests unitarios de componentes críticos
[ ] Build pasa
```

---

## 30. Orden de implementación recomendado

No construir todo al mismo tiempo.

### Bloque 1

```txt
pos-cart.store.ts
types/pos.types.ts
schemas/sale-item.schema.ts
CartPanel
CartItemRow
```

### Bloque 2

```txt
WeightSaleInput
AmountSaleInput
PackageQuickButton
RetailProductCard
ProductQuickGrid
```

### Bloque 3

```txt
PaymentModal
CashPaymentForm
CardPaymentForm
MixedPaymentForm
SaleSuccessModal
```

### Bloque 4

```txt
useCreateSale
useAddSaleItem
useCompleteSale
useCancelDraftSale
SalePage integration
```

### Bloque 5

```txt
KeyboardShortcutsProvider
PosErrorAlert
QA components
```

---

## 31. Siguiente documento

Después de este contrato, sigue:

```txt
Frontend Manager PWA Flow V0.1
```
