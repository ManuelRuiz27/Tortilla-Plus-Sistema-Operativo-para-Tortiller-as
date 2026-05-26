# Tortilla Plus — Plan Rector de Implementación Facturación Real V1 con Facturapi

**Producto:** Tortilla Plus — V1 Operativa Comercial  
**Módulo:** Facturación Real V1  
**Proveedor PAC inicial:** Facturapi  
**Tipo:** Documento rector docs-first para equipo de desarrollo  
**Ruta sugerida:** `docs/billing/facturapi-implementation-plan-v1.md`  
**Fecha base:** 2026-05-24  
**Estado:** Listo para planificación y ejecución controlada  

---

## 1. Resumen ejecutivo

Este documento define cómo debe construirse el módulo de **Facturación Real V1 con Facturapi** usando la documentación existente como fuente de verdad.

El objetivo no es “agregar Facturapi” de forma aislada. El objetivo es convertir el módulo fiscal actual de Tortilla Plus, que ya tiene base operativa, PAC mock, autofactura mínima y Manager Billing, en un módulo fiscal real, trazable y extensible.

La implementación debe seguir un enfoque **docs-first**:

```txt
documentación existente -> matriz de reglas -> implementación -> pruebas -> actualización documental
```

Ningún endpoint, DTO, estado, permiso, flujo fiscal, evento interno o pantalla debe ser inventado por el agente o el equipo sin validarlo contra los documentos existentes.

---

## 2. Objetivo del módulo

Implementar **Facturación Real V1 con Facturapi** para cubrir:

```txt
factura individual real
factura global diaria real
autofactura pública
timbrado CFDI
cancelación CFDI
descarga XML
PDF bajo demanda
reimpresión/reenvío QR
configuración fiscal
eventos/auditoría
QA fiscal
```

La meta inicial es **sandbox funcional y validado**, no producción fiscal inmediata.

---

## 3. Principio rector

La documentación manda.

El código debe adaptarse a la documentación aprobada. Si la documentación y el código actual difieren, el equipo debe:

```txt
1. Identificar la diferencia.
2. Clasificar si es desviación, deuda técnica o cambio necesario.
3. Crear ADR si cambia una decisión funcional.
4. Actualizar el documento afectado.
5. Implementar.
6. Cubrir con prueba.
```

No se acepta implementación “porque funciona” si contradice los contratos aprobados.

---

## 4. Fuentes de verdad obligatorias

## 4.1 Documentos de contrato y backend

```txt
docs/backend/billing/billing-openapi-addendum-v0.1.md
docs/product/contracts/billing-openapi-v0.1.yaml
docs/product/contracts/billing-dto-catalog-v0.1.md
docs/product/contracts/billing-events-contract-v0.1.md
docs/backend/billing/billing-backend-implementation-guide-v0.1.md
docs/backend/billing/billing-jobs-queues-scheduler-v0.1.md
docs/backend/billing/billing-qa-test-plan-v0.1.md
```

## 4.2 Documentos frontend y producto

```txt
docs/frontend/billing/billing-manager-ui-spec-v0.1.md
docs/audits/tortilla-plus-operational-stability-audit-v0.2.md
docs/audits/tortilla-plus-fixed-roadmap-v0.1.md
docs/security/permission-matrix-v0.1.md
```

## 4.3 Documentos opcionales si existen

```txt
docs/backend/billing/billing-domain-technical-spec-v0.1.md
docs/backend/billing/billing-erd-addendum-v0.1.md
```

Si existen, tienen prioridad sobre decisiones inferidas.

---

## 5. Matriz de autoridad documental

| Tema | Fuente primaria | Fuente secundaria |
|---|---|---|
| Endpoints | billing-openapi-v0.1.yaml | billing-openapi-addendum |
| DTOs | billing-dto-catalog | OpenAPI |
| Eventos | billing-events-contract | backend guide |
| Backend | backend guide | QA plan |
| Jobs | jobs/queues/scheduler | events contract |
| UI Manager | billing-manager-ui-spec | OpenAPI |
| QA | billing-qa-test-plan | fixed roadmap |
| Permisos | permission matrix | UI spec |
| Roadmap | fixed roadmap | audit v0.2 |

