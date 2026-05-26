# Tortilla Plus — Auditoría destructiva POS Cajero V0.1

**Proyecto:** Tortilla Plus — V1 Operativa Comercial  
**Área:** POS / Cajero / Caja / Venta en mostrador  
**Objetivo:** encontrar rutas, estados, combinaciones de datos y flujos con capacidad de romper la operación antes de entregar el POS a usuarios reales.  
**Modo de auditoría:** destructivo, meticuloso y orientado a fallas.  
**Estado:** documento de trabajo para estabilización.

---

## 0. Regla de trabajo

Este documento separa tres categorías:

1. **Hallazgo confirmado:** deriva de archivos existentes del repo.
2. **Riesgo operativo:** patrón con alta probabilidad de romper flujo, pero requiere prueba en entorno local/E2E.
3. **Pregunta bloqueante:** no debe resolverse por interpretación; requiere decisión funcional o técnica.

No asumir comportamiento de negocio si no está definido.

---

## 1. Alcance de la auditoría

### Incluye

- Rutas POS.
- Rol cajero.
- Selección de sucursal.
- Apertura de caja.
- Validación de caja abierta.
- Venta de tortilla por kg.
- Venta de tortilla por monto.
- Venta de masa por kg.
- Venta de masa por monto.
- Paquete 800g.
- Productos retail.
- Selector de cliente.
- Precios por cliente.
- Crédito / fiado.
- Pago efectivo.
- Pago tarjeta.
- Pago transferencia.
- Pago mixto.
- Cancelación de carrito / draft.
- Estados de error.
- Manejo de datos inválidos.
- Casos de navegación directa.
- Riesgo de estados locales obsoletos.

### No incluye, salvo como dependencia de POS

- Facturación CFDI completa.
- Rutas de reparto completas.
- Conciliación bancaria.
- Cierre completo administrativo de caja.
- Integración real con terminal Mercado Pago / Clip.
- Integración real con báscula.

---

## 2. Archivos fuente revisados

### Frontend POS

- `apps/web/src/app/router.tsx`
- `apps/web/src/modules/pos/pages/pos-router-page.tsx`
- `apps/web/src/modules/pos/pages/sale-page.tsx`
- `apps/web/src/modules/pos/pages/open-cash-page.tsx`
- `apps/web/src/modules/pos/components/payment-modal.tsx`
- `apps/web/src/modules/pos/components/amount-sale-input.tsx`
- `apps/web/src/modules/pos/components/weight-sale-input.tsx`
- `apps/web/src/modules/pos/components/package-quick-button.tsx`
- `apps/web/src/modules/pos/components/product-quick-grid.tsx`
- `apps/web/src/modules/pos/components/customer-selector.tsx`
- `apps/web/src/modules/pos/components/cart-panel.tsx`
- `apps/web/src/modules/pos/components/cart-item-row.tsx`
- `apps/web/src/modules/pos/stores/pos-cart.store.ts`
- `apps/web/src/modules/pos/hooks/use-pos-products.ts`
- `apps/web/src/api/sales.api.ts`
- `apps/web/src/api/cash.api.ts`
- `apps/web/src/api/products.api.ts`
- `apps/web/src/api/http-client.ts`
- `apps/web/src/shared/layouts/pos-layout.tsx`
- `apps/web/src/shared/guards/branch-guard.tsx`
- `apps/web/src/shared/guards/role-guard.tsx`

### Backend relacionado

- `apps/api/src/services/sale-service.ts`
- `apps/api/src/server.ts`
- `apps/api/tests/sale-utils.test.ts`
- `apps/api/tests/integration/pos-operational-flow.test.ts`

### Documentación relacionada

- `docs/frontend/02-pos-flow.md`
- `docs/frontend/03-pos-components-contract.md`
- `docs/backend/03-critical-flows.md`
- `docs/database/02-erd-rules.md`
- `docs/security/permission-matrix-v0.1.md`

---

## 3. Diagnóstico ejecutivo

El backend tiene validaciones importantes, pero el POS frontend permite llegar a estados operativos inválidos antes de que el backend bloquee. Esto genera mala UX, drafts parciales, errores tardíos y riesgo de operación confusa para cajero.

