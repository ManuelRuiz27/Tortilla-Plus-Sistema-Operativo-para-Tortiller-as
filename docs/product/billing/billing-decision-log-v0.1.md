# Tortilla Plus — Billing Decision Log V0.1

## 1. Propósito

Este documento registra las decisiones de producto y negocio congeladas para el módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

No sustituye los documentos técnicos ni frontend.

Su función es dejar claro:

```txt
qué se decidió
por qué se decidió
qué alternativas se descartaron
qué queda fuera de V1
```

Ubicación recomendada:

```txt
docs/product/billing/billing-decision-log-v0.1.md
```

---

## 2. Estado del documento

```txt
versión: V0.1
estado: congelado para documentación inicial
alcance: billing fiscal V1
producto: Tortilla Plus — V1 Operativa Comercial
```

---

## 3. Decisiones generales

## DEC-001 — Motor fiscal inicial

### Decisión

El motor fiscal inicial será:

```txt
Facturapi
```

### Motivo

Facturapi permite operar con modelo SaaS multi-organización y reduce fricción inicial para múltiples RFCs.

### Alternativas consideradas

```txt
PAC tradicional
integración directa SAT
otro proveedor CFDI
```

### Estado

```txt
aceptada
```

---

## DEC-002 — Modelo RFC V1

### Decisión

V1 operará con:

```txt
un RFC emisor por negocio
```

La arquitectura debe quedar preparada para multi-RFC futuro.

### Motivo

Multi-RFC desde el inicio agrega complejidad operativa y fiscal innecesaria para el MVP.

### Estado

```txt
aceptada
```

---

## DEC-003 — Separación de dominios fiscales

### Decisión

Se separan tres tipos de facturación:

```txt
factura individual cliente final
factura global de la tortillería
factura SaaS de Tortilla Plus al negocio
```

### Motivo

Mezclarlas en un mismo flujo genera confusión contable, UX pesada y mayor riesgo técnico.

### Estado

```txt
aceptada
```

---

# 4. Decisiones POS fiscal

## DEC-004 — El POS no timbra CFDI directamente

### Decisión

El POS no timbra CFDI.

El POS solo:

```txt
cobra
clasifica fiscalmente
imprime ticket simple o QR
```

### Motivo

El POS debe priorizar velocidad y operación de caja.

### Estado

```txt
aceptada
```

---

## DEC-005 — Decisión fiscal dentro del modal de cobro

### Decisión

La decisión fiscal ocurre dentro del modal de cobro y depende del método de pago.

### Reglas

```txt
Efectivo:
  pregunta si requiere ticket para facturar

Tarjeta:
  QR automático

Mixto con tarjeta:
  QR automático

Mixto sin tarjeta:
  pregunta si requiere ticket para facturar
```

### Alternativas descartadas

```txt
preguntar antes del método de pago
preguntar después de cobrar
```

### Estado

```txt
aceptada
```

---

## DEC-006 — Ticket simple opcional y QR obligatorio

### Decisión

```txt
ticket simple = impresión opcional
ticket QR fiscal = impresión automática obligatoria
```

### Motivo

Reduce gasto de papel en ventas normales y protege ventas facturables.

### Estado

```txt
aceptada
```

---

## DEC-007 — Tarjeta genera QR automático

### Decisión

Toda venta con tarjeta genera QR de autofactura.

### Motivo

El cliente tiene respaldo bancario y puede solicitar factura dentro del mes de compra.

### Estado

```txt
aceptada
```

---

## DEC-008 — Referencia de tarjeta

### Decisión

La referencia/autorización de tarjeta es obligatoria como regla operativa.

Pero si no se captura, la venta puede continuar marcada como:

```txt
pending_reference
```

### Motivo

Se equilibra control de conciliación con continuidad operativa en caja.

### Riesgo aceptado

```txt
si se abusa del pending_reference, baja la calidad de conciliación
```

### Estado

```txt
aceptada con riesgo controlado
```

---

## DEC-009 — Pending reference no bloquea cierre

### Decisión

Las ventas con `pending_reference` no bloquean operación ni cierre de forma rígida en V1.

Deben generar:

```txt
incidencia
auditoría
visibilidad en conciliación
```

### Motivo

Bloquear operación puede ser demasiado agresivo para una tortillería.

### Estado

```txt
aceptada
```

---

## DEC-010 — Impresión silenciosa inmediata

### Decisión

Después de completar venta:

```txt
imprimir si aplica
volver al POS
seguir con nueva venta
```

Sin pantalla post-venta.

### Motivo

La prioridad del POS es rapidez.

### Estado

```txt
aceptada
```

---

## DEC-011 — Búsqueda rápida en POS

### Decisión

El POS tendrá búsqueda rápida y limitada.

Manager tendrá búsqueda histórica completa.

### Alcance cajero

```txt
misma caja
mismo turno
últimas 24 horas
```

### Estado

```txt
aceptada
```

---

## DEC-012 — Reimpresión QR

### Decisión

La reimpresión de QR usa el mismo `receipt_token`.

Debe incrementar:

```txt
reprint_count
```

y generar auditoría.

### Motivo

El QR no da acceso físico. Solo abre portal de autofactura.

### Estado

```txt
aceptada
```

---

## DEC-013 — Ticket ya facturado

### Decisión

Un ticket ya facturado puede reimprimirse, pero debe marcarse como:

```txt
FACTURA YA EMITIDA
```

No debe mostrar QR activo.

### Estado

```txt
aceptada
```

---

## DEC-014 — Ticket QR vencido

### Decisión

Un ticket vencido puede reimprimirse, pero debe marcarse como:

```txt
QR VENCIDO
```

No debe mostrar QR activo.

### Estado

```txt
aceptada
```

---

## DEC-015 — Ticket en revisión

### Decisión

Un ticket en `requires_manual_review` puede reimprimirse con mensaje:

```txt
FACTURA EN REVISIÓN
```

El QR puede mantenerse visible si backend lo permite.

### Estado

```txt
aceptada
```

---

# 5. Decisiones portal público de autofactura

## DEC-016 — Portal por QR

### Decisión

El flujo oficial de factura individual será:

```txt
QR/autofactura
```

No se capturan datos fiscales desde POS en V1.

### Motivo

Evita fricción en caja y reduce errores del cajero.

### Estado

```txt
aceptada
```

---

## DEC-017 — Vista combinada

### Decisión

El portal público mostrará:

```txt
resumen compacto del ticket
+
formulario fiscal
```

en una sola vista.

### Alternativas descartadas

```txt
pantalla ticket + botón facturar
formulario directo sin contexto
```

### Estado

```txt
aceptada
```

---

## DEC-018 — Recordar datos localmente

### Decisión

El portal puede recordar datos fiscales en:

```txt
localStorage
```

solo si el usuario marca:

```txt
Recordar mis datos en este dispositivo
```

### Motivo

Mejora UX sin requerir login.

### Estado

```txt
aceptada
```

---

## DEC-019 — Validación fiscal moderada

### Decisión

Frontend valida de forma moderada.

Backend/provider valida finalmente.

### Validaciones frontend

```txt
RFC formato
homoclave
longitud
CP 5 dígitos
correo válido
campos obligatorios
```

### Alternativa descartada

```txt
replicar validación SAT completa en frontend
```

### Estado

```txt
aceptada
```

---

## DEC-020 — Procesamiento híbrido con polling

### Decisión

Después de enviar datos fiscales:

```txt
submit
processing
polling
resultado final
```

### Motivo

Soporta intento inmediato y fallback a cola sin dejar al cliente en incertidumbre.

### Estado

```txt
aceptada
```

---

## DEC-021 — Descarga PDF/XML

### Decisión

El portal mostrará:

```txt
PDF como acción principal
XML como acción secundaria
```

### Motivo

El cliente promedio busca PDF. El XML sigue siendo necesario para contabilidad.

### Estado

```txt
aceptada
```

---

## DEC-022 — QR vencido en portal

### Decisión

Si el QR venció, el portal muestra pantalla informativa con contacto del negocio.

No permite autofactura automática.

### Estado

```txt
aceptada
```

---

# 6. Decisiones globales fiscales

## DEC-023 — Global diaria

### Decisión

La global diaria usa:

```txt
preparación automática
confirmación gerente obligatoria
```

### Alternativa descartada

```txt
timbrado silencioso automático
```

### Motivo

Evita timbrar información incorrecta sin revisión.

### Estado

```txt
aceptada
```

---

## DEC-024 — Global rezagados

### Decisión

Los tickets QR vencidos se gestionan mediante global rezagados.

También requiere confirmación del gerente.

### Estado

```txt
aceptada
```

---

## DEC-025 — Ventas excluidas de global

### Decisión

No entran a global diaria:

