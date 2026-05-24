# Tortilla Plus — Billing Reconciliation UI Spec V0.1

## 1. Propósito

Este documento define la experiencia frontend del módulo de **Conciliación Bancaria** de **Tortilla Plus — V1 Operativa Comercial**.

Cubre:

```txt
carga manual de estados de cuenta
CSV/XLSX
BBVA
MercadoPago
Clip
matching por score/confianza
revisión manual
bandeja de incidencias
pending_reference
sucursal-first
vista corporativa consolidada
permisos
QA mínimo
```

Ubicación recomendada:

```txt
docs/frontend/billing/billing-reconciliation-ui-spec-v0.1.md
```

---

## 2. Principio central

La conciliación bancaria no debe ser un ERP pesado.

Debe ayudar al gerente/supervisor a responder rápido:

```txt
qué pagos ya coinciden
qué pagos están pendientes
qué movimientos no se pudieron cruzar
qué ventas tarjeta quedaron sin referencia
qué incidencias requieren acción
```

El sistema debe automatizar lo evidente y dejar al usuario revisar solo excepciones.

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

## 4. Roles permitidos

Roles V1:

```txt
Cajero
Supervisor
Gerente
```

Permisos en conciliación:

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver conciliación | No | Sí | Sí |
| Subir archivo CSV/XLSX | No | Sí | Sí |
| Ver matches sugeridos | No | Sí | Sí |
| Confirmar match | No | Sí | Sí |
| Rechazar match | No | Sí | Sí |
| Resolver pending_reference | No | Sí | Sí |
| Ignorar incidencia | No | No | Sí |
| Ver consolidado corporativo | No | Limitado | Sí |

---

## 5. Alcance V1

### 5.1 Incluido

```txt
carga manual CSV/XLSX
proveedores BBVA, MercadoPago, Clip
normalización de movimientos
matching automático por score
revisión manual de ambiguos
bandeja de incidencias
sucursal-first
vista consolidada para gerente
auditoría de acciones
```

### 5.2 No incluido V1

```txt
open banking automático
conexión API bancaria real
OAuth bancario
lectura de PDF bancario
IA para interpretar archivos desconocidos
conciliación contable formal
pólizas contables
```

---

## 6. Modelo operativo

Decisión oficial:

```txt
V1 = carga manual CSV/XLSX
arquitectura preparada para APIs futuras
```

Esto significa:

```txt
el usuario sube archivo
el sistema procesa
el sistema sugiere matches
el usuario revisa excepciones
```

---

## 7. Proveedores V1

Proveedores soportados inicialmente:

```txt
BBVA
MercadoPago
Clip
```

Debe existir opción:

```txt
Otro
```

pero para V1 puede quedar como no soportado o parser genérico controlado.

---

## 8. Flujo principal de conciliación

```txt
1. Usuario entra a Conciliación.
2. Selecciona sucursal.
3. Selecciona proveedor.
4. Sube archivo CSV/XLSX.
5. Sistema valida formato.
6. Sistema procesa movimientos.
7. Sistema genera matches automáticos.
8. Sistema crea incidencias para casos ambiguos.
9. Usuario revisa pendientes.
10. Usuario confirma/rechaza matches.
11. Sistema actualiza estado de conciliación.
```

---

## 9. Sucursal-first + vista corporativa

Decisión oficial:

```txt
operación normal = por sucursal
vista corporativa = consolidada
```

### 9.1 Vista por sucursal

Default del módulo.

Filtros:

```txt
sucursal
proveedor
fecha
estado conciliación
```

### 9.2 Vista corporativa

Disponible para Gerente con permisos.

Filtros:

```txt
sucursal
proveedor
fecha
estado conciliación
incidencias
```

La vista corporativa no debe mezclar acciones masivas peligrosas en V1.

---

## 10. Pantalla principal

La pantalla principal debe mostrar:

```txt
filtros principales
resumen conciliación
botón subir archivo
tabla de imports recientes
bandeja de incidencias
```