La prioridad no es agregar funcionalidades nuevas. La prioridad es cerrar rutas, endurecer validaciones y volver transaccional el flujo de venta.

---

## 4. Hallazgos confirmados

## P0-01 — `/app/pos/sale` no tiene guard propio de caja abierta

### Tipo

Hallazgo confirmado.

### Evidencia

`/app/pos` ejecuta `PosRouterPage`, que consulta caja abierta y redirige a venta o apertura. Sin embargo, `/app/pos/sale` está registrada como ruta directa hija y renderiza `SalePage` sin guard específico de caja.

### Riesgo

Un usuario puede navegar directamente a `/app/pos/sale` con sucursal activa pero sin caja abierta.

### Cómo romperlo

1. Iniciar sesión.
2. Seleccionar sucursal.
3. No abrir caja.
4. Ir manualmente a `/app/pos/sale`.
5. Agregar productos.
6. Intentar cobrar.

### Resultado incorrecto actual esperado

El POS permite construir venta antes de detectar que no hay caja válida.

### Resultado correcto

Debe redirigir a `/app/pos/cash/open` antes de cargar pantalla de venta.

### Reparación requerida

Crear `CashSessionGuard` y envolver `SalePage`.

```tsx
<Route
  element={
    <CashSessionGuard>
      <SalePage />
    </CashSessionGuard>
  }
  path="sale"
/>
```

### Criterio de aceptación

- Si no hay caja abierta, `/app/pos/sale` nunca renderiza inputs de venta.
- Si hay caja abierta, `/app/pos/sale` renderiza venta.
- Si la consulta de caja falla, muestra error recuperable.

---

## P0-02 — POS frontend no tiene `RoleGuard`

### Tipo

Hallazgo confirmado.

### Evidencia

La ruta `/app/manager` sí tiene `RoleGuard`. La ruta `/app/pos` no tiene guard por rol.

### Riesgo

Cualquier usuario autenticado con branch activa puede intentar entrar al POS desde frontend aunque no sea cajero.

### Cómo romperlo

1. Crear usuario sin rol cajero.
2. Asignarle branch.
3. Entrar a `/app/pos/sale`.

### Resultado correcto

El frontend debe bloquear antes de cargar POS.

### Reparación requerida

Agregar `RoleGuard` a POS con roles permitidos reales.

### Pregunta bloqueante

¿Qué roles exactos pueden operar POS?

Opciones posibles:

- `cashier`
- `supervisor`
- `manager`
- `organization_owner`

No asumir si el modelo real usa otros nombres.

---

## P0-03 — Inputs numéricos usan `Number()` sin parser operativo controlado

### Tipo

Hallazgo confirmado.

### Evidencia

Componentes afectados:

- `AmountSaleInput`
- `WeightSaleInput`
- `PaymentModal`
- `OpenCashPage`

Usan conversión directa `Number(...)`.

### Riesgo

Aceptan formatos que no corresponden a operación de caja:

- `1e9`
- `1e-3`
- espacios
- valores extremadamente grandes
- decimales fuera de escala
- `Infinity` en algunos caminos si no se filtra antes
- coma decimal no manejada

### Cómo romperlo

Probar:

```txt
1e3
999999999999
0.0000001
  10  
10.999999
1,5
abc
```

### Resultado correcto

El POS solo debe aceptar decimal operativo con escala definida.

### Reparación requerida

Crear utilidades comunes:

```ts
type DecimalParseResult =
  | { ok: true; value: number; normalized: string }
  | { ok: false; reason: string };

parseMoneyInput(value: string, options: { min: number; max: number }): DecimalParseResult;
parseKgInput(value: string, options: { min: number; max: number; decimals: 3 }): DecimalParseResult;
```

### Criterio de aceptación

- No se acepta notación científica.
- No se acepta número negativo.
- No se acepta vacío como cero salvo regla explícita.
- No se acepta más de 2 decimales para dinero.
- No se acepta más de 3 decimales para kg.
- Se muestra mensaje claro por campo.

---

## P0-04 — Checkout no es atómico desde frontend

### Tipo

Hallazgo confirmado / riesgo operativo alto.

### Evidencia

El frontend hace:

1. `POST /sales`
2. `POST /sales/{id}/items` por cada item
3. `POST /sales/{id}/complete`

Los items se mandan con `Promise.all`.