Regla: si hay conflicto entre fuentes, el Tech Lead debe resolverlo mediante ADR antes de codificar.

---

## 6. Decisiones nuevas agregadas a la documentación

Estas son las únicas decisiones nuevas que este plan agrega sobre la documentación existente:

## 6.1 Proveedor PAC inicial

```txt
Proveedor inicial: Facturapi
Modo inicial: sandbox
Mock PAC: se conserva para pruebas
```

## 6.2 Regla de autofactura por forma de pago

```txt
Tarjeta:
  receipt/token automático.

Efectivo:
  receipt/token sólo si el cliente lo solicita.

Mixto:
  automático si incluye tarjeta.
  bajo solicitud si no incluye tarjeta.

Transferencia:
  igual que efectivo bajo solicitud.
  receipt/token solo si requestInvoice=true.

Crédito/fiado:
  igual que efectivo bajo solicitud.
  pending_customer_invoice solo si requestInvoice=true.
```

## 6.3 Factura global diaria

```txt
branchId obligatorio
timezone de sucursal obligatorio
no UTC genérico
```

## 6.4 Alcance resuelto de Facturación Real V1

```txt
Conciliación bancaria:
  fuera de Facturación Real V1.
  puede quedar como módulo relacionado/futuro, pero no es criterio de cierre de este módulo.

organization_owner:
  se mantiene como superrol técnico.
  no reemplaza los roles operativos Cajero/Supervisor/Gerente.

docs/modulo-factutacion.md:
  referencia inválida.
  no crear ni usar como fuente de verdad.
```

## 6.5 Normalización de estados públicos

```txt
InvoiceStatus público:
  usa billing-dto-catalog-v0.1.md como contrato.
  processing y failed son estados públicos.

Estados internos:
  stamping y stamp_failed solo pueden existir internamente o en jobs si se requieren.
  deben mapearse a processing/failed antes de responder APIs públicas o Manager UI.

Regla documental:
  no introducir nuevos estados públicos sin actualizar DTO catalog y OpenAPI.
```

Estas decisiones quedan formalizadas en:

```txt
docs/adr/ADR-billing-facturapi-v1.md
docs/adr/ADR-billing-status-normalization-v1.md
```

---

## 7. Estado actual del sistema

El repositorio ya tiene una base fiscal avanzada:

```txt
billing-service.ts
public-autofactura-service.ts
BillingPage
billing receipts
invoice documents
PAC mock
factura individual interna
factura global interna
cancelación mock
autofactura pública mínima
reportes/exportaciones base
permisos base
audit logs
```

El objetivo no es reconstruir billing. El objetivo es evolucionarlo de **stub fiscal controlado** a **módulo real con Facturapi**.

---

## 8. Alcance incluido

## 8.1 Backend

```txt
PacAdapter formal
MockPacAdapter conservado
FacturapiAdapter
configuración Facturapi
timbrado individual
timbrado global diaria
cancelación CFDI
descarga XML
PDF bajo demanda
webhook Facturapi si aplica
auditoría fiscal
eventos internos
errores normalizados
pruebas fiscales
```

## 8.2 Frontend

```txt
Manager Billing UI
portal público de autofactura
acciones de timbrado
acciones de cancelación
descarga XML/PDF
estado de proveedor
errores fiscales
receipt QR
POS requestInvoice mínimo
```

## 8.3 QA

```txt
unit tests
integration tests
adapter tests
permission tests
rate limit tests
E2E mínimo
evidencia audit:stability:e2e
```

---

## 9. Fuera de alcance

No implementar en este módulo:

```txt
Conciliación bancaria
Mercado Pago real
Clip real
báscula real
driver local de hardware
Open Banking automático
contabilidad electrónica
notas de crédito SAT
multi-RFC productivo avanzado
rediseño completo del POS
refactor masivo de server.ts
migración a NestJS
```

