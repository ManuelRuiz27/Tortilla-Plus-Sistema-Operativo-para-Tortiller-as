# Tortilla Plus — Frontend POS Flow V0.1

## 1. Objetivo

Definir el flujo inicial del **POS PWA** para que el cajero pueda operar ventas reales:

```txt
login
selección de sucursal
validación de caja
apertura de caja
venta rápida
cobro
resultado de venta
errores operativos
```

No incluye todavía:

```txt
clientes con crédito
devoluciones
cierre completo de caja
rutas
facturación
reportes
```

Eso va después.

---

## 2. Flujo principal POS

```txt
/login
  ↓
/app/select-branch
  ↓
/app/pos
  ↓
validar caja abierta
  ↓
si no hay caja → /app/pos/cash/open
si hay caja → /app/pos/sale
  ↓
crear venta
  ↓
cobrar
  ↓
venta completada
  ↓
nueva venta
```

---

## 3. Rutas POS

```txt
/app/pos
/app/pos/cash/open
/app/pos/sale
/app/pos/payment
/app/pos/sale-success
```

### Redirección recomendada

`/app/pos` no debe ser una pantalla pesada. Debe ser un router operativo:

```txt
1. revisar branch activa
2. revisar caja abierta
3. si no hay caja → /app/pos/cash/open
4. si hay caja → /app/pos/sale
```

---

## 4. Endpoints usados

### Caja

```txt
GET  /cash-sessions/open?branchId=
POST /cash-sessions/open
GET  /cash-sessions/{id}/summary
```

### Productos/precios

```txt
GET /products
GET /prices/branch/{branchId}
```

### Ventas

```txt
POST /sales
POST /sales/{id}/items
POST /sales/{id}/complete
POST /sales/{id}/cancel-draft
GET  /sales/{id}
```

---

## 5. Estado local POS

### POS Session State

```ts
type PosSessionState = {
  branchId: string;
  branchName: string;
  cashSessionId: string | null;
  cashStatus: "unknown" | "not_open" | "open" | "closing" | "closed";
};
```

### POS Cart State

```ts
type PosCartItem = {
  localId: string;
  productId: string;
  productName: string;
  productType: "tortilla" | "masa" | "package" | "retail" | "service";
  saleMode: "by_kg" | "by_amount" | "by_package" | "by_unit";
  quantity: number;
  unitPrice: number;
  total: number;
  unit: "kg" | "piece" | "package" | "liter" | "service";
};

type PosCartState = {
  items: PosCartItem[];
  subtotal: number;
  total: number;
  addItem: (item: PosCartItem) => void;
  removeItem: (localId: string) => void;
  clearCart: () => void;
};
```

---

## 6. Pantalla: POS Router

### Ruta

```txt
/app/pos
```

### Objetivo

Determinar si el usuario puede vender.

### Datos requeridos

```txt
activeBranchId
currentUser
permissions
cashSession
```

### Lógica

```txt
Si no hay sesión → /login
Si no hay branch activa → /app/select-branch
Consultar caja abierta
Si no hay caja abierta → /app/pos/cash/open
Si hay caja abierta → /app/pos/sale
```

### Estados

```txt
loading
no branch
no cash session
cash session open
error
```

### Errores esperados

```txt
BRANCH_ACCESS_DENIED
UNAUTHORIZED
```

---

## 7. Pantalla: Apertura de caja

### Ruta

```txt
/app/pos/cash/open
```

### Objetivo

Permitir que cajero o gerente abra caja antes de vender.

### Endpoint

```txt
POST /cash-sessions/open
```

### Request

```json
{
  "branchId": "uuid",
  "openingAmountCounted": "500.00",
  "openingNote": "Caja inicia con fondo confirmado"
}
```

### Campos UI

```txt
Sucursal
Cajero
Saldo sugerido
Saldo contado
Nota opcional
Botón abrir caja
```

### Reglas UX

- El saldo contado debe ser obligatorio.
- Si saldo contado ≠ saldo sugerido, mostrar advertencia.
- No bloquear apertura por discrepancia.
- Mostrar mensaje claro: “Se registrará una diferencia de apertura”.