### Riesgo

Si uno de varios items falla, puede quedar una venta draft parcial.

### Cómo romperlo

1. Agregar 5 productos.
2. Desactivar uno desde backend/manager antes de cobrar.
3. Cobrar.
4. Algunos items se agregan, otro falla.
5. Draft queda incompleto o requiere recuperación manual.

### Resultado correcto

La venta debe completarse o no existir como operación parcial.

### Reparación recomendada

Crear endpoint atómico:

```http
POST /sales/checkout
```

Payload:

```json
{
  "branchId": "uuid",
  "customerId": "uuid|null",
  "items": [
    {
      "productId": "uuid",
      "saleMode": "by_kg",
      "quantity": "1.000"
    }
  ],
  "payments": [
    {
      "paymentMethod": "cash",
      "amount": "24.00"
    }
  ],
  "authorizationPin": null,
  "requestInvoice": false
}
```

### Alternativa mínima si no se crea endpoint nuevo

- Si falla cualquier `addSaleItem`, ejecutar `cancelDraftSaleRequest(saleDraftId)` automáticamente.
- Mostrar error: “No se completó la venta. El borrador fue cancelado.”
- No dejar venta parcial silenciosa.

---

## P1-01 — Apertura de caja inicia con `$500.00` por defecto

### Tipo

Hallazgo confirmado.

### Riesgo

El cajero puede abrir caja sin contar efectivo.

### Cómo romperlo

1. Entrar a apertura de caja.
2. No tocar campo.
3. Presionar abrir caja.
4. Caja inicia con `$500.00` aunque el conteo real no se hizo.

### Resultado correcto

El campo debe iniciar vacío. Si existe fondo sugerido, debe mostrarse separado.

### Reparación requerida

- `openingAmountCounted = ""`.
- Placeholder: `0.00`.
- Label: `Efectivo contado`.
- Campo obligatorio.

---

## P1-02 — `SalePage` no usa snapshot fuerte de quote al cobrar

### Tipo

Hallazgo confirmado / riesgo operativo.

### Riesgo

El total del store puede no corresponder al último quote backend si el usuario cambia cliente/precio y cobra rápido.

### Cómo romperlo

1. Agregar tortilla como público general.
2. Seleccionar cliente con precio especial.
3. Presionar F8 inmediatamente.
4. Abrir modal con total viejo o intermedio.

### Resultado correcto

Cobro debe usar quote backend confirmado.

### Reparación requerida

`handleCheckout` debe:

1. bloquear UI;
2. pedir quote;
3. actualizar carrito;
4. abrir modal solo con quote confirmado;
5. guardar `quoteVersion` o snapshot local.

---

## P1-03 — Normalización silenciosa de productos en frontend

### Tipo

Hallazgo confirmado.

### Evidencia

`products.api.ts` convierte valores desconocidos:

```txt
productType inválido → retail
unit inválida → piece
saleMode inválido → by_unit
```

### Riesgo

Producto mal configurado puede venderse de forma incorrecta.

### Resultado correcto

El POS debe bloquear productos con configuración inválida.

### Reparación requerida

Cambiar normalización silenciosa por validación estricta:

```ts
if (!productTypes.has(value)) {
  return { invalid: true, reason: "PRODUCT_TYPE_INVALID" };
}
```

---

## P1-04 — Selector de cliente depende de búsqueda general sin estado de error fuerte

### Tipo

Hallazgo confirmado.

### Riesgo

Si falla carga de clientes, el POS sigue como público general. Esto puede ser correcto, pero requiere decisión.

### Pregunta bloqueante

Si el endpoint de clientes falla, ¿el POS debe permitir vender como público general o bloquear para evitar perder precios especiales/fiado?

Opciones:

1. Permitir venta público general.
2. Bloquear solo venta con cliente.
3. Bloquear toda venta hasta recuperar clientes.

No asumir.

---

## P1-05 — Crédito/fiado requiere definición exacta de autorización

### Tipo

Pregunta bloqueante.

### Riesgo

La UI permite crédito si el cliente tiene `creditEnabled`; si excede límite pide PIN. Pero hay que definir quién autoriza y cómo se audita.

### Preguntas bloqueantes