---

## 10. Matriz fuente documental -> implementación

## 10.1 API pública de autofactura

**Fuente:** `billing-openapi-addendum-v0.1.md` y `billing-openapi-v0.1.yaml`

Reglas extraídas:

```txt
GET /public/billing/receipts/{token}
POST /public/billing/receipts/{token}/invoice
GET /public/billing/receipts/{token}/invoice-status
GET /public/billing/invoices/{invoiceId}/xml
GET /public/billing/invoices/{invoiceId}/pdf
```

Requisitos:

```txt
receipt_token válido
rate limit
token no expirado
receipt active
receipt no usado
errores estándar
```

Cambios esperados:

```txt
Integrar timbrado real con Facturapi.
Mantener estados públicos claros.
Permitir descarga XML/PDF.
Bloquear segundo intento.
```

Criterios de aceptación:

```txt
[ ] token inválido devuelve RECEIPT_NOT_FOUND
[ ] token vencido devuelve RECEIPT_EXPIRED
[ ] token usado devuelve RECEIPT_ALREADY_USED
[ ] solicitud válida timbra o queda processing
[ ] XML/PDF descargables tras stamped
```

---

## 10.2 Manager Billing

**Fuente:** `billing-manager-ui-spec-v0.1.md`

Reglas extraídas:

```txt
El Manager Billing UI no es POS.
El frontend no decide reglas fiscales críticas.
Backend responde estados, permisos, bloqueos, warnings y acciones disponibles.
```

Módulos esperados:

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

Cambios esperados:

```txt
Conectar UI a estados reales Facturapi.
Mostrar errores PAC normalizados.
Mostrar acciones disponibles desde backend.
No mover reglas fiscales al frontend.
```

Criterios de aceptación:

```txt
[ ] gerente ve acciones fiscales permitidas
[ ] cajero no accede Manager Billing
[ ] errores Facturapi son visibles y accionables
[ ] dashboard fiscal no usa demo con mocks apagados
```

---

## 10.3 DTOs y estados

**Fuente:** `billing-dto-catalog-v0.1.md`

Reglas extraídas:

```txt
dinero como string decimal
fechas ISO 8601
moneda MXN
IDs como string
enums explícitos
sin datos sensibles innecesarios
```

Estados relevantes:

```txt
FiscalStatus
ReceiptStatus
InvoiceStatus
InvoiceType
GlobalBatchStatus
ManualReviewStatus
```

Cambios esperados:

```txt
No agregar estados fuera del catálogo sin actualizar documento.
Mapear estados Facturapi a InvoiceStatus interno.
No devolver montos fiscales como number en nuevos DTOs.
```

Criterios de aceptación:

```txt
[ ] nuevos DTOs usan money string
[ ] estados Facturapi normalizados
[ ] DTO catalog actualizado si hay cambios
```

---

## 10.4 Eventos internos

**Fuente:** `billing-events-contract-v0.1.md`

Reglas extraídas:

```txt
eventos explícitos
idempotentes
auditables
versionados
seguros
sin secretos
```

Envelope obligatorio:

```txt
eventId
eventName
eventVersion
occurredAt
producer
tenantId
branchId
correlationId
causationId
idempotencyKey
payload
```

Eventos mínimos esperados:

```txt
billing.receipt.created
billing.invoice.requested
billing.invoice.stamped
billing.invoice.failed
billing.invoice.cancel_requested
billing.invoice.cancelled
billing.global.prepared
billing.global.stamped
billing.provider.webhook_received
```

Cambios esperados:

```txt
Emitir o registrar eventos internos equivalentes.
No incluir API keys, CSD private key ni XML completo innecesario.
```

Criterios de aceptación:

```txt
[ ] eventos críticos registrados
[ ] eventos no contienen secretos
[ ] idempotencia documentada/probada
```

---

## 10.5 Backend y provider adapter

