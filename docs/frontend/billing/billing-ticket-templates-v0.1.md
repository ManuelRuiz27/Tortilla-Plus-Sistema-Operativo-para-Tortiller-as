# Tortilla Plus — Billing Ticket Templates V0.1

## 1. Propósito

Este documento define las plantillas imprimibles de tickets fiscales y no fiscales para **Tortilla Plus — V1 Operativa Comercial**.

Cubre:

```txt
ticket simple
ticket QR autofactura
ticket facturado
ticket vencido
ticket en revisión
ticket con pendiente de referencia
reimpresión
campos obligatorios
layout térmico
textos recomendados
QA mínimo
```

Ubicación recomendada:

```txt
docs/frontend/billing/billing-ticket-templates-v0.1.md
```

---

## 2. Principio central

Los tickets deben ser:

```txt
claros
cortos
legibles
compatibles con impresora térmica
rápidos de imprimir
sin exceso visual
```

El ticket no debe parecer factura CFDI.

El ticket es comprobante de venta y, si aplica, medio de acceso a autofactura.

---

## 3. Formatos soportados V1

Formato principal:

```txt
ticket térmico 58mm / 80mm
```

Prioridad recomendada:

```txt
80mm
```

Debe existir soporte responsive de impresión para ambos anchos si el hardware lo permite.

---

## 4. Plantillas oficiales V1

```txt
ticket_simple
ticket_qr_autofactura
ticket_facturado
ticket_vencido
ticket_en_revision
ticket_pending_reference
```

---

## 5. Reglas generales de impresión

### 5.1 Fuente

Usar fuente monoespaciada o compatible térmica.

Recomendación:

```txt
monospace
```

### 5.2 Alineación

```txt
encabezado centrado
productos alineados por columna
totales alineados a la derecha
mensajes importantes centrados
```

### 5.3 Longitud

Evitar tickets excesivamente largos.

Detalle de productos debe imprimirse completo, pero sin descripciones largas.

---

## 6. Campos comunes

Todos los tickets deben incluir:

```txt
nombre negocio
sucursal
dirección corta si está configurada
RFC emisor si está configurado
folio venta
fecha/hora
cajero
caja
productos
cantidades
unidad
importe
subtotal si aplica
total
método de pago
mensaje final
```

---

## 7. Campos de producto

Cada línea de producto debe mostrar:

```txt
nombre corto
cantidad
unidad
importe
```

Ejemplo:

```txt
Tortilla kg      1.000 kg      $24.00
Masa kg          0.500 kg      $10.00
Salsa roja       1 pza         $15.00
```

---

## 8. Métodos de pago en ticket

Mostrar:

```txt
Efectivo
Tarjeta
Mixto
Fiado
Transferencia si aplica
```

Si hay pago mixto:

```txt
Efectivo: $50.00
Tarjeta:  $36.00
```

Si hay tarjeta y referencia:

```txt
Ref: 123456
Aut: 7890
Tarjeta: **** 1234
```

No mostrar número completo de tarjeta.

---

# 9. Ticket simple

## 9.1 Uso

Se usa cuando la venta no requiere QR fiscal.

Casos:

```txt
efectivo sin factura
mixto sin tarjeta y sin factura
```

## 9.2 Impresión

Decisión oficial:

```txt
impresión opcional
```

## 9.3 Layout conceptual

```txt
        TORTILLERÍA LA ESPERANZA
          Sucursal Centro
        RFC: XAXX010101000

Folio: TP-000124
Fecha: 24/05/2026 10:35
Cajero: Ana
Caja: 01

--------------------------------
Producto        Cant.     Importe
--------------------------------
Tortilla kg     1.000      $24.00
Salsa roja      1 pza      $15.00
--------------------------------
TOTAL                      $39.00

Pago: Efectivo

Gracias por su compra.
```

## 9.4 No debe incluir

```txt
QR fiscal
URL autofactura
UUID CFDI
texto "factura generada"
```

---

# 10. Ticket QR Autofactura

## 10.1 Uso

Se usa cuando la venta queda disponible para autofactura.

Casos:

```txt
efectivo con factura
tarjeta
mixto con tarjeta
mixto sin tarjeta con factura
fiado/crédito según regla V1
```

## 10.2 Impresión

Decisión oficial:

```txt
impresión automática obligatoria
```

## 10.3 Campos adicionales

```txt
QR autofactura
URL autofactura
fecha límite para facturar
mensaje de autofactura
```

## 10.4 Layout conceptual

