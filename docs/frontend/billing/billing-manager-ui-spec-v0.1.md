# Tortilla Plus — Billing Manager UI Spec V0.1

## 1. Propósito

Este documento define la experiencia frontend del módulo **Manager Billing UI** de **Tortilla Plus — V1 Operativa Comercial**.

Cubre:

```txt
dashboard fiscal
facturas
global diaria
global rezagados
manual review
cancelaciones CFDI
configuración fiscal
estados visuales
permisos
QA mínimo
```

Ubicación recomendada:

```txt
docs/frontend/billing/billing-manager-ui-spec-v0.1.md
```

---

## 2. Principio central

El Manager Billing UI no es POS.

Debe priorizar:

```txt
control
claridad
auditoría
confirmaciones críticas
resolución de incidencias
trazabilidad fiscal
```

El POS debe ser rápido.  
El Manager debe ser seguro.

---

## 3. Aplicación relacionada en monorepo

Aplicación recomendada:

```txt
apps/manager-pwa/
```

Paquetes relacionados:

```txt
packages/ui/
packages/shared/
packages/api-contracts/
```

---

## 4. Roles V1 permitidos

Roles oficiales V1:

```txt
Cajero
Supervisor
Gerente
```

Para este módulo:

```txt
Gerente = acceso completo fiscal
Supervisor = acceso limitado a incidencias operativas/conciliación
Cajero = sin acceso a Manager Billing UI
```

No agregar roles extra en V1.

---

## 5. Navegación oficial

Decisión congelada:

```txt
sidebar modular
+
dashboard fiscal resumido
```

Módulos del sidebar:

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

## 6. Regla de separación con backend

El frontend no decide reglas fiscales críticas.

El backend debe responder:

```txt
estados fiscales
permisos efectivos
acciones disponibles
bloqueos
warnings
totales
motivos de exclusión
estado de provider
```

El frontend solo muestra y guía.

---

## 7. Dashboard Fiscal

### 7.1 Propósito

Mostrar el estado fiscal operativo de la sucursal/empresa sin saturar al gerente.

No debe ser un dashboard de gráficas decorativas.

Debe responder:

```txt
qué falta por revisar
qué está pendiente
qué requiere acción
qué ya fue resuelto
```

---

### 7.2 Métricas oficiales V1

Cards principales:

```txt
Global diaria pendiente
Ventas QR pendientes de autofactura
Tickets QR vencidos
Facturas generadas hoy
Facturas con error / revisión
Ventas tarjeta pendientes de referencia
Conciliación pendiente
```

---

### 7.3 Acciones desde dashboard

Cada card debe llevar a su módulo correspondiente.

Ejemplos:

```txt
Global diaria pendiente → Global Diaria
QR pendientes → Facturas / Pendientes QR
Facturas con error → Manual Review
Pendientes referencia → Conciliación
Conciliación pendiente → Conciliación
```

---

### 7.4 Filtros del dashboard

Filtros mínimos:

```txt
sucursal
fecha
rango
estado
```

Default recomendado:

```txt
hoy
sucursal activa del usuario
```

---

### 7.5 Estados vacíos

Si no hay pendientes:

```txt
No hay pendientes fiscales por revisar.
```

Si no hay ventas:

```txt
No hay ventas registradas para este periodo.
```

---

## 8. Módulo Facturas

### 8.1 Propósito

Consultar CFDIs emitidos y su relación con tickets/ventas.

Debe servir para:

```txt
soporte al cliente
consulta fiscal
descarga de XML/PDF
cancelación guiada
búsqueda histórica
```

---

### 8.2 Vista oficial

Decisión congelada:

```txt
tabla limpia
+
filtros avanzados expandibles
```

---

### 8.3 Columnas default

```txt
fecha
cliente
monto
estado fiscal
UUID parcial
acciones
```

No mostrar 15 columnas por default.

---

### 8.4 Filtros avanzados

Panel expandible:

```txt
fecha
UUID
RFC
folio POS
método pago
estado fiscal
cajero
sucursal
monto
tipo factura
```

Tipos de factura:

```txt
individual
global_diaria
global_rezagados
```

---

### 8.5 Acciones por factura

Acciones mínimas:

```txt
ver detalle
descargar PDF
descargar XML
cancelar CFDI
```

La acción “cancelar CFDI” solo aparece si backend indica que está permitida.

---

### 8.6 Detalle de factura

Debe mostrar:

```txt
UUID
tipo
estado
fecha timbrado
emisor
receptor
RFC receptor
uso CFDI
régimen fiscal
subtotal
IVA
total
folio POS relacionado
sucursal
cajero
XML disponible
PDF disponible
```