**Fuente:** `billing-backend-implementation-guide-v0.1.md`

Reglas extraídas:

```txt
POS desacoplado del PAC
adapter obligatorio
cambios fiscales transaccionales
idempotencia obligatoria
XML persistente
PDF bajo demanda
```

Estructura recomendada:

```txt
billing domain
receipts
public billing
invoices
global batches
providers
jobs
scheduler
audit
storage
repositories
```

Cambios esperados:

```txt
Crear FacturapiAdapter sin acoplarlo al POS.
Conservar MockPacAdapter.
Encapsular Facturapi detrás de interfaz.
Asegurar transacciones en cambios de invoice/sale/receipt/audit.
```

Criterios de aceptación:

```txt
[ ] POS no llama Facturapi directamente
[ ] adapter centralizado
[ ] XML se conserva
[ ] PDF se genera bajo demanda o referencia provider
[ ] operaciones críticas son idempotentes
```

---

## 10.6 QA fiscal

**Fuente:** `billing-qa-test-plan-v0.1.md`

Reglas extraídas:

```txt
unit tests
integration tests
E2E backend
provider adapter tests
idempotencia
permisos
rate limit
concurrencia
Facturapi sandbox
```

Casos mínimos:

```txt
efectivo sin factura
efectivo con factura
tarjeta siempre genera QR
timbrado individual
global diaria
cancelación
adapter Facturapi
receipt vencido
rate limit
permisos
```

Criterios de aceptación:

```txt
[ ] QA cases implementados o mapeados
[ ] audit:stability:e2e pasa
[ ] evidencia de pruebas documentada
```

---

## 11. Plan de implementación por fases

## Fase 0 — Planeación y alineación documental

Objetivo: dejar el módulo listo para ejecución sin decisiones implícitas.

Tareas:

```txt
Leer documentos fuente.
Crear matriz docs -> implementación.
Crear ADR Facturapi V1.
Crear ADR de normalización de estados.
Confirmar regla tarjeta/efectivo/mixto/transferencia/crédito.
Registrar conciliación bancaria fuera de alcance.
Actualizar roadmap si cambia clasificación.
```

Entregables:

```txt
docs/adr/ADR-billing-facturapi-v1.md
docs/billing/facturapi-implementation-plan-v1.md
roadmap actualizado
```

Criterio de cierre:

```txt
[ ] ADR creado
[ ] ADR de estados creado
[ ] decisiones nuevas documentadas
[ ] no hay reglas implícitas
```

---

## Fase 1 — Capa PAC y configuración

Objetivo: integrar Facturapi sin contaminar dominio.

Tareas backend:

```txt
crear PacAdapter
crear MockPacAdapter formal
crear FacturapiAdapter
crear pac-adapter-factory
agregar variables env
normalizar errores proveedor
proteger secretos
```

Variables:

```env
FACTURAPI_API_KEY=
FACTURAPI_MODE=sandbox
FACTURAPI_WEBHOOK_SECRET=
FACTURAPI_API_BASE_URL=https://www.facturapi.io/v2
```

Criterio de cierre:

```txt
[ ] MockPacAdapter funciona
[ ] FacturapiAdapter configurable
[ ] error claro si falta API key
[ ] no hay secretos en logs
```

---

## Fase 2 — Timbrado individual

Objetivo: timbrar CFDI individual desde una venta elegible.

Tareas:

```txt
mapear venta -> payload Facturapi
validar cliente fiscal
crear invoice request
timbrar
guardar UUID
guardar XML
preparar PDF
vincular venta
emitir/auditar evento
manejar error retryable
```

Criterio de cierre:

```txt
[ ] factura individual timbra en sandbox/mock
[ ] venta ya facturada bloquea duplicado
[ ] venta sin datos fiscales falla con INVALID_TAX_DATA
[ ] XML/PDF disponibles
```

---

## Fase 3 — Factura global diaria

Objetivo: timbrar global diaria por sucursal y día fiscal local.