1. ¿El PIN es del cajero, supervisor o gerente?
2. ¿El cajero puede autorizar si tiene rol supervisor?
3. ¿El exceso de límite siempre requiere PIN?
4. ¿El PIN autoriza solo esa venta o deja margen abierto?
5. ¿Se debe registrar motivo de autorización?

---

## P2-01 — Producto operativo se selecciona por primer `productType`

### Tipo

Hallazgo confirmado.

### Evidencia

`usePosProducts` usa `find(product.productType === type)`.

### Riesgo

Si hay más de un producto tipo `package`, `tortilla` o `masa`, el POS puede elegir el incorrecto.

### Pregunta bloqueante

¿Cómo se identifica el producto operativo principal?

Opciones:

1. SKU fijo: `TORTILLA-KG`, `MASA-KG`, `PAQUETE-800G`.
2. Flag en producto: `isDefaultPosProduct`.
3. Configuración por sucursal.
4. Catálogo especial POS.

No asumir.

---

## P2-02 — Paquete 800g solo permite agregar de uno en uno

### Tipo

Hallazgo confirmado.

### Riesgo

Operación lenta y propensa a error para ventas de 5, 10 o más paquetes.

### Reparación recomendada

- Botones rápidos: `+1`, `+5`, `+10`.
- O input de cantidad de paquetes.

---

## P2-03 — Retail solo agrega una unidad y no permite edición de cantidad

### Tipo

Hallazgo confirmado.

### Riesgo

Venta de múltiples salsas/guisos exige clics repetidos.

### Reparación recomendada

En carrito:

- botón `+`;
- botón `-`;
- input cantidad;
- bloqueo si stock insuficiente para retail.

---

## P2-04 — Buscador no implementa flujo real de lector de código de barras

### Tipo

Hallazgo confirmado.

### Riesgo

El lector de código de barras solo llenaría búsqueda; no agrega producto automáticamente.

### Reparación requerida

Si el valor escaneado coincide exactamente con `barcode`, agregar producto automáticamente y limpiar input.

---

## 5. Matriz de pruebas destructivas

## 5.1 Navegación y acceso

| ID | Caso | Datos | Resultado esperado | Severidad |
|---|---|---|---|---|
| POS-R01 | Entrar directo a venta sin caja | `/app/pos/sale` | Redirige a abrir caja | P0 |
| POS-R02 | Entrar a abrir caja con caja abierta | `/app/pos/cash/open` | Redirige a venta | P1 |
| POS-R03 | Usuario sin rol cajero entra a POS | usuario sin permiso | Bloqueado | P0 |
| POS-R04 | Sin branch activa | limpiar branch store | Redirige a seleccionar sucursal | P0 |
| POS-R05 | Token expirado al cobrar | 401 en checkout | No pierde carrito | P1 |
| POS-R06 | Refresh con carrito activo | F5 navegador | Decide: recuperar o limpiar con aviso | P2 |

---

## 5.2 Apertura de caja

| ID | Campo | Dato | Resultado esperado | Severidad |
|---|---|---|---|---|
| CASH-01 | efectivo inicial | vacío | Bloquear | P0 |
| CASH-02 | efectivo inicial | `0` | Permitir si negocio lo acepta | P2 |
| CASH-03 | efectivo inicial | `-1` | Bloquear | P0 |
| CASH-04 | efectivo inicial | `500,00` | Normalizar o bloquear con mensaje claro | P2 |
| CASH-05 | efectivo inicial | `1e6` | Bloquear notación científica | P0 |
| CASH-06 | efectivo inicial | `999999999` | Bloquear por máximo | P0 |
| CASH-07 | doble clic abrir | click repetido | Una sola caja | P1 |
| CASH-08 | dos cajeros abren caja | concurrencia | Segunda solicitud bloqueada | P0 |

---

## 5.3 Venta por kg

| ID | Producto | Dato | Resultado esperado | Severidad |
|---|---|---|---|---|
| KG-01 | tortilla | `1` | Agrega 1kg | P2 |
| KG-02 | tortilla | `1.5` | Agrega 1.5kg | P2 |
| KG-03 | tortilla | `0.001` | Validar mínimo definido | P1 |
| KG-04 | tortilla | `1e3` | Bloquear | P0 |
| KG-05 | tortilla | `999999` | Bloquear | P0 |
| KG-06 | tortilla | `abc` | Bloquear | P1 |
| KG-07 | tortilla | precio faltante | Bloquear | P1 |
| KG-08 | tortilla | stock 0 | Permitir negativo con auditoría | P1 |
| KG-09 | masa | stock 0 | Permitir negativo con auditoría | P1 |
| KG-10 | retail | stock 0 | Bloquear negativo | P0 |

