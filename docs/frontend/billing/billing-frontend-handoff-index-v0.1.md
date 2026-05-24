# Tortilla Plus — Billing Frontend Handoff Index V0.1

## 1. Propósito

Este documento es el índice de entrega para la documentación frontend del módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Su función es ordenar los documentos que debe leer el equipo frontend para implementar correctamente:

```txt
POS fiscal
Portal público de autofactura
Manager Billing UI
Conciliación bancaria UI
Roles y permisos fiscales
Plantillas de tickets
Reportes/exportaciones fiscales
QA frontend
```

Este índice debe ubicarse en:

```txt
docs/frontend/billing/billing-frontend-handoff-index-v0.1.md
```

---

## 2. Contexto del paquete

El paquete frontend billing depende del paquete backend fiscal ya documentado en:

```txt
docs/backend/billing/
```

El frontend NO debe inventar reglas fiscales.

El backend decide:

```txt
estado fiscal de venta
elegibilidad para global
estado de autofactura
estado de factura
estado de conciliación
permisos efectivos
```

El frontend muestra, guía, bloquea visualmente y consume los endpoints.

---

## 3. Estructura esperada de carpeta

```txt
docs/frontend/billing/
├─ billing-frontend-handoff-index-v0.1.md
├─ billing-pos-fiscal-flow-v0.1.md
├─ billing-public-autofactura-portal-v0.1.md
├─ billing-manager-ui-spec-v0.1.md
├─ billing-reconciliation-ui-spec-v0.1.md
├─ billing-roles-permissions-v0.1.md
├─ billing-ticket-templates-v0.1.md
├─ billing-reporting-exports-v0.1.md
└─ billing-frontend-qa-checklist-v0.1.md
```

---

## 4. Orden obligatorio de lectura

### 1. billing-frontend-handoff-index-v0.1.md

Punto de entrada.

Define:

```txt
orden de lectura
alcance frontend
reglas de separación frontend/backend
documento dueño por tema
```

---

### 2. billing-pos-fiscal-flow-v0.1.md

Define la operación fiscal dentro del POS.

Debe leerse antes de diseñar o implementar:

```txt
modal de cobro
impresión de tickets
ticket simple
ticket QR
búsqueda rápida de tickets
pending_reference
flujo tarjeta
flujo efectivo
flujo mixto
```

---

### 3. billing-public-autofactura-portal-v0.1.md

Define la PWA pública para el cliente final.

Cubre:

```txt
vista combinada ticket + formulario
captura de datos fiscales
validación moderada
recordar datos en dispositivo
procesamiento con polling
descarga PDF/XML
QR vencido
manual review
```

---

### 4. billing-manager-ui-spec-v0.1.md

Define el panel fiscal del gerente.

Cubre:

```txt
dashboard fiscal
facturas
global diaria
global rezagados
manual review
cancelaciones CFDI
configuración fiscal
```

---

### 5. billing-reconciliation-ui-spec-v0.1.md

Define la interfaz de conciliación bancaria.

Cubre:

```txt
carga CSV/XLSX
BBVA
MercadoPago
Clip
matching por score
revisión manual
bandeja de incidencias
sucursal-first
vista corporativa
```

---

### 6. billing-roles-permissions-v0.1.md

Define permisos fiscales visibles en frontend.

Roles únicos V1:

```txt
Cajero
Supervisor
Gerente
```

No agregar roles extra en V1.

---

### 7. billing-ticket-templates-v0.1.md

Define plantillas imprimibles.

Cubre:

```txt
ticket simple
ticket QR autofactura
ticket facturado
ticket vencido
ticket en revisión
```

---

### 8. billing-reporting-exports-v0.1.md

Define exportaciones fiscales.

Cubre:

```txt
facturas
XML
PDF bajo demanda
globales
conciliación
ventas fiscales
```

---

### 9. billing-frontend-qa-checklist-v0.1.md

Define checklist QA de frontend.

Cubre:

```txt
flujos principales
errores
estados vacíos
loading states
permisos
responsive
mobile-first portal
fallos provider
QR vencido
manual review
```

---

## 5. Documento dueño por tema

| Tema | Documento dueño |
|---|---|
| POS fiscal | billing-pos-fiscal-flow |
| Portal autofactura | billing-public-autofactura-portal |
| Manager fiscal | billing-manager-ui-spec |
| Conciliación UI | billing-reconciliation-ui-spec |
| Roles y permisos | billing-roles-permissions |
| Tickets impresos | billing-ticket-templates |
| Exportaciones | billing-reporting-exports |
| QA frontend | billing-frontend-qa-checklist |

---

## 6. Principios frontend obligatorios

### 6.1 POS primero en velocidad

El POS debe priorizar:

```txt
rapidez
teclado
mínimos clics
mínimos modales
flujo continuo
```

La facturación no debe estorbar el flujo de venta.

---

### 6.2 Manager primero en control

El Manager debe priorizar:

```txt
claridad
auditoría
estado fiscal
confirmaciones críticas
resolución de incidencias
```

No debe parecer una pantalla de caja.

---

### 6.3 Portal público primero en claridad

El portal público debe priorizar:

```txt
mobile-first
lenguaje simple
mínimo esfuerzo
estado claro de factura
descarga simple
```

---

### 6.4 No duplicar lógica fiscal

El frontend NO calcula reglas fiscales críticas.