### Validaciones frontend

```txt
openingAmountCounted >= 0
openingAmountCounted requerido
openingNote máximo 250 caracteres
```

### Resultado exitoso

```txt
guardar cashSessionId
redirigir a /app/pos/sale
```

### Errores backend

| Error | Mensaje UI |
|---|---|
| `CASH_SESSION_ALREADY_OPEN` | Ya hay una caja abierta en esta sucursal. |
| `BRANCH_ACCESS_DENIED` | No tienes acceso a esta sucursal. |
| `PERMISSION_REQUIRED` | No tienes permiso para abrir caja. |

---

## 8. Pantalla: Venta POS

### Ruta

```txt
/app/pos/sale
```

### Objetivo

Capturar productos rápidamente y preparar cobro.

### Layout funcional

```txt
┌─────────────────────────────────────────────┐
│ Header: sucursal | caja | cajero | hora      │
├───────────────────────┬─────────────────────┤
│ Captura rápida         │ Carrito             │
│ Productos frecuentes   │ Totales             │
│ Buscador producto      │ Acciones            │
└───────────────────────┴─────────────────────┘
```

### Bloques principales

#### A. Header compacto

Mostrar:

```txt
Sucursal activa
Caja abierta
Usuario
Botón salir
Botón cambiar sucursal si tiene permiso
```

No mostrar métricas aquí. Estorban al cajero.

#### B. Captura rápida tortilla/masa

Debe tener botones grandes:

```txt
Tortilla kg
Tortilla $
Masa kg
Masa $
Paquete 800g
```

#### C. Productos frecuentes

Mostrar grid de productos activos:

```txt
Salsa
Guiso
Bebida
Bolsa
Otros retail
```

Cada producto agrega 1 unidad al carrito.

#### D. Carrito

Mostrar:

```txt
producto
cantidad
precio
total
eliminar
```

Acciones:

```txt
vaciar carrito
cancelar ticket
ir a cobro
```

---

## 9. Captura: Tortilla por kilo

### Acción

Usuario captura cantidad en kg.

```txt
Ejemplo:
1.5 kg de tortilla
```

### Cálculo

```txt
total = quantityKg * pricePerKg
```

### Item local

```json
{
  "productId": "uuid-tortilla",
  "productName": "Tortilla",
  "saleMode": "by_kg",
  "quantity": 1.5,
  "unitPrice": 28,
  "total": 42,
  "unit": "kg"
}
```

### Validaciones

```txt
quantity > 0
quantity máximo configurable
precio existente
```

---

## 10. Captura: Tortilla por monto

### Acción

Usuario captura monto en pesos.

```txt
Ejemplo:
$20 de tortilla
```

### Cálculo frontend

```txt
quantityKg = amount / pricePerKg
```

Ejemplo:

```txt
20 / 28 = 0.714 kg
```

### Item local

```json
{
  "productId": "uuid-tortilla",
  "productName": "Tortilla",
  "saleMode": "by_amount",
  "quantity": 0.714,
  "unitPrice": 28,
  "total": 20,
  "unit": "kg"
}
```

### Regla importante

El frontend puede calcular para mostrar, pero el backend debe recalcular o validar.

No confiar en el cálculo del cliente.

---

## 11. Captura: Paquete 800g

### Acción

Usuario agrega paquete configurado.

```txt
1 paquete
5 paquetes
10 paquetes
```

### Producto

```txt
product_type = package
sale_mode = by_package
```

### Item local

```json
{
  "productId": "uuid-pack-800",
  "productName": "Paquete tortilla 800g",
  "saleMode": "by_package",
  "quantity": 1,
  "unitPrice": 22,
  "total": 22,
  "unit": "package"
}
```

### Regla backend

El frontend no descuenta inventario.  
Solo manda venta.

Backend descuenta:

```txt
quantity_packages * 0.800 kg
```

---

## 12. Captura: Retail

### Acción

Usuario selecciona producto.

Ejemplo:

```txt
Salsa roja chica
```

### Item local