```txt
ventas con QR activo
ventas ya facturadas
ventas en manual review
ventas canceladas
ventas con inconsistencia fiscal
```

### Estado

```txt
aceptada
```

---

# 7. Decisiones Manual Review

## DEC-026 — Manual Review controlado

### Decisión

Manual Review permite correcciones mínimas y reintento.

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

### Motivo

Cambiar RFC o razón social es fiscalmente delicado.

### Estado

```txt
aceptada
```

---

## DEC-027 — Reintentos fiscales

### Decisión

Política de intentos:

```txt
intento inmediato
fallback cola
máximo 5 intentos
backoff exponencial
```

Si se agotan:

```txt
requires_manual_review
```

### Estado

```txt
aceptada
```

---

# 8. Decisiones cancelación CFDI

## DEC-028 — Cancelación solo Gerente

### Decisión

Solo Gerente puede cancelar CFDI.

### Roles bloqueados

```txt
Cajero
Supervisor
```

### Estado

```txt
aceptada
```

---

## DEC-029 — Cancelación guiada

### Decisión

La cancelación CFDI usa flujo guiado.

Requiere:

```txt
motivo SAT
motivo interno
warning fuerte
auditoría
```

Puede incluir:

```txt
evidence_url opcional
```

### Estado

```txt
aceptada
```

---

## DEC-030 — Evidencia externa

### Decisión

Tortilla Plus no almacena evidencia en V1.

Solo guarda un link opcional.

### Motivo

Evita almacenamiento sensible y complejidad documental.

### Estado

```txt
aceptada
```

---

## DEC-031 — Sin devoluciones post-timbrado desde POS

### Decisión

Si ya se timbró:

```txt
no hay devoluciones desde POS
```

### Motivo

Evita mezclar operación rápida con procesos fiscales posteriores.

### Estado

```txt
aceptada
```

---

# 9. Decisiones conciliación bancaria

## DEC-032 — Conciliación híbrida

### Decisión

V1 usa:

```txt
carga manual CSV/XLSX
```

Arquitectura futura preparada para:

```txt
APIs BBVA
APIs MercadoPago
APIs Clip
```

### Estado

```txt
aceptada
```

---

## DEC-033 — Proveedores iniciales

### Decisión

Proveedores iniciales:

```txt
BBVA
MercadoPago
Clip
```

### Motivo

Son terminales/proveedores comunes en operación local.

### Estado

```txt
aceptada
```

---

## DEC-034 — Matching por score

### Decisión

La conciliación usa matching por score/confianza.

Factores:

```txt
monto
referencia
proximidad horaria
terminal/proveedor
sucursal
```

### Alternativas descartadas

```txt
matching exacto estricto
todo manual
```

### Estado

```txt
aceptada
```

---

## DEC-035 — Revisión manual banco a POS

### Decisión

La revisión manual usa flujo:

```txt
movimiento banco
sugerencias POS ordenadas por score
confirmar match
```

### Estado

```txt
aceptada
```

---

## DEC-036 — Bandeja de incidencias

### Decisión

Los movimientos no conciliados se gestionan en bandeja de incidencias.

Tipos V1:

```txt
unmatched
duplicate_candidate
pending_reference
possible_cash_error
manual_review_required
```

### Estado

```txt
aceptada
```

---

## DEC-037 — Conciliación sucursal-first

### Decisión

La operación diaria de conciliación es por sucursal.

Existe vista corporativa consolidada para Gerente.

### Estado

```txt
aceptada
```

---

# 10. Decisiones roles y permisos

## DEC-038 — Roles oficiales V1

### Decisión

Solo existen tres roles internos:

```txt
Cajero
Supervisor
Gerente
```

### Alternativas descartadas

```txt
contador
director
dueño
soporte SaaS
admin fiscal
roles personalizados
```

### Estado

```txt
aceptada
```

---

## DEC-039 — Cajero limitado

### Decisión

Cajero solo opera caja.

No opera acciones fiscales críticas.

### Estado

```txt
aceptada
```

---

## DEC-040 — Supervisor operativo

### Decisión

Supervisor puede resolver incidencias operativas:

```txt
pending_reference
conciliación
matches
notas operativas
```

No puede:

```txt
cancelar CFDI
confirmar globales
manual review fiscal
configuración fiscal
```

### Estado

```txt
aceptada
```

---

## DEC-041 — Gerente fiscal completo

### Decisión

Gerente tiene control fiscal completo.

Puede:

