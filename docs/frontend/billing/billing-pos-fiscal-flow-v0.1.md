# Tortilla Plus — Billing POS Fiscal Flow V0.1

## 1. Propósito

Este documento define el comportamiento fiscal dentro del POS de **Tortilla Plus — V1 Operativa Comercial**.

Cubre:

```txt
flujo de cobro fiscal
ticket simple
ticket QR autofactura
venta efectivo
venta tarjeta
venta mixta
pending_reference
impresión automática
búsqueda rápida de tickets
reimpresión limitada
estados visibles en POS
permisos por rol
```

Este documento debe ubicarse en:

```txt
docs/frontend/billing/billing-pos-fiscal-flow-v0.1.md
```

---

## 2. Principio central

El POS debe priorizar velocidad.

```txt
rapidez
teclado
mínimos clics
mínimos modales
flujo continuo
```

La facturación NO debe convertir el POS en un módulo contable.

El POS solo debe:

```txt
cobrar
clasificar fiscalmente según respuesta del backend
imprimir ticket simple o ticket QR
mostrar estados simples
permitir búsqueda rápida limitada
```

El POS NO debe:

```txt
timbrar CFDI
cancelar CFDI
confirmar global diaria
confirmar global rezagados
editar datos fiscales del cliente
resolver manual review fiscal
hacer conciliación avanzada
```

---

## 3. Dependencia con backend

El frontend POS no debe calcular reglas fiscales críticas por su cuenta.

El backend debe responder a la venta con:

```txt
fiscal_intent
fiscal_status
receipt_required
receipt_type
receipt_url
receipt_token
invoice_deadline_at
print_payload
warnings
```

El POS solo interpreta esa respuesta para mostrar UI e imprimir.

---

## 4. Actores permitidos en POS

Roles V1:

```txt
Cajero
Supervisor
Gerente
```

En POS, el usuario principal es el **Cajero**.

Supervisor y Gerente pueden operar POS, pero sus permisos extendidos deben usarse para incidencias, no para sobrecargar el flujo de caja.

---

## 5. Flujo general de venta POS

```txt
1. Cajero captura productos.
2. Cajero abre modal de cobro.
3. Cajero selecciona método de pago.
4. POS muestra la decisión fiscal mínima necesaria.
5. Cajero confirma pago.
6. Backend registra venta y clasificación fiscal.
7. POS imprime automáticamente si corresponde.
8. POS regresa al estado listo para nueva venta.
```

---

## 6. Modal de cobro fiscal

La decisión fiscal se muestra dentro del modal de cobro, según método de pago.

No se pregunta factura antes de saber método de pago.

### 6.1 Métodos de pago

```txt
efectivo
tarjeta
mixto
fiado/crédito
```

---

## 7. Efectivo

### 7.1 Efectivo sin factura

Flujo:

```txt
Cobrar
→ método: efectivo
→ pregunta: ¿Requiere ticket para facturar?
→ No
→ backend clasifica venta como elegible para global diaria
→ ticket simple opcional
```

Resultado esperado:

```txt
fiscal_intent = no_invoice
fiscal_status = eligible_for_daily_global
receipt_required = false
ticket_type = simple
```

UI mínima:

```txt
¿Requiere ticket para facturar?
[No] [Sí, imprimir QR]
```

Opción default recomendada:

```txt
No
```

Porque la prioridad es velocidad.

---

### 7.2 Efectivo con factura

Flujo:

```txt
Cobrar
→ método: efectivo
→ pregunta: ¿Requiere ticket para facturar?
→ Sí
→ backend genera receipt QR
→ POS imprime ticket QR automáticamente
```

Resultado esperado:

```txt
fiscal_intent = customer_invoice
fiscal_status = pending_customer_invoice
receipt_required = true
ticket_type = fiscal_qr
```

---

## 8. Tarjeta

### 8.1 Regla principal

Toda venta con tarjeta genera QR de autofactura automáticamente.

El cajero no debe decidir si el cliente quiere factura.

Flujo:

```txt
Cobrar
→ método: tarjeta
→ POS solicita referencia/autorización
→ backend registra venta
→ backend genera QR autofactura
→ POS imprime ticket QR automáticamente
```

