# Tortilla Plus — Billing Public Autofactura Portal V0.1

## 1. Propósito

Este documento define la experiencia frontend del **Portal Público de Autofactura** de **Tortilla Plus — V1 Operativa Comercial**.

El portal permite que un cliente escanee el QR impreso en su ticket y genere su factura sin intervención directa del cajero.

Debe cubrir:

```txt
consulta de ticket por QR
vista combinada ticket + formulario fiscal
captura de datos fiscales
validación fiscal moderada
recordar datos localmente
procesamiento híbrido con polling
descarga PDF/XML
QR vencido
factura en revisión
errores y estados
mobile-first
```

Ubicación recomendada:

```txt
docs/frontend/billing/billing-public-autofactura-portal-v0.1.md
```

---

## 2. Principio central

El portal público debe ser:

```txt
mobile-first
rápido
claro
sin login
sin lenguaje técnico excesivo
```

El usuario final probablemente escaneará el QR desde su teléfono.

El portal no debe sentirse como un sistema administrativo.

---

## 3. Aplicación relacionada en monorepo

Aplicación recomendada:

```txt
apps/public-billing-pwa/
```

Paquetes relacionados:

```txt
packages/ui/
packages/shared/
packages/api-contracts/
```

---

## 4. Ruta pública esperada

Ruta pública amigable:

```txt
https://factura.tortillaplus.mx/r/{receipt_token}
```

Ruta interna equivalente:

```txt
/public/billing/receipts/{token}
```

El token debe venir desde el backend.

El frontend no debe generar tokens ni inferir datos desde el QR.

---

## 5. Fuente de verdad

El backend decide:

```txt
si el ticket existe
si el QR está activo
si el QR venció
si ya fue facturado
si está en revisión
si puede intentar facturar
si se puede descargar PDF/XML
```

El frontend solo consume estados.

---

## 6. Flujo principal

```txt
1. Cliente escanea QR.
2. Portal consulta receipt por token.
3. Portal muestra resumen compacto del ticket.
4. Portal muestra formulario fiscal.
5. Cliente captura datos.
6. Cliente envía solicitud.
7. Portal muestra estado de procesamiento.
8. Portal hace polling.
9. Portal muestra resultado final:
   - factura generada
   - error corregible
   - en revisión
   - vencido
```

---

## 7. Layout oficial

La pantalla principal usa vista combinada:

```txt
[Resumen compacto del ticket]
[Formulario fiscal]
```

No usar flujo de varias páginas en V1.

Motivo:

```txt
menos pasos
más contexto
mejor UX móvil
```

---

## 8. Resumen compacto del ticket

Debe mostrarse arriba del formulario.

Campos mínimos:

```txt
nombre negocio
sucursal
folio ticket
fecha/hora
total
fecha límite para facturar
estado del ticket
```

Ejemplo visual conceptual:

```txt
Tortillería La Esperanza
Ticket TP-000124
23/05/2026 10:35
Total: $86.00
Puedes facturar hasta: 31/05/2026
```

---

## 9. Detalle de productos

El detalle de productos debe ser visible, pero no ocupar toda la pantalla.

Recomendación:

```txt
accordion colapsable
```

Texto:

```txt
Ver productos
```

Campos:

```txt
producto
cantidad
unidad
importe
```

Default:

```txt
colapsado
```

Motivo:

```txt
el usuario necesita confirmar que escaneó el ticket correcto
pero no necesita ver la lista completa todo el tiempo
```

---

## 10. Formulario fiscal

Campos obligatorios:

```txt
RFC
Razón social
Régimen fiscal
Código postal fiscal
Uso CFDI
Correo electrónico
Confirmar correo electrónico
```

Campos no requeridos V1:

```txt
teléfono
dirección completa
constancia fiscal adjunta
```

El portal debe mantenerse simple.

---

## 11. Orden recomendado del formulario

```txt
RFC
Razón social
Régimen fiscal
Código postal fiscal
Uso CFDI
Correo electrónico
Confirmar correo electrónico
Recordar datos en este dispositivo
Botón generar factura
```

---

## 12. Recordar datos fiscales

Decisión oficial:

```txt
recordar datos localmente con localStorage
```

Debe ser opcional mediante checkbox:

```txt
[ ] Recordar mis datos en este dispositivo
```

Campos recordables:

```txt
RFC
Razón social
Régimen fiscal
Código postal fiscal
Uso CFDI
Correo electrónico
```

No requiere cuenta de usuario.

No requiere login.

---

## 13. Privacidad local

Cuando el usuario active “recordar mis datos”, mostrar texto corto:

```txt
Tus datos se guardarán solo en este dispositivo.
```

Debe existir opción para limpiar datos guardados:

```txt
Borrar datos guardados
```

---

## 14. Validación fiscal moderada

El frontend debe validar antes de enviar.

Validaciones mínimas:

```txt
RFC obligatorio
RFC con formato válido
longitud RFC persona física/moral
homoclave presente
razón social obligatoria
régimen fiscal obligatorio
código postal numérico de 5 dígitos
uso CFDI obligatorio
correo válido
confirmación de correo coincide
```

El frontend NO replica SAT completo.

El backend/provider realiza validación final.

---

## 15. RFC persona física/moral

Regla frontend orientativa:

```txt
persona física = 13 caracteres
persona moral = 12 caracteres
```

El frontend puede inferir tipo por longitud, pero no debe bloquear casos raros sin validación backend.

Si falla formato, mostrar:

```txt
Revisa el RFC. Debe incluir homoclave y tener el formato correcto.
```

---

## 16. Régimen fiscal

Debe mostrarse como selector.

La lista de regímenes debe venir del backend o de un catálogo compartido.

No hardcodear textos largos en componentes.

El frontend puede usar:

```txt
packages/shared/catalogs/tax-regimes
```

si existe.

---

## 17. Uso CFDI

Debe mostrarse como selector.

Debe permitir al menos:

```txt
G03 - Gastos en general
S01 - Sin efectos fiscales
```

El catálogo completo debe venir de backend/shared.

---

## 18. Envío de solicitud

Endpoint conceptual:

```txt
POST /public/billing/receipts/{token}/invoice
```

Payload conceptual:

```json
{
  "rfc": "XAXX010101000",
  "legalName": "PUBLICO EN GENERAL",
  "taxRegime": "616",
  "postalCode": "78000",
  "cfdiUse": "S01",
  "email": "cliente@correo.com"
}
```

---

## 19. Procesamiento híbrido con polling

Decisión oficial:

```txt
procesamiento híbrido con polling
```

Flujo:

```txt
Enviar datos
→ submitting
→ processing
→ polling invoice-status
→ resultado final
```

Endpoint conceptual:

```txt
GET /public/billing/receipts/{token}/invoice-status
```

---

## 20. Estados frontend

Estados mínimos:

```txt
loading_receipt
receipt_ready
receipt_expired
receipt_already_invoiced
submitting
processing
stamped
failed_retryable
requires_manual_review
rejected_invalid_data
provider_unavailable
rate_limited
not_found
```

---

## 21. Estado loading_receipt

Se muestra al abrir QR y consultar token.

UI:

```txt
Consultando ticket...
```

No mostrar formulario hasta validar receipt.

---

## 22. Estado receipt_ready

Se muestra cuando:

```txt
receipt.status = active
canInvoice = true
```

UI:

```txt
resumen ticket
formulario fiscal
botón Generar factura
```

---

## 23. Estado receipt_expired

Decisión oficial:

```txt
pantalla informativa + contacto negocio
```

UI:

```txt
Este ticket ya no puede autofacturarse automáticamente.

Fecha límite:
31/05/2026

Fecha actual:
02/06/2026

Contacta al negocio para revisión.
```

Datos configurables:

```txt
WhatsApp
teléfono
correo
dirección sucursal
```

No mostrar formulario fiscal.

No permitir submit.

---

## 24. Estado receipt_already_invoiced

Se muestra cuando el ticket ya fue facturado.

UI:

```txt
Este ticket ya fue facturado.
```

Mostrar si están disponibles:

```txt
fecha de CFDI
UUID parcial/completo según configuración
botón Descargar PDF
botón XML
```

No permitir generar otra factura.

---

## 25. Estado submitting

Después de presionar “Generar factura”.

UI:

```txt
Enviando datos...
```

Bloquear doble submit.