No mostrar logs técnicos del provider.

---

## 9. Global Diaria

### 9.1 Decisión oficial

```txt
preparación automática
+
confirmación gerente obligatoria
```

El sistema prepara el borrador.

El gerente revisa y confirma.

---

### 9.2 Pantalla principal

Debe mostrar:

```txt
fecha operativa
estado del lote
total ventas incluidas
subtotal
IVA
total
ventas excluidas
QR pendientes
warnings
```

Estados de lote:

```txt
not_prepared
prepared
confirmed
stamping
stamped
failed
requires_review
```

---

### 9.3 Pantalla “Confirmar Global Diaria”

Resumen:

```txt
fecha
cantidad ventas
subtotal
IVA
total
tickets QR pendientes
tickets QR vencidos
ventas excluidas
warnings
```

Tabla resumida:

```txt
folio
fecha/hora
monto
método pago
motivo exclusión
estado fiscal
```

Acciones:

```txt
Cancelar
Confirmar timbrado
```

---

### 9.4 Confirmación fuerte

Antes de confirmar timbrado:

```txt
Estás por timbrar la factura global diaria.
Revisa que los totales sean correctos.
Esta acción quedará auditada.
```

Botón principal:

```txt
Confirmar timbrado
```

---

### 9.5 Después de confirmar

Estados:

```txt
stamping
stamped
failed
```

Si `stamping`:

```txt
Timbrando global diaria...
```

Si `stamped`:

```txt
Global diaria timbrada correctamente.
```

Si `failed`:

```txt
No se pudo timbrar la global diaria.
Revisa el detalle o intenta más tarde.
```

---

## 10. Global Rezagados

### 10.1 Propósito

Timbrar tickets QR vencidos que no fueron facturados por el cliente dentro del mes natural.

---

### 10.2 Flujo

```txt
sistema prepara lote de rezagados
gerente revisa
gerente confirma
backend timbra
```

---

### 10.3 Pantalla principal

Debe mostrar:

```txt
periodo
tickets vencidos incluidos
subtotal
IVA
total
estado lote
warnings
```

Estados:

```txt
not_prepared
prepared
confirmed
stamping
stamped
failed
requires_review
```

---

### 10.4 Confirmación

Texto recomendado:

```txt
Estás por timbrar la global de tickets vencidos.
Verifica el periodo y los importes antes de continuar.
```

Acciones:

```txt
Cancelar
Confirmar timbrado
```

---

## 11. Manual Review

### 11.1 Propósito

Resolver casos fiscales que no pudieron procesarse automáticamente.

Ejemplos:

```txt
provider timeout agotado
datos fiscales rechazados
inconsistencia de estado
certificado/provider con error
```

---

### 11.2 Decisión oficial

Manual Review permite:

```txt
correcciones mínimas
+
reintentar
```

Editable:

```txt
correo
uso CFDI
código postal
```

No editable:

```txt
RFC
razón social
```

Motivo:

```txt
cambiar RFC o razón social implica nueva solicitud fiscal o cancelación formal
```

---

### 11.3 Vista principal

Columnas:

```txt
fecha
folio POS
cliente/RFC
monto
error resumido
estado
intentos
acciones
```

Estados:

```txt
requires_manual_review
retry_scheduled
retrying
resolved
closed
```

---

### 11.4 Detalle Manual Review

Debe mostrar:

```txt
ticket
venta
datos fiscales capturados
error resumido
intentos realizados
último intento
acciones disponibles
```

No mostrar:

```txt
stack trace
payload completo provider
API keys
detalles internos sensibles
```

---

### 11.5 Corrección permitida

Campos editables:

```txt
correo
uso CFDI
código postal
```

Debe registrar auditoría:

```txt
usuario
fecha
campo
valor anterior
valor nuevo
motivo opcional
```

---

### 11.6 Reintento

Acción:

```txt
Reintentar facturación
```

Debe pedir confirmación simple:

```txt
Se reenviará la solicitud con los datos actuales.
```

---

## 12. Cancelaciones CFDI

### 12.1 Decisión oficial

Cancelaciones CFDI usan flujo guiado.

Flujo:

```txt
Seleccionar CFDI
→ Ver detalle
→ Elegir motivo SAT
→ Adjuntar link evidencia opcional
→ Confirmar cancelación
```

---

### 12.2 Permiso

Solo Gerente.

Supervisor no cancela CFDI.

Cajero no cancela CFDI.

---

### 12.3 Warning visual fuerte

Texto recomendado:

```txt
Cancelar un CFDI es una acción fiscal delicada.
Verifica la información antes de continuar.
```

---

### 12.4 Motivo SAT obligatorio

El formulario debe incluir selector:

```txt
motivo SAT
```

Motivos conceptuales:

```txt
01 - Comprobante emitido con errores con relación
02 - Comprobante emitido con errores sin relación
03 - No se llevó a cabo la operación
04 - Operación nominativa relacionada en factura global
```

El catálogo debe venir de backend/shared.

---

### 12.5 Motivo interno obligatorio

Campo requerido:

```txt
motivo interno
```

Placeholder recomendado:

```txt
Describe por qué se solicita la cancelación.
```

---

### 12.6 Evidencia externa opcional

Campo opcional:

```txt
link evidencia
```

Ejemplos:

```txt
Google Drive
OneDrive
Dropbox
URL interna
```

Regla V1:

```txt
Tortilla Plus no almacena archivos de evidencia
solo guarda URL opcional
```

---

### 12.7 Confirmación final

Antes de enviar:

```txt
Confirmo que revisé los datos del CFDI y solicito su cancelación.
```

Puede ser checkbox obligatorio.

---

### 12.8 Estados de cancelación

```txt
cancel_requested
cancel_processing
cancelled
cancel_failed
requires_manual_review
```

---

## 13. Configuración Fiscal

### 13.1 Propósito

Permitir activar facturación para una organización/sucursal según reglas V1.

---

### 13.2 Decisión oficial

Activación requiere validación completa antes de activar facturación.

Checklist obligatorio:

```txt
RFC válido
Razón social válida
CSD válido
Certificados vigentes
Conexión Facturapi OK
Credenciales OK
Timbrado prueba exitoso
```

Solo si todo pasa:

```txt
Facturación activa
```

---

### 13.3 Estados UI

```txt
draft
validating
ready
active
error
expired_certificates
provider_connection_error
test_stamp_failed
```

---

### 13.4 Pantalla de configuración

Campos mínimos:

```txt
RFC
razón social
régimen fiscal
código postal fiscal
correo fiscal
proveedor fiscal
estado certificado
estado provider
```

---

### 13.5 CSD / certificado

V1 puede manejar onboarding guiado.

La pantalla debe mostrar:

```txt
certificado cargado
vigencia
estado
última validación
```

No mostrar claves privadas.

No exponer archivos sensibles en frontend.

---

### 13.6 Acción validar

Botón:

```txt
Validar configuración fiscal
```

Durante validación:

```txt
validando RFC
validando certificado
probando conexión
generando timbrado de prueba
```

---

## 14. Conciliación

El detalle completo está en:

```txt
billing-reconciliation-ui-spec-v0.1.md
```

Desde Manager Billing UI solo debe enlazarse como módulo sidebar.

Dashboard puede mostrar resumen.

---

## 15. Exportaciones

El detalle completo está en:

```txt
billing-reporting-exports-v0.1.md
```

Desde Manager Billing UI debe existir módulo:

```txt
Exportaciones
```

Accesible solo para Gerente.

---

## 16. Estados visuales comunes

Badges sugeridos:

```txt
Pendiente
En proceso
Timbrada
Error
En revisión
Cancelada
Globalizada
Vencida
Pendiente referencia
```

Los colores deben ser consistentes en todo Manager.

No depender solo del color; incluir texto.

---

## 17. Confirmaciones críticas

Acciones con confirmación fuerte:

```txt
Confirmar global diaria
Confirmar global rezagados
Cancelar CFDI
Activar facturación
Cambiar configuración fiscal
```

Acciones con confirmación simple:

```txt
Reintentar manual review
Descargar XML masivo
Exportar reporte
```

---

## 18. Empty states

### 18.1 Sin facturas

```txt
No hay facturas para este periodo.
```

### 18.2 Sin global pendiente

```txt
No hay global diaria pendiente.
```

### 18.3 Sin manual review

```txt
No hay casos en revisión.
```

### 18.4 Sin configuración fiscal

```txt
La facturación aún no está configurada.
```

---

## 19. Loading states

Toda acción fiscal debe mostrar estado claro.

Ejemplos:

```txt
Cargando facturas...
Preparando global...
Timbrando...
Validando configuración fiscal...
Procesando cancelación...
```

---

## 20. Error states

Los errores deben ser operativos, no técnicos.

Ejemplo incorrecto:

```txt
Provider 500 internal error
```

Ejemplo correcto:

```txt
No se pudo conectar con el servicio de facturación.
Intenta de nuevo más tarde.
```