Resultado esperado:

```txt
fiscal_intent = auto_customer_invoice
fiscal_status = pending_customer_invoice
receipt_required = true
ticket_type = fiscal_qr
```

---

### 8.2 Referencia/autorización

La referencia/autorización de tarjeta es obligatoria como regla operativa.

Campos sugeridos:

```txt
proveedor terminal
referencia
autorización
últimos 4 dígitos
terminal_id
```

Proveedores iniciales:

```txt
BBVA
MercadoPago
Clip
Otro
```

---

### 8.3 Tarjeta sin referencia

Si el cajero no captura referencia/autorización, el POS puede cerrar la venta, pero debe marcar incidencia.

Resultado esperado:

```txt
payment_reference = null
reconciliation_status = pending_reference
sale_status = completed
```

El POS debe mostrar advertencia no bloqueante:

```txt
Venta registrada sin referencia.
Quedará pendiente de conciliación.
```

Debe quedar visible para:

```txt
Supervisor
Gerente
Conciliación
Cierre de caja
```

No debe bloquear la fila, pero sí debe auditarse.

---

## 9. Pago mixto

### 9.1 Mixto con tarjeta

Si cualquier parte del pago incluye tarjeta:

```txt
ticket QR automático
```

Flujo:

```txt
Cobrar
→ método: mixto
→ incluye tarjeta
→ capturar referencia/autorización de tarjeta
→ backend genera QR
→ POS imprime ticket QR automáticamente
```

Resultado esperado:

```txt
fiscal_intent = auto_customer_invoice
fiscal_status = pending_customer_invoice
receipt_required = true
ticket_type = fiscal_qr
```

---

### 9.2 Mixto sin tarjeta

Ejemplo:

```txt
efectivo + fiado
```

El POS debe preguntar:

```txt
¿Requiere ticket para facturar?
```

Si responde No:

```txt
eligible_for_daily_global
```

Si responde Sí:

```txt
pending_customer_invoice + QR
```

---

## 10. Fiado / crédito

Para V1, las ventas con fiado/crédito deben tratarse con cautela fiscal.

Regla recomendada:

```txt
fiado/crédito → pending_customer_invoice
```

Motivo:

```txt
reduce problemas posteriores de facturación
mantiene trazabilidad de cliente
```

Si el negocio decide permitir fiado sin QR, debe ser configuración explícita futura, no comportamiento default V1.

---

## 11. Ticket simple vs ticket QR

### 11.1 Ticket simple

Se usa cuando:

```txt
venta efectivo sin factura
venta mixta sin tarjeta y sin factura
```

Impresión:

```txt
opcional
```

Campos mínimos:

```txt
nombre negocio
sucursal
folio venta
fecha/hora
cajero
productos
cantidades
total
método de pago
```

No incluye QR fiscal.

---

### 11.2 Ticket QR fiscal

Se usa cuando:

```txt
venta con tarjeta
venta mixta con tarjeta
venta efectivo con factura
venta mixta sin tarjeta con factura
fiado/crédito si aplica regla V1
```

Impresión:

```txt
automática obligatoria
```

Campos mínimos:

```txt
nombre negocio
sucursal
folio venta
fecha/hora
cajero
productos
cantidades
total
método de pago
QR autofactura
URL autofactura
fecha límite
mensaje de autofactura
```

Texto recomendado:

```txt
Factura tu compra escaneando este QR.
Válido hasta el fin del mes de la compra.
```

---

## 12. Impresión

### 12.1 Regla oficial

```txt
ticket simple = impresión opcional
ticket QR = impresión automática
```

### 12.2 Comportamiento POS

Flujo:

```txt
Venta completada
→ imprimir automáticamente si aplica
→ regresar inmediatamente al POS
→ listo para siguiente venta
```

La impresión debe ser silenciosa.

No debe abrir pantalla post-venta.

---

### 12.3 Error de impresora

Si falla la impresión:

```txt
mostrar toast/error no bloqueante
```

Ejemplos:

```txt
No se pudo imprimir el ticket.
Revisa la impresora.
El ticket quedó registrado.
```

El error de impresora no debe cancelar la venta.

---

## 13. Búsqueda rápida de tickets en POS

### 13.1 Propósito