No borrar formulario.

---

## 26. Estado processing

Cuando backend responde 202 o estado en proceso.

UI:

```txt
Estamos generando tu factura.
Esto puede tardar unos segundos.
```

Mostrar spinner y polling.

No cerrar automáticamente.

---

## 27. Estado stamped

Factura generada correctamente.

UI principal:

```txt
Factura generada
```

Acciones:

```txt
[Descargar PDF]
[XML]
```

Decisión oficial:

```txt
PDF principal + XML secundario
```

PDF debe ser CTA principal.

XML debe existir como acción secundaria.

---

## 28. Estado failed_retryable

Se muestra cuando el backend sigue intentando.

UI:

```txt
Seguimos intentando generar tu factura.
Puedes dejar esta pantalla abierta o volver más tarde con el mismo QR.
```

El polling puede continuar con backoff.

No pedir al usuario recapturar datos todavía.

---

## 29. Estado requires_manual_review

Se muestra cuando agotó retries o requiere intervención.

UI:

```txt
Tu factura está en revisión.
El negocio revisará la solicitud.
Conserva este ticket.
```

No mostrar mensajes técnicos de provider.

No mostrar stack traces ni códigos internos.

---

## 30. Estado rejected_invalid_data

Se muestra cuando los datos fiscales fueron rechazados.

UI:

```txt
No pudimos generar la factura con estos datos.
Revisa la información fiscal e intenta de nuevo.
```

Debe resaltar campos si backend indica detalles:

```txt
RFC
código postal
régimen fiscal
uso CFDI
```

Permitir corregir y reenviar si el QR sigue activo.

---

## 31. Estado provider_unavailable

Se muestra cuando el provider no está disponible.

UI:

```txt
El servicio de facturación no respondió.
Estamos intentando procesar tu factura.
```

Si backend manda retry:

```txt
mostrar processing/failed_retryable
```

No culpar al usuario.

---

## 32. Estado rate_limited

Se muestra cuando hay demasiados intentos.

UI:

```txt
Demasiados intentos.
Espera unos minutos antes de volver a intentar.
```

No indicar detalles internos de rate limit.

---

## 33. Descarga PDF/XML

Endpoints conceptuales:

```txt
GET /public/billing/invoices/{invoiceId}/pdf
GET /public/billing/invoices/{invoiceId}/xml
```

UI:

```txt
[Descargar PDF]
[XML]
```

Reglas:

```txt
PDF = acción principal
XML = acción secundaria
```

Si PDF falla:

```txt
mostrar error claro
no ocultar XML
```

---

## 34. Reintentos de descarga

Si falla descarga por red:

```txt
mostrar Reintentar
```

No regenerar factura.

Solo volver a solicitar documento.

---

## 35. Seguridad pública

El portal no debe exponer:

```txt
IDs internos innecesarios
datos sensibles de otros tickets
logs provider
detalles técnicos
datos completos de emisor si no son necesarios
```

El token del QR es suficiente para consultar el ticket.

---

## 36. Rate limit visual

El frontend debe manejar 429.

No debe intentar hacer polling agresivo.

Backoff recomendado:

```txt
2s
5s
10s
20s
```

Máximo recomendado en pantalla:

```txt
2 minutos
```

Después mostrar:

```txt
Puedes volver más tarde con este mismo QR.
```

---

## 37. Mobile-first

La UI debe diseñarse para teléfono.

Prioridades:

```txt
una columna
campos grandes
botón principal visible
sin tablas anchas
resumen compacto
acordeón para productos
```

Ancho objetivo inicial:

```txt
360px a 430px
```

También debe funcionar en desktop.

---

## 38. Accesibilidad mínima

Requisitos:

```txt
labels visibles
inputs con autocomplete adecuado
contraste suficiente
errores debajo del campo
botones con estado disabled claro
focus visible
```

Autocompletado sugerido:

```txt
email
postal-code
organization
```

---

## 39. Textos UX recomendados

### Botón principal

```txt
Generar factura
```

### Checkbox

```txt
Recordar mis datos en este dispositivo
```

### Link secundario

```txt
Borrar datos guardados
```

### Descarga

```txt
Descargar PDF
XML
```

### Productos