Ejemplos de lo que NO debe decidir:

```txt
si una venta entra a global
si un ticket está vencido
si una factura puede cancelarse
si un usuario puede confirmar global
si un match bancario es definitivo
```

El frontend consume estados y permisos del backend.

---

## 7. Decisiones frontend ya congeladas

### 7.1 POS fiscal

```txt
La decisión fiscal se muestra dentro del modal de cobro según método de pago.
```

Reglas:

```txt
Efectivo:
  pregunta si requiere ticket para facturar

Tarjeta:
  QR automático

Mixto con tarjeta:
  QR automático

Mixto sin tarjeta:
  pregunta si requiere factura
```

Ticket:

```txt
ticket simple = impresión opcional
ticket QR = impresión automática
```

Tarjeta:

```txt
referencia/autorización obligatoria como regla
pero puede continuar sin referencia como pending_reference
```

Operación POS:

```txt
impresión silenciosa inmediata
búsqueda rápida y limitada
manager tiene búsqueda histórica
```

---

### 7.2 Portal autofactura

```txt
vista combinada ticket + formulario
mobile-first
localStorage opcional
validación fiscal moderada
procesamiento híbrido con polling
PDF principal + XML secundario
QR vencido muestra contacto del negocio
```

---

### 7.3 Manager Billing UI

```txt
sidebar modular
dashboard fiscal resumido
módulos separados
```

Módulos:

```txt
Dashboard Fiscal
Facturas
Global Diaria
Global Rezagados
Manual Review
Cancelaciones
Conciliación
Exportaciones
Configuración Fiscal
```

---

### 7.4 Conciliación UI

```txt
V1 = carga CSV/XLSX
arquitectura preparada para APIs futuras
matching por score
revisión manual banco → sugerencias POS
bandeja de incidencias
sucursal-first + vista corporativa
```

---

### 7.5 Roles V1

```txt
Cajero
Supervisor
Gerente
```

No agregar:

```txt
contador
director
admin fiscal externo
soporte SaaS como rol operativo del negocio
```

---

## 8. Aplicaciones del monorepo relacionadas

Estructura recomendada:

```txt
apps/
├─ pos-pwa/
├─ manager-pwa/
└─ public-billing-pwa/
```

Relación con documentos:

```txt
pos-pwa:
  billing-pos-fiscal-flow-v0.1.md
  billing-ticket-templates-v0.1.md
  billing-roles-permissions-v0.1.md

manager-pwa:
  billing-manager-ui-spec-v0.1.md
  billing-reconciliation-ui-spec-v0.1.md
  billing-roles-permissions-v0.1.md
  billing-reporting-exports-v0.1.md

public-billing-pwa:
  billing-public-autofactura-portal-v0.1.md
```

---

## 9. Paquetes compartidos esperados

```txt
packages/
├─ shared/
├─ ui/
└─ api-contracts/
```

Uso recomendado:

```txt
packages/shared:
  enums fiscales
  tipos compartidos
  helpers de formato
  validaciones ligeras

packages/ui:
  componentes visuales
  tablas
  cards
  badges
  modales
  inputs

packages/api-contracts:
  cliente generado desde OpenAPI
  DTOs
  schemas
```

---

## 10. Estados visuales comunes

Los estados fiscales deben mostrarse con badges consistentes.

Estados base:

```txt
simple
qr_active
pending_customer_invoice
processing
stamped
expired
requires_manual_review
included_in_global
pending_reference
cancelled
```

El diseño debe evitar colores ambiguos.

---

## 11. Reglas de UX críticas

### 11.1 Acciones peligrosas

Deben usar confirmación fuerte:

```txt
cancelar CFDI
confirmar global diaria
confirmar global rezagados
cambiar configuración fiscal
resolver manual review con cambios
```

### 11.2 Acciones rápidas

No deben bloquear operación innecesariamente:

```txt
cobrar venta
imprimir ticket
generar QR
buscar ticket reciente
```

### 11.3 Estados de carga

Toda operación fiscal debe mostrar estado:

```txt
loading
processing
retrying
completed
failed
requires_manual_review
```

---

## 12. Dependencias con backend

Frontend billing necesita contratos claros para:

```txt
sales
billing receipts
public invoices
manager invoices
global batches
manual review
reconciliation
roles/permissions
exports
```

Si un endpoint aún no existe, el frontend debe usar mock tipado basado en OpenAPI.

---

## 13. Definition of Ready para frontend

Antes de implementar pantallas:

```txt
[ ] Documentos frontend subidos a docs/frontend/billing
[ ] Backend billing docs disponibles
[ ] Roles V1 confirmados
[ ] Estados fiscales confirmados
[ ] OpenAPI base disponible o mockeada
[ ] Design tokens base definidos
[ ] Componentes UI base definidos
```

---

## 14. Definition of Done del paquete frontend billing

```txt
[ ] POS fiscal documentado
[ ] Portal autofactura documentado
[ ] Manager Billing UI documentado
[ ] Conciliación UI documentada
[ ] Roles y permisos documentados
[ ] Tickets imprimibles documentados
[ ] Reportes/exportaciones documentados
[ ] QA frontend documentado
[ ] Rutas del monorepo identificadas
[ ] Dependencias backend/frontend identificadas
```

---

## 15. Siguiente documento

Después de este índice, generar:

```txt
billing-pos-fiscal-flow-v0.1.md
```