```json
{
  "productId": "uuid-salsa",
  "productName": "Salsa roja chica",
  "saleMode": "by_unit",
  "quantity": 1,
  "unitPrice": 15,
  "total": 15,
  "unit": "piece"
}
```

---

## 13. Crear venta

### Momento recomendado

No crear ni actualizar venta en backend por cada click.

Mala idea:

```txt
cada click de producto → POST /sales/{id}/items
```

Eso mete latencia innecesaria durante la captura.

Mejor para V1:

```txt
carrito local → POST /sales → POST /sales/{id}/items por item → POST /sales/{id}/complete
```

### Request `POST /sales`

```json
{
  "branchId": "uuid"
}
```

### Request `POST /sales/{id}/items`

Para venta por kilo, paquete o unidad:

```json
{
  "productId": "uuid-tortilla",
  "saleMode": "by_kg",
  "quantity": "1.500"
}
```

Para venta por monto:

```json
{
  "productId": "uuid-tortilla",
  "saleMode": "by_amount",
  "amount": "20.00"
}
```

### Response

```json
{
  "id": "uuid-sale",
  "saleNumber": "SUC-000001",
  "status": "draft",
  "subtotal": 0,
  "total": 0,
  "items": []
}
```

---

## 14. Pantalla / Modal: Cobro

### Ruta recomendada

Para rapidez, usar modal sobre `/app/pos/sale`.

No mandar a otra pantalla salvo que sea necesario.

### Métodos V1 inicial

```txt
efectivo
tarjeta
mixto efectivo + tarjeta
```

Dejar crédito para siguiente sprint de frontend.

---

### Cobro efectivo

Campos:

```txt
total
recibido
cambio
```

Validación:

```txt
recibido >= total
```

Request:

```json
{
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": "86.00"
    }
  ]
}
```

---

### Cobro tarjeta

Campos:

```txt
total
referencia
proveedor/terminal opcional
```

Validación:

```txt
referencia requerida
```

Request:

```json
{
  "payments": [
    {
      "paymentMethod": "card",
      "amount": "86.00",
      "reference": "MP-123456",
      "provider": "mercadopago_terminal"
    }
  ]
}
```

---

### Cobro mixto efectivo + tarjeta

Campos:

```txt
monto efectivo
monto tarjeta
referencia tarjeta
```

Validación:

```txt
cashAmount + cardAmount = total
cardAmount > 0 requiere referencia
```

Request:

```json
{
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": "40.00"
    },
    {
      "paymentMethod": "card",
      "amount": "46.00",
      "reference": "MP-123456",
      "provider": "mercadopago_terminal"
    }
  ]
}
```

---

## 15. Completar venta

### Endpoint

```txt
POST /sales/{id}/complete
```

### Proceso frontend

```txt
1. Crear venta draft con `branchId`.
2. Recibir saleId.
3. Enviar cada item del carrito a `POST /sales/{id}/items`.
4. Completar venta con payments.
5. Backend descuenta inventario.
6. Backend retorna venta completed.
7. Limpiar carrito.
8. Mostrar éxito.
```

### No hacer

No limpiar carrito antes de confirmar venta completada.

Si falla el cobro o inventario:

```txt
mantener carrito
mostrar error
permitir corregir
```

---

## 16. Resultado de venta

### Modal o pantalla

```txt
Venta completada
Total
Método de pago
Cambio si aplica
Folio
Botón nueva venta
Botón imprimir opcional
```

### Acciones

```txt
Enter → nueva venta
Esc → cerrar modal
```

---

## 17. Cancelar ticket

### Caso

Venta aún no cobrada.

Si venta solo existe localmente:

```txt
limpiar carrito
```

Si ya se creó draft en backend:

```txt
POST /sales/{id}/cancel-draft
```

### Confirmación

Mostrar modal:

```txt
¿Cancelar ticket actual?
```

No pedir PIN para draft.

---

## 18. Atajos de teclado

La operación debe poder hacerse con teclado.

### Atajos mínimos

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

### Regla

No asignar atajos que el navegador use de forma crítica.

---

## 19. Estados de error POS