---

## 11. Resumen conciliación

Cards recomendadas:

```txt
Movimientos importados
Matches automáticos
Pendientes de revisión
Pending reference
Movimientos sin match
Duplicados posibles
```

Cada card debe filtrar la lista correspondiente.

---

## 12. Carga de archivo

### 12.1 Acción

Botón:

```txt
Subir estado de cuenta
```

### 12.2 Modal de carga

Campos:

```txt
sucursal
proveedor
periodo
archivo CSV/XLSX
notas opcionales
```

### 12.3 Validaciones frontend

```txt
archivo requerido
extensión permitida CSV/XLSX
proveedor requerido
sucursal requerida
tamaño máximo definido por backend
```

### 12.4 Mensajes de error

Formato no soportado:

```txt
El archivo no tiene un formato compatible.
```

Archivo vacío:

```txt
No encontramos movimientos en el archivo.
```

Proveedor incorrecto:

```txt
El archivo no parece corresponder al proveedor seleccionado.
```

---

## 13. Estados de importación

Estados mínimos:

```txt
uploaded
processing
processed
processed_with_warnings
failed
cancelled
```

Mensajes UI:

```txt
Archivo cargado.
Procesando movimientos...
Conciliación procesada.
Procesado con advertencias.
No se pudo procesar el archivo.
```

---

## 14. Tabla de imports recientes

Columnas:

```txt
fecha carga
proveedor
sucursal
periodo
movimientos
matches
incidencias
estado
acciones
```

Acciones:

```txt
ver detalle
reprocesar
descargar resumen
```

La acción reprocesar debe estar limitada a Gerente si puede cambiar estados ya confirmados.

---

## 15. Matching por score

Decisión oficial:

```txt
matching automático por score/confianza
+
revisión manual para ambiguos
```

Factores de score V1:

```txt
monto exacto
referencia exacta/parcial
proximidad horaria
terminal/proveedor
sucursal
```

Estados sugeridos:

```txt
matched
high_confidence
needs_review
unmatched
duplicate_candidate
```

---

## 16. Interpretación visual del score

Badges recomendados:

```txt
Alto
Medio
Bajo
Sin match
Duplicado posible
```

No usar solo porcentaje.

Mostrar porcentaje si ayuda:

```txt
95%
82%
61%
```

pero siempre con texto.

---

## 17. Reglas de auto-match

El frontend no decide si un match se confirma automáticamente.

El backend debe devolver:

```txt
match_status
confidence_score
match_reason
action_required
```

El frontend solo muestra el resultado.

---

## 18. Revisión manual

Decisión oficial:

```txt
Movimiento banco
→ sugerencias POS ordenadas por score
→ confirmar match
```

---

## 19. Layout revisión manual

### 19.1 Lista izquierda

Movimientos bancarios.

Campos:

```txt
fecha
monto
referencia parcial
proveedor
estado match
score
```

### 19.2 Panel derecho

Candidatos POS.

Orden:

```txt
score descendente
```

Campos:

```txt
folio POS
hora
monto
cajero
referencia
terminal
score
```

---

## 20. Acciones de revisión manual

Acciones permitidas:

```txt
Confirmar match
Rechazar sugerencia
Marcar pendiente
Agregar nota
```

Acciones solo Gerente:

```txt
Ignorar incidencia
Reprocesar importación
```

---

## 21. Confirmar match

Al confirmar match, mostrar resumen:

```txt
Movimiento bancario
Venta POS sugerida
Score
Motivo de coincidencia
```

Confirmación simple:

```txt
Confirmar conciliación
```

Auditoría obligatoria:

```txt
usuario
fecha
movimiento bancario
venta POS
score
tipo match manual/automático
```

---

## 22. Rechazar match

Debe pedir motivo opcional.

Estados posteriores:

```txt
needs_review
unmatched
manual_review_required
```

---

## 23. Bandeja de incidencias

Decisión oficial:

```txt
movimientos no conciliados se gestionan mediante bandeja de incidencias
```

Tipos oficiales V1:

```txt
unmatched
duplicate_candidate
pending_reference
possible_cash_error
manual_review_required
```

---

## 24. Incidencia: unmatched

Caso:

```txt
movimiento bancario sin venta POS candidata suficiente
```

UI:

```txt
Movimiento sin coincidencia
```

Acciones:

```txt
buscar venta manualmente
marcar pendiente
agregar nota
```

---

## 25. Incidencia: duplicate_candidate

Caso:

```txt
un movimiento bancario coincide con más de una venta posible
```

UI:

```txt
Duplicado posible
```

Acciones:

```txt
seleccionar venta correcta
rechazar candidatos incorrectos
mantener pendiente
```

---

## 26. Incidencia: pending_reference

Caso:

```txt
venta tarjeta cerrada sin referencia/autorización
```

UI:

```txt
Venta sin referencia
```

Acciones:

```txt
capturar referencia
buscar movimiento bancario
marcar pendiente
agregar nota
```

Supervisor puede resolver pending_reference.

---

## 27. Incidencia: possible_cash_error

Caso:

```txt
movimiento o venta sugiere error operativo
```

Ejemplos:

```txt
monto tarjeta no coincide
venta marcada efectivo pero parece tarjeta
venta tarjeta sin movimiento relacionado
```

Acciones:

```txt
agregar nota
marcar para gerente
resolver manualmente
```

---

## 28. Incidencia: manual_review_required

Caso:

```txt
el sistema no puede resolver por score o inconsistencias
```

Acciones:

```txt
revisar detalle
mantener pendiente
resolver manual
```

---

## 29. Vista detalle de incidencia

Debe mostrar:

```txt
tipo incidencia
estado
sucursal
proveedor
fecha
monto
referencia parcial
candidatos POS
historial de acciones
notas
```

No mostrar datos técnicos innecesarios.

---

## 30. Estados de incidencia

```txt
open
in_review
resolved
ignored
closed
```

---

## 31. Notas

Las notas deben ser simples.

Campos:

```txt
nota
usuario
fecha
```

No convertir esto en sistema de tickets.

---

## 32. Filtros principales

Filtros mínimos:

```txt
sucursal
proveedor
fecha
estado
tipo incidencia
score
```

---

## 33. Búsqueda manual

Debe existir búsqueda manual para casos sin match.

Campos:

```txt
folio POS
monto
fecha/hora
cajero
referencia
últimos 4 tarjeta
terminal
```

---

## 34. Relación con POS

El POS puede crear ventas con:

```txt
reconciliation_status = pending_reference
```

Estas deben aparecer automáticamente en:

```txt
Conciliación → Incidencias → Pending reference
```

---

## 35. Relación con cierre de caja

Las incidencias no bloquean el cierre por default V1.

Pero deben aparecer como advertencia en cierre:

```txt
Hay ventas con referencia pendiente.
```

La resolución se hace en conciliación.

---

## 36. Estados visuales comunes

Badges:

```txt
Conciliado
Alto score
Revisar
Sin match
Duplicado
Pendiente referencia
Ignorado
```

---

## 37. Métricas recomendadas

```txt
total movimientos importados
total conciliados
porcentaje conciliado
pendientes revisión
pending_reference
duplicados posibles
```

---

## 38. Exportaciones desde conciliación

Exportaciones recomendadas:

```txt
resumen conciliación CSV
incidencias CSV
matches confirmados CSV
```

ZIP/XML fiscal no pertenece a conciliación.

Eso corresponde a exportaciones fiscales.

---

## 39. Seguridad

No mostrar:

```txt
números completos de tarjeta
datos bancarios sensibles innecesarios
tokens de proveedor
archivos crudos a usuarios sin permiso
```

Mostrar últimos 4 si aplica.

---

## 40. Auditoría

Auditar acciones:

```txt
archivo subido
archivo procesado
match confirmado
match rechazado
incidencia resuelta
incidencia ignorada
referencia capturada
nota agregada
```

Datos mínimos:

```txt
usuario
fecha
acción
entidad afectada
valor anterior
valor nuevo
```

---

## 41. Rutas frontend sugeridas

```txt
/manager/billing/reconciliation
/manager/billing/reconciliation/imports
/manager/billing/reconciliation/imports/:id
/manager/billing/reconciliation/incidents
/manager/billing/reconciliation/incidents/:id
```

---

## 42. Componentes esperados

```txt
ReconciliationPage
ReconciliationSummaryCards
StatementUploadModal
ReconciliationImportsTable
BankMovementsList
PosCandidatesPanel
MatchScoreBadge
IncidentInbox
IncidentDetailDrawer
ManualSaleSearchPanel
ReconciliationFilters
ReconciliationAuditTrail
```

---

## 43. Hooks / services sugeridos

```txt
useReconciliationSummary()
useStatementImports()
useUploadStatement()
useImportDetail(importId)
useBankMovements(importId)
useMatchCandidates(movementId)
useConfirmMatch()
useRejectMatch()
useReconciliationIncidents()
useResolveIncident()
useManualSaleSearch()
```

---

## 44. Endpoints conceptuales

```txt
POST /manager/reconciliation/imports
GET /manager/reconciliation/imports
GET /manager/reconciliation/imports/{importId}
GET /manager/reconciliation/imports/{importId}/movements
GET /manager/reconciliation/movements/{movementId}/candidates
POST /manager/reconciliation/matches/{matchId}/confirm
POST /manager/reconciliation/matches/{matchId}/reject
GET /manager/reconciliation/incidents
GET /manager/reconciliation/incidents/{incidentId}
POST /manager/reconciliation/incidents/{incidentId}/resolve
POST /manager/reconciliation/incidents/{incidentId}/ignore
POST /manager/reconciliation/manual-search
```

---

## 45. No implementar en V1

No incluir:

```txt
open banking automático
conexión bancaria directa
PDF bancario
conciliación contable formal
pólizas
IA interpretando archivos arbitrarios
aprobaciones multinivel
bloqueo obligatorio de cierre por incidencias
```

---

## 46. QA mínimo conciliación UI

```txt
[ ] Supervisor puede entrar a conciliación.
[ ] Cajero no puede entrar a conciliación.
[ ] Gerente puede ver vista consolidada.
[ ] Se puede subir CSV BBVA.
[ ] Se puede subir CSV/XLSX MercadoPago.
[ ] Se puede subir CSV/XLSX Clip.
[ ] Archivo inválido muestra error claro.
[ ] Import muestra estado processing.
[ ] Import procesado muestra resumen.
[ ] Matches de alto score se muestran claramente.
[ ] Movement banco muestra candidatos POS.
[ ] Confirmar match actualiza estado.
[ ] Rechazar match deja incidencia.
[ ] Pending_reference aparece en incidencias.
[ ] Se puede capturar referencia pendiente.
[ ] Se puede agregar nota.
[ ] Incidencia resuelta desaparece de abiertas.
[ ] Vista por sucursal funciona.
[ ] Vista corporativa filtra por sucursal.
[ ] Auditoría se genera en acciones críticas.
```

---

## 47. Definition of Done

```txt
[ ] Flujo de carga CSV/XLSX definido.
[ ] Providers V1 definidos.
[ ] Matching por score definido.
[ ] Revisión manual definida.
[ ] Bandeja de incidencias definida.
[ ] pending_reference definido.
[ ] Sucursal-first definido.
[ ] Vista corporativa definida.
[ ] Permisos definidos.
[ ] Rutas frontend definidas.
[ ] Componentes esperados definidos.
[ ] QA mínimo definido.
```

---

## 48. Siguiente documento

Después de este documento, generar:

```txt
billing-roles-permissions-v0.1.md
```