Permitir recuperación rápida en caja sin convertir el POS en una tabla histórica compleja.

La búsqueda completa vive en Manager.

---

### 13.2 Alcance del Cajero

El Cajero solo puede buscar:

```txt
misma caja
mismo turno
últimas 24 horas
```

Filtros rápidos:

```txt
folio
monto
método de pago
últimos 4 tarjeta
referencia parcial
hora aproximada
```

---

### 13.3 Resultado de búsqueda

Lista compacta con resumen fiscal.

Cada resultado debe mostrar:

```txt
folio
hora
total
método de pago
estado fiscal
QR/no QR
últimos 4 tarjeta si aplica
```

Estados visuales recomendados:

```txt
Simple
QR activo
Facturado
QR vencido
En revisión
Pendiente referencia
```

---

## 14. Reimpresión limitada

### 14.1 Regla principal

La reimpresión es un flujo secundario.

No debe dominar la UX del POS.

---

### 14.2 Cajero

Puede reimprimir tickets recientes bajo alcance limitado:

```txt
misma caja
mismo turno
últimas 24 horas
```

Toda reimpresión genera auditoría.

Datos de auditoría:

```txt
usuario
caja
turno
fecha/hora
ticket_id
receipt_id si aplica
reprint_count
```

---

### 14.3 Gerente

La búsqueda histórica completa y recuperación avanzada pertenece a Manager.

No al POS.

---

## 15. Reimpresión QR

Si se reimprime un ticket QR:

```txt
se usa el mismo receipt_token
no se genera nuevo QR
reprint_count incrementa
```

El ticket debe mostrar:

```txt
REIMPRESIÓN #N
```

No se invalida el QR anterior.

Motivo:

```txt
el QR no da acceso físico
solo abre portal de autofactura
regenerar token complica operación y soporte
```

---

## 16. Ticket ya facturado

Si el ticket ya fue facturado:

```txt
sí puede reimprimirse
pero debe marcarse como FACTURADO
```

El ticket debe mostrar:

```txt
FACTURA YA EMITIDA
fecha CFDI
UUID parcial o completo según configuración
```

El QR debe ocultarse o quedar inutilizado visualmente.

Motivo:

```txt
el QR ya no tiene utilidad
evita que el cliente intente facturar otra vez
```

---

## 17. Ticket QR vencido

Si el QR venció:

```txt
sí puede reimprimirse
pero marcado como VENCIDO
```

El ticket debe mostrar:

```txt
QR VENCIDO
Este ticket ya no puede autofacturarse.
Contacta al negocio para revisión.
```

El QR no debe mostrarse como activo.

---

## 18. Ticket en revisión

Si el estado fiscal es:

```txt
requires_manual_review
```

El ticket puede reimprimirse, pero debe mostrar:

```txt
FACTURA EN REVISIÓN
El negocio está revisando tu factura.
Conserva este ticket.
```

El QR puede permanecer visible si backend lo permite.

La fuente de verdad es el estado devuelto por backend.

---

## 19. Estados visuales POS

El POS debe mostrar estados simples y operativos.

Estados mínimos:

```txt
simple
qr_active
stamped
expired
requires_manual_review
pending_reference
included_in_global
cancelled
```

Ejemplos de etiquetas:

```txt
Simple
QR activo
Facturado
QR vencido
En revisión
Pendiente referencia
Globalizado
Cancelado
```

---

## 20. Mensajes POS recomendados

### 20.1 Venta normal

```txt
Venta registrada.
```

### 20.2 Ticket QR

```txt
Ticket fiscal generado.
```

### 20.3 Tarjeta sin referencia

```txt
Venta registrada sin referencia.
Quedará pendiente de conciliación.
```

### 20.4 Impresora falló

```txt
No se pudo imprimir.
Revisa la impresora.
```

### 20.5 Sin permiso

```txt
No tienes permiso para esta acción.
```

---

## 21. Permisos en POS

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Cobrar venta | Sí | Sí | Sí |
| Generar ticket simple | Sí | Sí | Sí |
| Generar ticket QR | Sí | Sí | Sí |
| Buscar ticket reciente | Sí limitado | Sí | Sí |
| Reimprimir ticket reciente | Sí limitado | Sí | Sí |
| Ver histórico completo | No | Limitado | Sí |
| Resolver pending_reference | No | Sí | Sí |
| Cancelar CFDI | No | No | No en POS |
| Confirmar global | No | No | No en POS |
| Configurar fiscal | No | No | No en POS |