```txt
confirmar globales
cancelar CFDI
resolver manual review
configurar fiscal
exportar reportes
gestionar conciliación
```

### Estado

```txt
aceptada
```

---

# 11. Decisiones configuración fiscal

## DEC-042 — Validación completa antes de activar

### Decisión

Para activar facturación debe pasar checklist completo:

```txt
RFC válido
razón social válida
CSD válido
certificados vigentes
conexión Facturapi OK
credenciales OK
timbrado prueba exitoso
```

### Estado

```txt
aceptada
```

---

## DEC-043 — XML persistente y PDF bajo demanda

### Decisión

Regla de archivos fiscales:

```txt
guardar XML + metadata
generar PDF bajo demanda
```

### Estado

```txt
aceptada
```

---

# 12. Decisiones exportaciones

## DEC-044 — Exportaciones solo Gerente

### Decisión

Solo Gerente puede exportar información fiscal.

### Estado

```txt
aceptada
```

---

## DEC-045 — Formatos de exportación V1

### Decisión

Formatos V1:

```txt
CSV
XLSX
ZIP XML
PDF individual bajo demanda
```

### Estado

```txt
aceptada
```

---

## DEC-046 — Sin contabilidad avanzada V1

### Decisión

No se implementa en V1:

```txt
pólizas contables
contabilidad electrónica
DIOT
declaraciones
conectores contables
```

### Estado

```txt
aceptada
```

---

# 13. Decisiones fuera de alcance V1

## DEC-047 — Sin login de cliente final

### Decisión

El portal público no requiere login.

### Estado

```txt
aceptada
```

---

## DEC-048 — Sin multi-RFC operativo

### Decisión

Multi-RFC queda preparado en arquitectura, pero no operativo en V1.

### Estado

```txt
aceptada
```

---

## DEC-049 — Sin open banking automático

### Decisión

Las integraciones API bancarias quedan para versión futura.

### Estado

```txt
aceptada
```

---

## DEC-050 — Sin roles personalizados

### Decisión

No se implementan roles personalizados en V1.

### Estado

```txt
aceptada
```

---

## DEC-051 — Sin solicitud manual tardía desde portal

### Decisión

Si el QR venció, el portal informa y muestra contacto.

No crea ticket de soporte o solicitud manual desde el portal en V1.

### Estado

```txt
aceptada
```

---

# 14. Riesgos aceptados

## RSK-001 — Pending reference puede degradar conciliación

### Riesgo

Si el cajero usa demasiado `pending_reference`, la conciliación pierde valor.

### Mitigación

```txt
dashboard gerente
bandeja de incidencias
auditoría
límites configurables futuros
```

---

## RSK-002 — Global con confirmación manual agrega trabajo gerente

### Riesgo

El gerente debe revisar y confirmar globales.

### Mitigación

```txt
preparación automática
resumen claro
warnings
confirmación guiada
```

---

## RSK-003 — CSV/XLSX depende del usuario

### Riesgo

Conciliación V1 depende de que el usuario suba archivos correctos.

### Mitigación

```txt
validaciones
parsers por proveedor
mensajes claros
arquitectura preparada para APIs
```

---

## RSK-004 — QR vencido puede generar molestia del cliente

### Riesgo

El cliente puede intentar facturar fuera de plazo.

### Mitigación

```txt
fecha límite visible en ticket
portal informativo
contacto del negocio
```

---

# 15. Decisiones que requieren revisión futura

```txt
multi-RFC operativo
integraciones API BBVA/MercadoPago/Clip
portal cliente con cuenta
roles personalizados
reportes contables avanzados
PDF masivo
soporte fiscal interno
límite estricto pending_reference
auto-timbrado global sin confirmación
```

---

# 16. Relación con otros documentos

Reglas de negocio:

```txt
docs/product/billing/billing-business-rules-v0.1.md
```

Flujos de usuario:

```txt
docs/product/billing/billing-user-flows-v0.1.md
```

Frontend:

```txt
docs/frontend/billing/
```

Backend:

```txt
docs/backend/billing/
```

---

## 17. Definition of Done

Este documento queda completo si registra:

```txt
[ ] decisiones POS fiscal
[ ] decisiones portal autofactura
[ ] decisiones globales
[ ] decisiones manual review
[ ] decisiones cancelaciones
[ ] decisiones conciliación
[ ] decisiones roles
[ ] decisiones configuración fiscal
[ ] decisiones exportaciones
[ ] fuera de alcance
[ ] riesgos aceptados
```