---

## 5.4 Venta por monto

| ID | Producto | Dato | Resultado esperado | Severidad |
|---|---|---|---|---|
| AMT-01 | tortilla | `20` | Calcula kg y total | P2 |
| AMT-02 | tortilla | `0.01` | Validar mínimo | P1 |
| AMT-03 | tortilla | `1e3` | Bloquear | P0 |
| AMT-04 | tortilla | `999999` | Bloquear | P0 |
| AMT-05 | tortilla | precio cambia antes de cobrar | Quote backend manda | P0 |
| AMT-06 | masa | cliente con precio especial | Recalcula | P1 |
| AMT-07 | masa | quitar cliente | Recalcula precio sucursal | P1 |

---

## 5.5 Paquete 800g

| ID | Caso | Resultado esperado | Severidad |
|---|---|---|---|
| PKG-01 | agregar 1 paquete | total correcto | P2 |
| PKG-02 | F5 diez veces rápido | 10 paquetes, sin duplicación fantasma | P1 |
| PKG-03 | paquete sin precio | botón bloqueado | P1 |
| PKG-04 | dos paquetes activos | no elegir al azar | P1 |
| PKG-05 | stock tortilla 0 | permite negativo con auditoría | P1 |
| PKG-06 | paquete mal configurado sin 0.800kg | bloquear o auditar | P0 |

---

## 5.6 Retail

| ID | Caso | Resultado esperado | Severidad |
|---|---|---|---|
| RET-01 | producto sin precio | bloqueado | P1 |
| RET-02 | producto stock 0 | bloqueado | P0 |
| RET-03 | producto se desactiva antes de cobrar | backend bloquea y UI informa | P1 |
| RET-04 | barcode exacto | agrega automático | P2 |
| RET-05 | cantidad mayor a stock | bloquea antes de completar | P1 |
| RET-06 | producto con tipo inválido | POS no lo vende | P1 |

---

## 5.7 Cliente y precios especiales

| ID | Caso | Resultado esperado | Severidad |
|---|---|---|---|
| CUS-01 | seleccionar cliente activo | aplica cliente | P2 |
| CUS-02 | cliente inactivo por URL | limpia cliente | P1 |
| CUS-03 | cliente con precio especial | quote cambia precio | P1 |
| CUS-04 | cambiar cliente rápido | quote final consistente | P0 |
| CUS-05 | quitar cliente | vuelve a precio sucursal | P1 |
| CUS-06 | cliente eliminado antes de cobrar | bloquea venta | P1 |
| CUS-07 | endpoint clientes falla | comportamiento definido | P1 |

---

## 5.8 Crédito / fiado

| ID | Caso | Resultado esperado | Severidad |
|---|---|---|---|
| CRD-01 | cliente sin crédito | botón fiado bloqueado | P1 |
| CRD-02 | crédito dentro de límite | permite | P1 |
| CRD-03 | crédito excede límite sin PIN | bloquea | P0 |
| CRD-04 | crédito excede límite con PIN inválido | backend rechaza | P0 |
| CRD-05 | crédito mixto + efectivo | total cuadra | P1 |
| CRD-06 | crédito mixto con monto negativo | bloquea | P0 |
| CRD-07 | cliente se inactiva antes de completar | bloquea | P1 |

---

## 5.9 Cobro

| ID | Método | Caso | Resultado esperado | Severidad |
|---|---|---|---|---|
| PAY-01 | efectivo | exacto | completa | P2 |
| PAY-02 | efectivo | menor al total | bloquea | P1 |
| PAY-03 | efectivo | mayor al total | calcula cambio | P2 |
| PAY-04 | tarjeta | sin referencia | bloquea | P0 |
| PAY-05 | transferencia | sin referencia | bloquea | P0 |
| PAY-06 | mixto | suma menor | bloquea | P0 |
| PAY-07 | mixto | suma mayor | bloquea | P0 |
| PAY-08 | mixto | monto negativo | bloquea | P0 |
| PAY-09 | mixto | decimales con error | normaliza | P1 |
| PAY-10 | cualquiera | doble clic completar | una venta por idempotencia | P0 |
| PAY-11 | cualquiera | error backend | mantiene carrito | P0 |