Las acciones fiscales críticas no deben estar en POS.

---

## 22. Integración recomendada con endpoints

El POS debe consumir endpoints de ventas/cobro y no endpoints fiscales internos directos.

Endpoints conceptuales:

```txt
POST /sales
POST /sales/{id}/complete
GET /sales/search
POST /sales/{id}/print
POST /sales/{id}/reprint
```

El backend debe responder con payload imprimible.

Ejemplo conceptual:

```json
{
  "saleId": "sale_123",
  "folio": "TP-000123",
  "fiscalStatus": "pending_customer_invoice",
  "ticketType": "fiscal_qr",
  "printRequired": true,
  "printPayload": {
    "template": "ticket_qr",
    "qrContent": "https://factura.tortillaplus.mx/r/token",
    "deadline": "2026-05-31T23:59:59-06:00"
  },
  "warnings": []
}
```

---

## 23. Reglas de diseño UI

### 23.1 Modal de cobro

Debe ser compacto.

Debe priorizar:

```txt
total
método de pago
monto recibido
referencia tarjeta si aplica
pregunta factura si aplica
botón cobrar
```

No debe mezclar reportes ni datos contables.

---

### 23.2 Botones

Botón principal:

```txt
Cobrar
```

Botones secundarios:

```txt
Cancelar
Dividir pago
```

---

### 23.3 Teclado

Debe soportar uso rápido con teclado.

Recomendaciones:

```txt
Enter = confirmar campo actual
Esc = cerrar modal si no hay operación crítica
Tab = siguiente campo
```

No definir demasiados atajos en V1.

---

## 24. Casos límite

### 24.1 Backend genera QR pero impresora falla

La venta queda registrada.

El POS muestra error de impresión.

El cajero puede buscar ticket reciente y reimprimir.

---

### 24.2 Tarjeta sin referencia

Venta cierra.

Debe mostrarse incidencia.

No debe bloquear la fila.

---

### 24.3 QR vencido

POS no reactiva QR.

Solo muestra/reimprime estado vencido.

---

### 24.4 Ticket ya facturado

POS no permite facturar de nuevo.

Solo muestra estado facturado.

---

### 24.5 Error fiscal backend durante venta

Si la venta ya fue completada, no debe revertirse automáticamente por error fiscal.

Debe quedar como incidencia fiscal o manual review según respuesta backend.

---

## 25. QA mínimo POS fiscal

```txt
[ ] Efectivo sin factura genera ticket simple.
[ ] Efectivo con factura genera ticket QR.
[ ] Tarjeta genera QR automático.
[ ] Mixto con tarjeta genera QR automático.
[ ] Mixto sin tarjeta pregunta factura.
[ ] Tarjeta sin referencia genera pending_reference.
[ ] Ticket QR imprime automáticamente.
[ ] Ticket simple puede no imprimirse.
[ ] Error de impresora no cancela venta.
[ ] Cajero solo busca tickets recientes.
[ ] Ticket facturado se reimprime marcado como FACTURADO.
[ ] Ticket vencido se reimprime marcado como VENCIDO.
[ ] Ticket en revisión se muestra como FACTURA EN REVISIÓN.
[ ] POS no muestra cancelación CFDI.
[ ] POS no muestra confirmación de globales.
```

---

## 26. Definition of Done

```txt
[ ] Modal de cobro fiscal definido.
[ ] Flujo efectivo definido.
[ ] Flujo tarjeta definido.
[ ] Flujo mixto definido.
[ ] pending_reference definido.
[ ] Ticket simple definido.
[ ] Ticket QR definido.
[ ] Búsqueda rápida definida.
[ ] Reimpresión limitada definida.
[ ] Estados visuales definidos.
[ ] Permisos POS definidos.
[ ] QA mínimo definido.
```

---

## 27. Siguiente documento

Después de este documento, generar:

```txt
billing-public-autofactura-portal-v0.1.md
```