```txt
        TORTILLERÍA LA ESPERANZA
          Sucursal Centro
        RFC: XAXX010101000

Folio: TP-000125
Fecha: 24/05/2026 10:42
Cajero: Ana
Caja: 01

--------------------------------
Producto        Cant.     Importe
--------------------------------
Tortilla kg     2.000      $48.00
Paquete 800g    1 pza      $22.00
--------------------------------
TOTAL                      $70.00

Pago: Tarjeta
Ref: 123456
Aut: 7890
Tarjeta: **** 1234

--------------------------------
       FACTURA TU COMPRA
 Escanea el QR para generar tu CFDI

          [ QR AQUÍ ]

https://factura.tortillaplus.mx/r/abc123

Válido hasta: 31/05/2026
--------------------------------

Conserva este ticket.
```

---

## 10.5 Texto recomendado

```txt
Factura tu compra escaneando este QR.
Válido hasta el fin del mes de la compra.
Conserva este ticket.
```

---

# 11. Ticket facturado

## 11.1 Uso

Se imprime cuando el cliente solicita reimpresión de un ticket que ya fue facturado.

## 11.2 Regla oficial

```txt
sí puede reimprimirse
pero debe marcarse como FACTURADO
```

## 11.3 QR

El QR debe ocultarse o inutilizarse visualmente.

No debe parecer que puede volver a facturarse.

## 11.4 Campos adicionales

```txt
FACTURA YA EMITIDA
fecha CFDI
UUID parcial o completo según configuración
```

## 11.5 Layout conceptual

```txt
        TORTILLERÍA LA ESPERANZA
          Sucursal Centro

Folio: TP-000125
Fecha venta: 24/05/2026 10:42

--------------------------------
          FACTURA YA EMITIDA
--------------------------------

Fecha CFDI: 24/05/2026 10:45
UUID: 3F2504E0-4F89-11D3...

TOTAL: $70.00

Este ticket ya fue facturado.
No puede generar otra factura.
```

---

# 12. Ticket vencido

## 12.1 Uso

Se imprime cuando el QR ya venció.

## 12.2 Regla oficial

```txt
sí puede reimprimirse
pero marcado como VENCIDO
```

## 12.3 QR

No mostrar el QR como activo.

Opciones permitidas:

```txt
ocultar QR
mostrar badge VENCIDO
tachar sección QR
```

Recomendación V1:

```txt
ocultar QR
```

## 12.4 Layout conceptual

```txt
        TORTILLERÍA LA ESPERANZA

Folio: TP-000126
Fecha venta: 15/05/2026 09:10
Total: $42.00

--------------------------------
             QR VENCIDO
--------------------------------

Este ticket ya no puede
autofacturarse automáticamente.

Fecha límite: 31/05/2026

Contacta al negocio para revisión.
```

---

# 13. Ticket en revisión

## 13.1 Uso

Se imprime cuando el estado fiscal es:

```txt
requires_manual_review
```

## 13.2 QR

El QR puede permanecer visible si backend lo permite.

El frontend debe respetar el campo:

```txt
showQr
```

o equivalente del payload de impresión.

## 13.3 Layout conceptual

```txt
        TORTILLERÍA LA ESPERANZA

Folio: TP-000127
Fecha venta: 24/05/2026 11:05
Total: $58.00

--------------------------------
        FACTURA EN REVISIÓN
--------------------------------

El negocio está revisando tu factura.
Conserva este ticket.

Estado: En revisión
```

---

# 14. Ticket pending_reference

## 14.1 Uso

Se imprime cuando una venta con tarjeta fue registrada sin referencia/autorización.

## 14.2 Público objetivo

Este mensaje es principalmente operativo para el negocio.

No debe asustar al cliente.

## 14.3 Layout recomendado

En ticket del cliente:

```txt
Pago: Tarjeta
Referencia: Pendiente
```

No imprimir textos largos de conciliación.

En copia interna si se implementa:

```txt
VENTA SIN REFERENCIA
Pendiente de conciliación
```

## 14.4 Regla

No bloquear QR.

Si la venta con tarjeta generó QR, el QR debe imprimirse.

---

# 15. Reimpresión

## 15.1 Regla oficial

Si se reimprime:

```txt
usar mismo receipt_token
incrementar reprint_count
generar auditoría
```

## 15.2 Marca visual

Debe imprimir:

```txt
REIMPRESIÓN #N
```

Ubicación recomendada:

```txt
debajo del folio
```

Ejemplo:

```txt
Folio: TP-000125
REIMPRESIÓN #2
```

---

# 16. QR

## 16.1 Tamaño

El QR debe ser suficientemente grande para escanear.

Recomendación térmica:

```txt
mínimo 28mm x 28mm
```

## 16.2 Contenido

El QR debe codificar únicamente la URL pública:

```txt
https://factura.tortillaplus.mx/r/{receipt_token}
```

No codificar JSON completo.

No codificar datos fiscales.

No codificar información sensible.

---

# 17. URL visible

Debajo del QR debe imprimirse la URL corta.

Motivo:

```txt
si el QR falla, el cliente puede capturar la URL
```

Si la URL es larga, usar dominio corto.

Recomendación:

```txt
factura.tortillaplus.mx/r/{token_corto}
```

---