Tareas:

```txt
branchId obligatorio
timezone sucursal obligatorio
rango fiscal local
selección de ventas elegibles
exclusión de facturadas/canceladas
agrupación
timbrado Facturapi
vinculación de ventas
auditoría
```

Criterio de cierre:

```txt
[ ] sin branchId falla
[ ] respeta timezone
[ ] no duplica global
[ ] excluye facturadas
[ ] XML/PDF disponibles
```

---

## Fase 4 — Autofactura pública

Objetivo: completar autofactura pública real con reglas de forma de pago.

Tareas:

```txt
requestInvoice en POS/completeSale
receipt automático para tarjeta
receipt bajo solicitud para efectivo
portal público timbra con Facturapi
status endpoint
descarga XML/PDF
rate limit
errores corregibles
```

Criterio de cierre:

```txt
[ ] tarjeta genera token
[ ] efectivo no genera token por default
[ ] efectivo genera token con requestInvoice=true
[ ] portal timbra CFDI
[ ] receipt usado no factura de nuevo
```

---

## Fase 5 — Cancelación, documentos y reintentos

Objetivo: cerrar ciclo fiscal operativo.

Tareas:

```txt
cancelación Facturapi
acuse/estado
descarga Manager XML/PDF
descarga pública XML/PDF
reintento controlado
manual review
auditoría
```

Criterio de cierre:

```txt
[ ] cancelación sandbox validada
[ ] error cancelación claro
[ ] descarga auditable
[ ] manual review usable
```

---

## Fase 6 — QA, hardening y cierre

Objetivo: validar el módulo completo.

Tareas:

```txt
unit tests
integration tests
adapter tests
Playwright mínimo
permission tests
rate limit tests
evidencia de audit:stability:e2e
actualización documental
```

Criterio de cierre:

```txt
[ ] tests fiscales pasan
[ ] audit:stability:e2e pasa
[ ] roadmap actualizado
[ ] riesgos residuales documentados
```

---

## 12. RACI

| Área | Responsable |
|---|---|
| ADR | Tech Lead |
| Adapter Facturapi | Backend |
| Billing domain | Backend |
| Manager UI | Frontend |
| Portal público | Frontend |
| QA fiscal | QA |
| Env/secretos | DevOps |
| Validación fiscal | PM + Contador |

---

## 13. Checklist de implementación

## 13.1 Backend

```txt
[ ] PacAdapter
[ ] MockPacAdapter
[ ] FacturapiAdapter
[ ] factory
[ ] env config
[ ] errores provider
[ ] invoice individual
[ ] global diaria
[ ] cancelación
[ ] XML persistente
[ ] PDF bajo demanda
[ ] requestInvoice
[ ] receipts por regla de pago
[ ] eventos/auditoría
[ ] permisos
```

## 13.2 Frontend

```txt
[ ] Billing UI sin lógica fiscal crítica
[ ] POS requestInvoice mínimo
[ ] portal receipt
[ ] portal invoice request
[ ] portal status
[ ] descarga XML
[ ] descarga PDF
[ ] errores PAC visibles
[ ] acciones por permisos
```

## 13.3 QA

```txt
[ ] efectivo sin factura
[ ] efectivo con factura
[ ] tarjeta QR automático
[ ] mixto con tarjeta
[ ] individual exitosa
[ ] individual duplicada
[ ] global diaria exitosa
[ ] global duplicada
[ ] timezone
[ ] cancelación
[ ] XML/PDF
[ ] rate limit
[ ] permisos 403
```

---

## 14. Definition of Ready

Una tarea del módulo está lista para desarrollo si tiene:

```txt
fuente documental
regla de negocio
archivo objetivo
criterio de aceptación
prueba esperada
estado de alcance
```

No iniciar tareas sin fuente documental o ADR.

---

## 15. Definition of Done

Una tarea se considera terminada si:

```txt
código implementado
tests agregados
documentación actualizada
sin secretos expuestos
sin romper audit:stability:e2e
sin contradicción con OpenAPI/DTO/UI spec
```