| Error backend | Comportamiento UI |
|---|---|
| `NO_OPEN_CASH_SESSION` | Redirigir a apertura de caja. |
| `CARD_REFERENCE_REQUIRED` | Enfocar campo referencia. |
| `PAYMENT_TOTAL_MISMATCH` | Mantener modal de cobro abierto. |
| `PRODUCT_INACTIVE` | Retirar producto del carrito y mostrar aviso. |
| `PRICE_NOT_FOUND` | Bloquear producto y avisar al cajero. |
| `INSUFFICIENT_STOCK` | Mostrar “stock insuficiente”. |
| `NEGATIVE_STOCK_NOT_ALLOWED` | Bloquear venta del producto. |
| `BRANCH_ACCESS_DENIED` | Sacar de POS y pedir sucursal válida. |
| `SUBSCRIPTION_SUSPENDED_LIMITED` | Permitir POS básico, bloquear premium. |

---

## 20. Loading states

### Carga inicial POS

Mostrar:

```txt
Validando caja...
```

### Carga de productos

Mostrar skeleton simple.

No bloquear toda la pantalla si ya hay productos cacheados.

### Completar venta

Bloquear botón cobrar y mostrar:

```txt
Procesando venta...
```

No permitir doble submit.

---

## 21. Offline

No implementar offline completo.

Para V1:

```txt
si no hay conexión:
- bloquear completar venta
- mostrar mensaje claro
- mantener carrito local
```

Mensaje:

```txt
Sin conexión. No se puede completar la venta hasta reconectar.
```

No prometer sincronización.

---

## 22. QA funcional POS frontend

### POS-QA-001

Entrar a `/app/pos` sin caja abierta redirige a apertura de caja.

### POS-QA-002

Abrir caja correctamente redirige a venta.

### POS-QA-003

Apertura con discrepancia muestra advertencia pero permite continuar.

### POS-QA-004

Agregar tortilla por kg calcula total correcto.

### POS-QA-005

Agregar tortilla por monto calcula kg aproximados.

### POS-QA-006

Agregar paquete 800g agrega item con saleMode `by_package`.

### POS-QA-007

Agregar retail suma una unidad.

### POS-QA-008

Vaciar carrito deja total en cero.

### POS-QA-009

Cobro efectivo calcula cambio.

### POS-QA-010

Cobro efectivo menor al total bloquea continuar.

### POS-QA-011

Cobro tarjeta sin referencia bloquea continuar.

### POS-QA-012

Cobro tarjeta con referencia completa venta.

### POS-QA-013

Cobro mixto con suma incorrecta bloquea continuar.

### POS-QA-014

Cobro mixto correcto completa venta.

### POS-QA-015

Si backend responde `PAYMENT_TOTAL_MISMATCH`, mantiene carrito.

### POS-QA-016

Si backend responde `NO_OPEN_CASH_SESSION`, redirige a apertura.

### POS-QA-017

Si backend responde `PRICE_NOT_FOUND`, bloquea producto.

### POS-QA-018

Si venta completa exitosamente, limpia carrito.

### POS-QA-019

Después de venta exitosa, Enter inicia nueva venta.

### POS-QA-020

Atajo F8 abre modal de cobro.

---

## 23. Definition of Done POS Flow V0.1

```txt
[ ] /app/pos valida branch y caja
[ ] /app/pos/cash/open funciona
[ ] /app/pos/sale muestra productos
[ ] carrito local funciona
[ ] venta por kg funciona
[ ] venta por monto funciona
[ ] paquete 800g funciona
[ ] retail funciona
[ ] cobro efectivo funciona
[ ] cobro tarjeta exige referencia
[ ] cobro mixto valida suma
[ ] completar venta limpia carrito
[ ] error backend mantiene carrito
[ ] atajos básicos funcionan
[ ] loading states implementados
[ ] errores operativos son legibles
[ ] build pasa
```

---

## 24. Siguiente documento

Después de esto sigue:

```txt
Frontend POS Components Contract V0.1
```

Ese documento baja esto a componentes específicos:

```txt
PosHeader
OpenCashForm
ProductQuickGrid
WeightSaleInput
AmountSaleInput
CartPanel
PaymentModal
SaleSuccessModal
KeyboardShortcutsProvider
```