# 18. Textos legales / informativos

## 18.1 Ticket QR

```txt
Este ticket permite solicitar factura dentro del mes de compra.
```

## 18.2 Ticket simple

```txt
Gracias por su compra.
```

## 18.3 Ticket vencido

```txt
Este ticket ya no puede autofacturarse automáticamente.
```

## 18.4 Ticket facturado

```txt
Este ticket ya fue facturado.
```

---

# 19. Payload de impresión recomendado

El POS no debe construir todo el ticket manualmente si el backend entrega payload imprimible.

Payload conceptual:

```json
{
  "template": "ticket_qr_autofactura",
  "folio": "TP-000125",
  "businessName": "Tortillería La Esperanza",
  "branchName": "Sucursal Centro",
  "cashierName": "Ana",
  "cashRegister": "01",
  "dateTime": "2026-05-24T10:42:00-06:00",
  "items": [
    {
      "name": "Tortilla kg",
      "quantity": "2.000",
      "unit": "kg",
      "amount": "48.00"
    }
  ],
  "payments": [
    {
      "method": "card",
      "amount": "70.00",
      "reference": "123456",
      "authorization": "7890",
      "last4": "1234"
    }
  ],
  "total": "70.00",
  "fiscal": {
    "status": "pending_customer_invoice",
    "qrUrl": "https://factura.tortillaplus.mx/r/abc123",
    "deadline": "2026-05-31T23:59:59-06:00",
    "reprintCount": 0
  }
}
```

---

# 20. Responsabilidad frontend/backend

## 20.1 Backend

Debe entregar:

```txt
tipo de plantilla
datos de venta
datos fiscales
estado fiscal
QR URL
deadline
mensajes relevantes
```

## 20.2 Frontend POS

Debe:

```txt
renderizar plantilla
mandar a imprimir
mostrar error si impresora falla
no modificar reglas fiscales
```

---

# 21. Estados fiscales y plantilla

| Estado | Plantilla |
|---|---|
| eligible_for_daily_global | ticket_simple |
| pending_customer_invoice | ticket_qr_autofactura |
| customer_invoiced | ticket_facturado |
| expired_to_pending_global | ticket_vencido |
| requires_manual_review | ticket_en_revision |
| pending_reference | ticket_qr_autofactura + aviso |
| included_in_global | ticket_simple o ticket_vencido |
| cancelled | ticket_simple con marca cancelado |

---

# 22. Ticket cancelado

Aunque no es el foco fiscal, si se reimprime una venta cancelada debe mostrar:

```txt
VENTA CANCELADA
```

No debe mostrar QR activo.

---

# 23. Diseño visual térmico

Evitar:

```txt
logos grandes
gráficos pesados
tipografías decorativas
bloques de texto largos
```

Preferir:

```txt
líneas separadoras
mayúsculas para estados
espaciado consistente
texto corto
```

---

# 24. Compatibilidad impresora

El renderer debe contemplar:

```txt
corte de papel
acentos
ñ
símbolo $
QR térmico
ancho 58mm/80mm
```

No asumir que todas las impresoras soportan imágenes complejas.

---

# 25. QA mínimo ticket templates

```txt
[ ] Ticket simple imprime sin QR.
[ ] Ticket QR imprime QR y URL.
[ ] Ticket QR muestra fecha límite.
[ ] Ticket tarjeta muestra referencia si existe.
[ ] Ticket tarjeta sin referencia muestra referencia pendiente.
[ ] Ticket facturado no muestra QR activo.
[ ] Ticket facturado muestra fecha CFDI.
[ ] Ticket vencido no muestra QR activo.
[ ] Ticket vencido muestra fecha límite.
[ ] Ticket en revisión muestra mensaje correcto.
[ ] Reimpresión muestra REIMPRESIÓN #N.
[ ] QR escanea correctamente.
[ ] URL visible abre portal público.
[ ] Ticket cabe en 80mm.
[ ] Ticket no se rompe en nombres largos.
[ ] Caracteres con acento imprimen correctamente.
```

---

# 26. No implementar en V1

No incluir:

```txt
diseños gráficos complejos
cupones promocionales
programa de lealtad
logos grandes obligatorios
tickets con colores
formatos carta
factura PDF generada desde POS
reimpresión de XML desde POS
```

---

## 27. Definition of Done

```txt
[ ] Plantilla ticket_simple definida.
[ ] Plantilla ticket_qr_autofactura definida.
[ ] Plantilla ticket_facturado definida.
[ ] Plantilla ticket_vencido definida.
[ ] Plantilla ticket_en_revision definida.
[ ] pending_reference definido.
[ ] Reimpresión definida.
[ ] Payload de impresión definido.
[ ] Responsabilidad frontend/backend definida.
[ ] QA mínimo definido.
```

---

## 28. Siguiente documento

Después de este documento, generar:

```txt
billing-reporting-exports-v0.1.md
```