---

## 16. Riesgos y controles

| Riesgo | Control |
|---|---|
| Facturapi cambia API | adapter |
| errores SAT | QA sandbox |
| DTO inconsistente | catálogo DTO |
| reglas en frontend | backend authority |
| secretos expuestos | env + logs auditados |
| global diaria incorrecta | timezone tests |
| doble factura | idempotencia |
| receipt duplicado | token status |

---

## 17. Bloqueantes antes de producción

```txt
CSD real validado
régimen fiscal emisor validado
código postal emisor validado
Facturapi producción configurado
prueba timbrado real
prueba cancelación real
validación de factura global con contador
retención XML definida
```

---

## 18. Prompt operativo mínimo para Codex

```md
Implementa el módulo definido en docs/billing/facturapi-implementation-plan-v1.md.

Obligatorio:
- Usar la documentación de billing como fuente de verdad.
- No improvisar DTOs, endpoints, estados, permisos ni reglas fiscales.
- Crear ADR Facturapi V1 antes de implementar cambios de decisión.
- Conservar MockPacAdapter.
- Implementar FacturapiAdapter detrás de PacAdapter.
- Tarjeta genera receipt automático.
- Efectivo genera receipt sólo con requestInvoice=true.
- Global diaria exige branchId y timezone de sucursal.
- No mezclar terminales, Clip, Mercado Pago real ni báscula.
- Actualizar docs y pruebas.
- Ejecutar audit:stability:e2e.
```

---

## 19. Resultado esperado

Al finalizar este plan, Tortilla Plus debe tener:

```txt
Facturación real V1 con Facturapi en sandbox
autofactura pública funcional
factura individual timbrada
factura global diaria timbrada
cancelación CFDI
XML persistente
PDF bajo demanda
eventos/auditoría
QA fiscal
documentación alineada
mock PAC conservado
```

---

## 20. Criterio de cierre final

No cerrar el módulo si no se cumple:

```txt
[ ] FacturapiAdapter implementado
[ ] MockPacAdapter conservado
[ ] ADR aprobado
[ ] OpenAPI actualizado si cambió contrato
[ ] DTO catalog actualizado si cambió DTO
[ ] UI spec respetada
[ ] QA plan cubierto
[ ] tarjeta genera receipt automático
[ ] efectivo bajo solicitud
[ ] global diaria por timezone
[ ] XML/PDF disponibles
[ ] cancelación validada
[ ] permisos probados
[ ] audit:stability:e2e pasa
```

---

## 21. Avance de implementacion - 2026-05-26

Estado actualizado contra el plan por fases restantes:

```txt
[x] Fase 1.2 FacturapiAdapter sandbox REST sin SDK
[x] factory BILLING_PROVIDER=mock|facturapi
[x] error mapper Facturapi normalizado
[x] provider logs de exito y fallo sanitizados
[x] providerInvoiceId persistente
[x] XML persistente con SHA-256
[x] PDF bajo demanda para Facturapi
[x] cancelacion via adapter con motivo SAT
[x] estados publicos normalizados: processing/failed/requires_manual_review/cancel_processing/cancel_failed
[x] deuda tecnica por fase documentada
```

Deuda y evidencia viva:

```txt
docs/billing/facturapi-technical-debt-v1.md
apps/api/src/services/billing-pac-adapter.ts
apps/api/src/services/billing-service.ts
apps/api/src/services/public-autofactura-service.ts
apps/api/tests/billing-pac-adapter.test.ts
apps/api/tests/integration/billing-operational-flow.test.ts
```

Pendientes no bloqueantes para sandbox funcional:

```txt
[ ] validar payload CFDI final con contador/SAT
[ ] configurar storage productivo externo para XML
[ ] provider-status-sync automatico tras timeout ambiguo
[ ] acuse de cancelacion si Facturapi lo expone en sandbox
[x] ejecutar audit:stability:e2e al cierre final
```
