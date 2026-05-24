# Tortilla Plus — Billing Reporting & Exports V0.1

## 1. Propósito

Este documento define las exportaciones fiscales y reportes operativos del módulo billing de **Tortilla Plus — V1 Operativa Comercial**.

Cubre:

```txt
facturas emitidas
XML
PDF bajo demanda
facturas globales
ventas fiscales
autofacturas pendientes
manual review
cancelaciones
conciliación bancaria
exports por sucursal
exports corporativos
permisos
QA mínimo
```

Ubicación recomendada:

```txt
docs/frontend/billing/billing-reporting-exports-v0.1.md
```

---

## 2. Principio central

Las exportaciones deben servir para operación y revisión fiscal.

No deben convertirse en un módulo contable completo en V1.

El objetivo es permitir que el gerente pueda:

```txt
entregar información a su contador
revisar facturas emitidas
descargar XML
revisar globales
revisar conciliación
detectar pendientes fiscales
```

---

## 3. Aplicación relacionada en monorepo

Aplicación recomendada:

```txt
apps/manager-pwa/
```

Paquetes relacionados:

```txt
packages/shared/
packages/ui/
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

Permisos:

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver exportaciones | No | No | Sí |
| Exportar facturas | No | No | Sí |
| Exportar XML | No | No | Sí |
| Exportar globales | No | No | Sí |
| Exportar conciliación | No | No | Sí |
| Exportar ventas fiscales | No | No | Sí |
| Exportar incidencias | No | No | Sí |

Supervisor puede ver conciliación, pero no debe ejecutar exportaciones fiscales masivas en V1.

---

## 5. Alcance V1

### 5.1 Incluido

```txt
CSV
XLSX
ZIP XML
PDF individual bajo demanda
resumen fiscal por periodo
reporte global diaria
reporte global rezagados
reporte conciliación
reporte manual review
reporte cancelaciones
```

### 5.2 No incluido V1

```txt
contabilidad electrónica
pólizas contables
DIOT
declaraciones fiscales
reportes SAT avanzados
envío automático al contador
programación automática de reportes
conectores contables
```

---

## 6. Formatos oficiales V1

Formatos permitidos:

```txt
CSV
XLSX
ZIP
PDF individual bajo demanda
```

No generar PDF masivo en V1 salvo que sea estrictamente necesario.

Motivo:

```txt
PDF masivo consume más recursos
XML es el documento fiscal prioritario para contabilidad
XLSX/CSV cubren revisión operativa
```

---

## 7. Módulo Exportaciones

Ruta sugerida:

```txt
/manager/billing/exports
```

Pantalla principal:

```txt
selector de tipo de exportación
selector de periodo
selector de sucursal
botón generar exportación
historial de exportaciones recientes
```

---

## 8. Tipos de exportación V1

Tipos oficiales:

```txt
facturas_emitidas
xml_facturas
global_diaria
global_rezagados
ventas_fiscales
autofacturas_pendientes
manual_review
cancelaciones_cfdi
conciliacion
incidencias_conciliacion
```

---

## 9. Exportación: facturas emitidas

### 9.1 Propósito

Listar CFDIs emitidos dentro de un periodo.

### 9.2 Formatos

```txt
CSV
XLSX
```

### 9.3 Campos

```txt
fecha_timbrado
uuid
tipo_cfdi
folio_pos
sucursal
cliente_nombre
cliente_rfc
subtotal
iva
total
estado
metodo_pago
uso_cfdi
regimen_fiscal
```

### 9.4 Filtros

```txt
fecha_inicio
fecha_fin
sucursal
tipo_cfdi
estado
RFC
```

---

## 10. Exportación: XML facturas

### 10.1 Propósito

Descargar XML fiscales de un periodo.

### 10.2 Formato

```txt
ZIP
```

### 10.3 Contenido

```txt
XML individuales
XML global diaria
XML global rezagados
```

### 10.4 Nombre sugerido del ZIP

```txt
tortilla-plus_xml_2026-05_sucursal-centro.zip
```

### 10.5 Reglas

El XML debe existir de forma persistente en backend.

El PDF se genera bajo demanda.

---

## 11. Exportación: global diaria

### 11.1 Propósito

Revisar globales diarias timbradas o pendientes.

### 11.2 Formatos

```txt
CSV
XLSX
```

### 11.3 Campos

```txt
fecha
sucursal
batch_id
estado
ventas_incluidas
ventas_excluidas
subtotal
iva
total
uuid
fecha_timbrado
usuario_confirmo
```

### 11.4 Estados

```txt
prepared
confirmed
stamping
stamped
failed
requires_review
```

---

## 12. Exportación: global rezagados

### 12.1 Propósito

Revisar tickets QR vencidos incluidos en factura global posterior.

### 12.2 Formatos

```txt
CSV
XLSX
```

### 12.3 Campos

```txt
periodo
sucursal
batch_id
tickets_vencidos
ventas_incluidas
subtotal
iva
total
uuid
estado
fecha_timbrado
usuario_confirmo
```

---

## 13. Exportación: ventas fiscales

### 13.1 Propósito

Mostrar ventas y su destino fiscal.

### 13.2 Formatos

```txt
CSV
XLSX
```

### 13.3 Campos

```txt
folio_pos
fecha_venta
sucursal
cajero
total
metodo_pago
fiscal_intent
fiscal_status
ticket_type
receipt_token
invoice_uuid
global_batch_id
estado_conciliacion
```

### 13.4 Uso principal

```txt
auditoría operativa
revisión de ventas no facturadas
revisión de tickets QR
```

---

## 14. Exportación: autofacturas pendientes

### 14.1 Propósito

Listar tickets QR que aún no han sido facturados por el cliente.

### 14.2 Formatos

```txt
CSV
XLSX
```

### 14.3 Campos

```txt
folio_pos
fecha_venta
sucursal
total
fecha_limite
dias_restantes
estado_receipt
metodo_pago
cajero
```

Estados:

```txt
active
expired
used
cancelled
```

---

## 15. Exportación: manual review

### 15.1 Propósito

Listar casos fiscales en revisión.

### 15.2 Formatos

```txt
CSV
XLSX
```

### 15.3 Campos

```txt
fecha
folio_pos
sucursal
cliente_rfc
cliente_nombre
monto
estado
intentos
ultimo_error_resumido
ultimo_intento
usuario_resolvio
fecha_resolucion
```

No exportar detalles técnicos sensibles del provider.

---

## 16. Exportación: cancelaciones CFDI

### 16.1 Propósito

Listar CFDIs cancelados o en proceso de cancelación.

### 16.2 Formatos

```txt
CSV
XLSX
```

### 16.3 Campos

```txt
uuid
fecha_timbrado
fecha_solicitud_cancelacion
fecha_cancelacion
sucursal
cliente_rfc
total
motivo_sat
motivo_interno
evidence_url
estado_cancelacion
usuario_solicito
```

---

## 17. Exportación: conciliación

### 17.1 Propósito

Revisar resultado de conciliación bancaria por periodo.

### 17.2 Formatos

```txt
CSV
XLSX
```

### 17.3 Campos

```txt
fecha_movimiento
proveedor
sucursal
monto_banco
referencia_banco
folio_pos
monto_pos
referencia_pos
score
estado_match
usuario_confirmo
fecha_confirmacion
```

---

## 18. Exportación: incidencias conciliación

### 18.1 Propósito

Listar incidencias abiertas o resueltas.

### 18.2 Formatos

```txt
CSV
XLSX
```

### 18.3 Campos

```txt
fecha
tipo_incidencia
sucursal
proveedor
monto
referencia_parcial
estado
score
nota
usuario_resolvio
fecha_resolucion
```

Tipos:

```txt
unmatched
duplicate_candidate
pending_reference
possible_cash_error
manual_review_required
```

---

## 19. Filtros comunes

Todos los reportes deben soportar:

```txt
fecha_inicio
fecha_fin
sucursal
estado
```

Cuando aplique:

```txt
proveedor
tipo_cfdi
metodo_pago
cajero
RFC
```

---

## 20. Vista sucursal-first

Default:

```txt
sucursal actual
periodo actual
```

El gerente puede cambiar sucursal si tiene permiso.

---

## 21. Vista corporativa

Si el gerente tiene acceso corporativo:

```txt
todas las sucursales
```

Debe incluir filtro:

```txt
sucursal
```

No mezclar datos sin indicar origen.

---

## 22. Historial de exportaciones

La pantalla debe mostrar exportaciones recientes.

Columnas:

```txt
fecha
tipo
periodo
sucursal
formato
estado
usuario
acciones
```

Estados:

```txt
queued
processing
ready
failed
expired
```

Acciones:

```txt
descargar
reintentar
ver detalle
```

---

## 23. Generación asincrónica

Exportaciones pesadas deben ser asincrónicas.

Flujo:

```txt
solicitar exportación
backend crea job
frontend muestra queued/processing
frontend hace polling
cuando esté ready, habilita descargar
```

No bloquear la pantalla esperando archivos grandes.

---

## 24. Estados UI

Estados mínimos:

```txt
idle
validating_filters
queued
processing
ready
failed
expired
```

Mensajes:

```txt
Preparando exportación...
Generando archivo...
Archivo listo para descargar.
No se pudo generar el archivo.
El archivo ya expiró.
```

---

## 25. Expiración de archivos

Los archivos generados pueden expirar.

Recomendación V1:

```txt
24 horas
```

El frontend debe mostrar:

```txt
Disponible hasta: fecha/hora
```

---

## 26. Seguridad

No exponer:

```txt
API keys
tokens provider
archivos XML de otras organizaciones
datos de otra sucursal sin permiso
logs técnicos sensibles
```

El backend debe validar permisos por organización/sucursal.

---

## 27. Nombres de archivo

Formato recomendado:

```txt
tortilla-plus_{tipo}_{periodo}_{sucursal}.{ext}
```

Ejemplos:

```txt
tortilla-plus_facturas_2026-05_sucursal-centro.xlsx
tortilla-plus_xml_2026-05_sucursal-centro.zip
tortilla-plus_conciliacion_2026-05-24_sucursal-centro.csv
```

---

## 28. UI recomendada

Componentes:

```txt
ExportTypeSelector
ExportFiltersPanel
ExportFormatSelector
ExportRequestButton
ExportJobsTable
ExportStatusBadge
ExportDownloadButton
```

---

## 29. Rutas frontend sugeridas

```txt
/manager/billing/exports
/manager/billing/exports/:exportJobId
```

---

## 30. Hooks / services sugeridos

```txt
useExportTypes()
useCreateExport()
useExportJobs()
useExportJobStatus(exportJobId)
useDownloadExport(exportJobId)
```

---

## 31. Endpoints conceptuales

```txt
GET /manager/billing/exports/types
POST /manager/billing/exports
GET /manager/billing/exports
GET /manager/billing/exports/{exportJobId}
GET /manager/billing/exports/{exportJobId}/download
```

Payload conceptual:

```json
{
  "type": "facturas_emitidas",
  "format": "xlsx",
  "filters": {
    "startDate": "2026-05-01",
    "endDate": "2026-05-31",
    "branchId": "branch_001",
    "status": "stamped"
  }
}
```

---

## 32. Validaciones frontend

```txt
tipo requerido
formato requerido
fecha inicio requerida
fecha fin requerida
fecha fin no menor a fecha inicio
sucursal requerida si no hay vista corporativa
periodo máximo configurable
```

Periodo máximo recomendado V1:

```txt
31 días
```

Para rangos mayores, permitir solo si backend lo autoriza.

---

## 33. Empty states

Sin exportaciones:

```txt
No hay exportaciones recientes.
```

Sin resultados:

```txt
No encontramos información con estos filtros.
```

Sin permiso:

```txt
No tienes permiso para exportar información fiscal.
```

---

## 34. Error states

Error general:

```txt
No se pudo generar la exportación.
Intenta de nuevo más tarde.
```

Error permisos:

```txt
No tienes permiso para exportar esta información.
```

Error rango:

```txt
El rango seleccionado es demasiado amplio.
```

Error archivo expirado:

```txt
Este archivo ya expiró. Genera una nueva exportación.
```

---

## 35. Auditoría

Auditar:

```txt
solicitud de exportación
descarga de archivo
reintento de exportación
error de exportación
```

Datos mínimos:

```txt
usuario
rol
fecha/hora
tipo exportación
filtros
formato
sucursal
resultado
```

---

## 36. Relación con PDF/XML

### 36.1 XML

El XML se guarda persistente en backend.

Exportación XML usa ZIP.

### 36.2 PDF

El PDF se genera bajo demanda.

Para V1:

```txt
PDF individual desde detalle de factura
no PDF masivo por default
```

---

## 37. No implementar en V1

No incluir:

```txt
envío automático por correo
programación recurrente
integración directa con contador
pólizas contables
reportes SAT avanzados
PDF masivo obligatorio
firma digital de reportes
```

---

## 38. QA mínimo exports

```txt
[ ] Gerente ve módulo Exportaciones.
[ ] Cajero no ve Exportaciones.
[ ] Supervisor no ve Exportaciones.
[ ] Tipo de exportación es requerido.
[ ] Formato es requerido.
[ ] Fecha inicio es requerida.
[ ] Fecha fin es requerida.
[ ] Rango inválido muestra error.
[ ] Exportación facturas XLSX genera job.
[ ] Exportación XML genera ZIP.
[ ] Exportación global diaria genera archivo.
[ ] Exportación conciliación genera archivo.
[ ] Job muestra queued.
[ ] Job muestra processing.
[ ] Job ready habilita descargar.
[ ] Job failed muestra error.
[ ] Archivo expirado pide regenerar.
[ ] Descarga genera auditoría.
```

---

## 39. Definition of Done

```txt
[ ] Tipos de exportación definidos.
[ ] Formatos definidos.
[ ] Filtros comunes definidos.
[ ] Campos por reporte definidos.
[ ] Historial de exportaciones definido.
[ ] Generación asincrónica definida.
[ ] Permisos definidos.
[ ] Rutas frontend definidas.
[ ] Componentes esperados definidos.
[ ] QA mínimo definido.
```

---

## 40. Siguiente documento

Después de este documento, generar:

```txt
billing-frontend-qa-checklist-v0.1.md
```