---

## 6. Backlog de reparación

## Sprint A — Cierre de rutas y permisos

### TP-POS-STAB-001 — Crear `CashSessionGuard`

**Prioridad:** P0  
**Tipo:** frontend  
**Objetivo:** bloquear venta sin caja abierta.

#### Tareas

- Crear `apps/web/src/shared/guards/cash-session-guard.tsx`.
- Consultar `currentCashSessionRequest(branchId)`.
- Sin branch: dejar actuar a `BranchGuard`.
- Sin caja abierta: redirect `/app/pos/cash/open`.
- Caja abierta: guardar cash session en store y renderizar children.
- Error: mostrar estado recuperable con botón reintentar.

#### Criterios de aceptación

- `/app/pos/sale` no renderiza venta sin caja.
- `/app/pos` sigue funcionando como router operativo.
- Header POS muestra estado correcto.

---

### TP-POS-STAB-002 — Agregar guard de rol POS

**Prioridad:** P0  
**Tipo:** frontend/security  
**Bloqueado por:** decisión de roles exactos.

#### Tareas

- Confirmar roles permitidos.
- Envolver `/app/pos` con `RoleGuard`.
- Agregar mensaje de bloqueo claro.

#### Criterios de aceptación

- Usuario sin rol permitido no entra al POS.
- Usuario permitido entra normalmente.

---

## Sprint B — Validación fuerte de datos

### TP-POS-STAB-003 — Parser decimal operativo

**Prioridad:** P0  
**Tipo:** frontend/shared

#### Tareas

- Crear `apps/web/src/shared/utils/decimal-input.ts`.
- Implementar `parseMoneyInput`.
- Implementar `parseKgInput`.
- Bloquear notación científica.
- Bloquear negativos.
- Bloquear vacío salvo configuración explícita.
- Agregar mensajes por campo.

#### Criterios de aceptación

- Inputs POS no aceptan `1e3`.
- Money máximo 2 decimales.
- Kg máximo 3 decimales.
- Montos absurdos bloqueados.

---

### TP-POS-STAB-004 — Endurecer apertura de caja

**Prioridad:** P1  
**Tipo:** frontend

#### Tareas

- Quitar default `500.00`.
- Campo obligatorio.
- Validación con parser money.
- Bloquear doble submit.
- Si ya hay caja abierta, redirigir a venta.

---

## Sprint C — Checkout consistente

### TP-POS-STAB-005 — Quote snapshot antes de cobro

**Prioridad:** P0  
**Tipo:** frontend

#### Tareas

- `handleCheckout` debe esperar quote backend.
- Abrir modal solo con total confirmado.
- Bloquear cambios mientras se cotiza.
- Si quote falla, no abrir modal.

---

### TP-POS-STAB-006 — Manejar draft parcial

**Prioridad:** P0  
**Tipo:** frontend/backend

#### Opción recomendada

Crear `POST /sales/checkout` atómico.

#### Opción mínima

Rollback automático con `cancelDraftSaleRequest` si falla `addSaleItem` o `completeSale` antes de finalizar.

---

## Sprint D — Productos y catálogo POS

### TP-POS-STAB-007 — Bloquear productos mal configurados

**Prioridad:** P1  
**Tipo:** frontend

#### Tareas

- Eliminar normalización silenciosa.
- Producto inválido no debe mostrarse como vendible.
- Mostrar error en modo manager/configuración.

---

### TP-POS-STAB-008 — Resolver selección de producto operativo principal

**Prioridad:** P1  
**Tipo:** producto/backend/frontend  
**Bloqueado por:** decisión funcional.

#### Pregunta bloqueante

¿Cómo se decide cuál producto es la tortilla/masa/paquete principal del POS?

---

## Sprint E — Operación cajero

### TP-POS-STAB-009 — Barcode exact match

**Prioridad:** P2  
**Tipo:** frontend

#### Tareas