---

## 21. Permisos resumidos

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver dashboard fiscal | No | Limitado | Sí |
| Ver facturas | No | Limitado | Sí |
| Descargar XML/PDF | No | No | Sí |
| Confirmar global diaria | No | No | Sí |
| Confirmar global rezagados | No | No | Sí |
| Resolver manual review CFDI | No | No | Sí |
| Cancelar CFDI | No | No | Sí |
| Configurar fiscal | No | No | Sí |
| Ver conciliación | No | Sí | Sí |
| Resolver conciliación | No | Sí | Sí |

---

## 22. Rutas frontend sugeridas

```txt
/manager/billing
/manager/billing/invoices
/manager/billing/global-daily
/manager/billing/global-pending
/manager/billing/manual-review
/manager/billing/cancellations
/manager/billing/reconciliation
/manager/billing/exports
/manager/billing/settings
```

---

## 23. Componentes esperados

```txt
BillingSidebar
BillingDashboardPage
FiscalMetricCard
InvoicesTable
InvoiceFiltersPanel
InvoiceDetailDrawer
GlobalBatchSummary
GlobalBatchConfirmPanel
ManualReviewTable
ManualReviewDetailDrawer
CancellationWizard
FiscalSettingsPage
FiscalValidationChecklist
FiscalStatusBadge
```

---

## 24. Hooks / services sugeridos

```txt
useBillingDashboard()
useInvoices()
useInvoiceDetail()
useGlobalDailyBatch()
useGlobalPendingBatch()
useManualReviewCases()
useCancelInvoice()
useFiscalSettings()
useValidateFiscalSettings()
useBillingPermissions()
```

---

## 25. Dependencias con OpenAPI

Endpoints conceptuales:

```txt
GET /manager/billing/dashboard
GET /manager/billing/invoices
GET /manager/billing/invoices/{invoiceId}
GET /manager/billing/invoices/{invoiceId}/xml
GET /manager/billing/invoices/{invoiceId}/pdf
POST /manager/billing/invoices/{invoiceId}/cancel
GET /manager/billing/global/daily/preview
POST /manager/billing/global/daily/prepare
POST /manager/billing/global/daily/{batchId}/confirm
GET /manager/billing/global/pending-period/preview
POST /manager/billing/global/pending-period/prepare
POST /manager/billing/global/pending-period/{batchId}/confirm
GET /manager/billing/manual-review
POST /manager/billing/manual-review/{entityId}/retry
GET /manager/billing/config
PATCH /manager/billing/config
POST /manager/billing/config/validate
```

---

## 26. No implementar en V1

No incluir:

```txt
roles adicionales
contador como rol separado
dashboard con gráficas decorativas
edición completa de RFC/razón social desde manual review
cancelación CFDI desde POS
configuración multi-RFC operativa
open banking automático
soporte/chat fiscal
```

---

## 27. QA mínimo Manager Billing UI

```txt
[ ] Sidebar muestra módulos correctos.
[ ] Cajero no accede a Manager Billing UI.
[ ] Supervisor ve conciliación limitada.
[ ] Gerente ve módulos fiscales completos.
[ ] Dashboard muestra métricas V1.
[ ] Facturas cargan con tabla limpia.
[ ] Filtros avanzados se expanden/colapsan.
[ ] Global diaria muestra resumen antes de confirmar.
[ ] Confirmar global diaria pide confirmación fuerte.
[ ] Global rezagados muestra periodo.
[ ] Manual Review permite editar solo correo, uso CFDI y CP.
[ ] Manual Review no permite editar RFC ni razón social.
[ ] Cancelación CFDI usa wizard guiado.
[ ] Cancelación requiere motivo SAT.
[ ] Cancelación requiere motivo interno.
[ ] Evidencia URL es opcional.
[ ] Configuración fiscal muestra checklist.
[ ] Facturación no se activa si falla validación.
[ ] Errores provider se muestran en lenguaje operativo.
```

---

## 28. Definition of Done

```txt
[ ] Sidebar modular definido.
[ ] Dashboard fiscal definido.
[ ] Módulo facturas definido.
[ ] Global diaria definida.
[ ] Global rezagados definida.
[ ] Manual Review definido.
[ ] Cancelaciones definidas.
[ ] Configuración fiscal definida.
[ ] Permisos definidos.
[ ] Rutas frontend definidas.
[ ] Componentes esperados definidos.
[ ] QA mínimo definido.
```

---

## 29. Siguiente documento

Después de este documento, generar:

```txt
billing-reconciliation-ui-spec-v0.1.md
```