```txt
Ver productos
Ocultar productos
```

---

## 40. Errores UX recomendados

### RFC inválido

```txt
Revisa el RFC. Debe tener formato válido y homoclave.
```

### CP inválido

```txt
El código postal debe tener 5 dígitos.
```

### Correo inválido

```txt
Ingresa un correo válido.
```

### Correos no coinciden

```txt
Los correos no coinciden.
```

### Ticket no encontrado

```txt
No encontramos este ticket.
Verifica que el enlace sea correcto.
```

### Ticket vencido

```txt
Este ticket ya no puede autofacturarse automáticamente.
```

---

## 41. Componentes frontend esperados

```txt
PublicBillingPage
ReceiptSummaryCard
ReceiptItemsAccordion
TaxDataForm
TaxRegimeSelect
CfdiUseSelect
RememberTaxDataCheckbox
InvoiceProcessingState
InvoiceSuccessState
InvoiceExpiredState
InvoiceManualReviewState
InvoiceErrorState
DownloadInvoiceActions
```

---

## 42. Hooks / services sugeridos

```txt
usePublicReceipt(token)
useSubmitInvoice(token)
useInvoicePolling(token)
useRememberedTaxData()
useInvoiceDownload(invoiceId)
```

---

## 43. Storage local

Clave sugerida:

```txt
tortilla_plus.public_billing.tax_data.v1
```

Estructura conceptual:

```json
{
  "rfc": "XAXX010101000",
  "legalName": "PUBLICO EN GENERAL",
  "taxRegime": "616",
  "postalCode": "78000",
  "cfdiUse": "S01",
  "email": "cliente@correo.com",
  "savedAt": "2026-05-24T10:00:00-06:00"
}
```

---

## 44. No implementar en V1

No incluir:

```txt
login de cliente
perfil fiscal cloud
historial multi-ticket del cliente
subida de constancia fiscal
chat soporte
solicitud manual tardía desde portal
edición de factura ya timbrada
cancelación por cliente
```

---

## 45. Casos límite

### 45.1 Cliente recarga página durante processing

El portal debe consultar estado por token.

Si hay invoice_request activa:

```txt
mostrar processing
continuar polling
```

---

### 45.2 Cliente abre QR ya facturado

Mostrar estado facturado y descargas.

No mostrar formulario.

---

### 45.3 Cliente abre QR vencido

Mostrar pantalla vencida con contacto.

No mostrar formulario.

---

### 45.4 Cliente envía datos y cierra navegador

Debe poder volver con el mismo QR y ver estado.

---

### 45.5 Cliente intenta varias veces

Aplicar rate limit backend.

Frontend debe mostrar mensaje amigable.

---

## 46. QA mínimo portal

```txt
[ ] QR activo muestra ticket + formulario.
[ ] Productos aparecen en acordeón.
[ ] RFC inválido se bloquea en frontend.
[ ] CP inválido se bloquea en frontend.
[ ] Correos distintos se bloquean.
[ ] Checkbox recuerda datos en localStorage.
[ ] Borrar datos guardados funciona.
[ ] Submit cambia a submitting.
[ ] Respuesta 202 cambia a processing.
[ ] Polling llega a stamped.
[ ] PDF se muestra como botón principal.
[ ] XML se muestra como acción secundaria.
[ ] QR vencido muestra pantalla informativa.
[ ] QR facturado muestra descargas.
[ ] requires_manual_review muestra mensaje claro.
[ ] 429 muestra rate_limited.
[ ] Ticket no encontrado muestra not_found.
[ ] Portal funciona en 360px de ancho.
```

---

## 47. Definition of Done

```txt
[ ] Ruta pública por token definida.
[ ] Vista combinada definida.
[ ] Resumen ticket definido.
[ ] Formulario fiscal definido.
[ ] Validaciones frontend definidas.
[ ] localStorage opcional definido.
[ ] Polling definido.
[ ] Estados frontend definidos.
[ ] Descarga PDF/XML definida.
[ ] QR vencido definido.
[ ] Manual review definido.
[ ] Componentes esperados definidos.
[ ] QA mínimo definido.
```

---

## 48. Siguiente documento

Después de este documento, generar:

```txt
billing-manager-ui-spec-v0.1.md
```