- Detectar coincidencia exacta por barcode.
- Agregar automáticamente.
- Limpiar input.
- Evitar doble agregado por enter/scanner.

---

### TP-POS-STAB-010 — Cantidad editable en carrito

**Prioridad:** P2  
**Tipo:** frontend

#### Tareas

- Agregar controles `+`, `-`.
- Permitir edición controlada de cantidad.
- Recalcular quote tras cambios.

---

## 7. Preguntas bloqueantes consolidadas

Estas preguntas no deben resolverse por interpretación.

1. ¿Qué roles exactos pueden operar POS?
2. ¿Qué debe pasar si falla el endpoint de clientes?
3. ¿Qué usuario autoriza crédito excedido: cajero, supervisor o gerente?
4. ¿La autorización de crédito excedido requiere motivo?
5. ¿Cuál es el monto máximo permitido para una venta de mostrador?
6. ¿Cuál es el máximo de kg permitido por item?
7. ¿Cuál es el mínimo permitido por kg y por monto?
8. ¿Se permite vender `$1` de tortilla/masa?
9. ¿Se permite abrir caja con `$0.00`?
10. ¿Cómo se identifica el producto principal de tortilla, masa y paquete 800g?
11. ¿El POS debe recuperar carrito después de refresh o limpiar con aviso?
12. ¿Si falla checkout parcial, se debe cancelar automáticamente el draft o dejarlo recuperable?
13. ¿El cajero puede cambiar de sucursal con carrito activo?
14. ¿Se bloqueará venta retail si no hay stock suficiente desde frontend o solo backend?
15. ¿El lector de código de barras debe agregar automáticamente al encontrar coincidencia exacta?

---

## 8. Criterios globales de estabilización

El POS Cajero se considera estable solo si cumple:

- No se puede vender sin caja abierta.
- No se puede entrar al POS sin rol permitido.
- No se puede crear una venta con datos numéricos inválidos.
- No se puede completar una venta con total viejo.
- No se puede dejar draft parcial sin recuperación o cancelación explícita.
- No se puede vender producto mal configurado.
- No se puede vender retail con stock negativo.
- Tortilla y masa pueden quedar negativas solo con auditoría.
- Cliente/precio especial se recalcula antes de cobrar.
- Crédito excedido requiere autorización válida.
- Tarjeta y transferencia requieren referencia.
- Doble submit no duplica venta.
- Error backend no borra carrito.
- La operación principal puede hacerse con teclado.

---

## 9. Orden recomendado para Codex

Ejecutar en este orden:

1. `TP-POS-STAB-001` — CashSessionGuard.
2. `TP-POS-STAB-002` — RoleGuard POS, después de confirmar roles.
3. `TP-POS-STAB-003` — Parser decimal.
4. `TP-POS-STAB-004` — Apertura de caja segura.
5. `TP-POS-STAB-005` — Quote snapshot.
6. `TP-POS-STAB-006` — Checkout atómico o rollback.
7. `TP-POS-STAB-007` — Producto inválido bloqueado.
8. `TP-POS-STAB-008` — Producto principal POS, después de decisión funcional.
9. `TP-POS-STAB-009` — Barcode exact match.
10. `TP-POS-STAB-010` — Cantidad editable.

---

## 10. Prompt sugerido para Codex

```txt
Lee docs/audits/pos-cajero-auditoria-destructiva-v0.1.md.

Objetivo: estabilizar el POS Cajero de Tortilla Plus sin agregar funcionalidades fuera del alcance.

Reglas:
- No asumir decisiones marcadas como Pregunta bloqueante.
- Implementa solo tickets no bloqueados.
- Prioriza P0 y P1.
- No rompas rutas existentes.
- Agrega pruebas unitarias/integración donde aplique.
- Si un flujo requiere decisión funcional, deja TODO documentado y no inventes comportamiento.

Primera tarea:
Implementa TP-POS-STAB-001 CashSessionGuard y actualiza el router para impedir que /app/pos/sale renderice sin caja abierta.

Después ejecuta lint/tests disponibles y reporta archivos modificados.
```

---

## 11. Estado final del documento

Este archivo es el eje de trabajo para estabilización del POS Cajero. Las decisiones abiertas deben resolverse antes de implementar los tickets bloqueados.
