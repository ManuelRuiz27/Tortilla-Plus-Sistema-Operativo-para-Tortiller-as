# Tortilla Plus — Billing Frontend QA Checklist V0.1

## 1. Propósito

Este documento define el checklist QA frontend para el módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Cubre pruebas de:

```txt
POS fiscal
Portal público de autofactura
Manager Billing UI
Conciliación bancaria UI
Roles y permisos
Plantillas de tickets
Exportaciones
Estados visuales
Errores
Responsive
Accesibilidad mínima
```

Ubicación recomendada:

```txt
docs/frontend/billing/billing-frontend-qa-checklist-v0.1.md
```

---

## 2. Alcance

### Incluido

```txt
pruebas manuales frontend
pruebas de flujos E2E frontend
pruebas de estados visuales
pruebas de permisos UI
pruebas responsive
pruebas de errores controlados
pruebas de impresión visual
pruebas de polling
```

### No incluido

```txt
pruebas unitarias backend
pruebas reales SAT
pruebas reales Facturapi productivo
pruebas contables
pruebas de open banking
pruebas de hardware real avanzadas
```

---

## 3. Dependencias

Antes de ejecutar QA frontend, deben existir:

```txt
backend billing mock o API funcional
catálogo de régimen fiscal
catálogo de uso CFDI
usuarios de prueba Cajero/Supervisor/Gerente
ventas de prueba
tickets QR activos
tickets QR vencidos
facturas timbradas sandbox
casos manual review
imports conciliación mock
```

---

## 4. Ambientes QA

### 4.1 Local

```txt
apps/pos-pwa
apps/manager-pwa
apps/public-billing-pwa
API mock o backend local
```

### 4.2 Staging

```txt
backend staging
provider sandbox
base de datos staging
storage staging
workers staging
```

---

## 5. Usuarios de prueba

```txt
Cajero
Supervisor
Gerente
```

No crear usuarios con roles fuera de V1 para QA del MVP.

---

# 6. QA POS Fiscal

## 6.1 Venta efectivo sin factura

Checklist:

```txt
[ ] Cajero abre POS.
[ ] Cajero agrega productos.
[ ] Cajero abre modal de cobro.
[ ] Cajero selecciona efectivo.
[ ] POS muestra pregunta “¿Requiere ticket para facturar?”.
[ ] Cajero selecciona No.
[ ] Venta se completa.
[ ] Ticket simple queda disponible.
[ ] No se muestra QR fiscal.
[ ] POS regresa a nueva venta.
```

Resultado esperado:

```txt
ticket simple
sin QR
estado fiscal eligible_for_daily_global
```

---

## 6.2 Venta efectivo con factura

Checklist:

```txt
[ ] Cajero selecciona efectivo.
[ ] POS pregunta si requiere ticket para facturar.
[ ] Cajero selecciona Sí.
[ ] Venta se completa.
[ ] POS genera ticket QR.
[ ] Ticket QR se imprime automáticamente.
[ ] POS regresa a nueva venta.
```

Resultado esperado:

```txt
ticket_qr_autofactura
estado fiscal pending_customer_invoice
QR visible
fecha límite visible
```

---

## 6.3 Venta tarjeta con referencia

Checklist:

```txt
[ ] Cajero selecciona tarjeta.
[ ] POS muestra campos de referencia/autorización.
[ ] Cajero captura referencia.
[ ] Cajero captura últimos 4 si aplica.
[ ] Venta se completa.
[ ] Ticket QR se imprime automáticamente.
[ ] Ticket muestra referencia parcial.
```

Resultado esperado:

```txt
ticket_qr_autofactura
reconciliation_status normal
QR activo
```

---

## 6.4 Venta tarjeta sin referencia

Checklist:

```txt
[ ] Cajero selecciona tarjeta.
[ ] Cajero deja referencia vacía.
[ ] POS permite continuar.
[ ] POS muestra advertencia no bloqueante.
[ ] Venta se completa.
[ ] Ticket QR se imprime.
[ ] Incidencia pending_reference queda visible en Manager/Conciliación.
```

Resultado esperado:

```txt
reconciliation_status = pending_reference
ticket QR generado
advertencia visible
```

---

## 6.5 Pago mixto con tarjeta

Checklist:

```txt
[ ] Cajero selecciona pago mixto.
[ ] Incluye tarjeta.
[ ] POS no pregunta si requiere factura.
[ ] POS solicita referencia de tarjeta.
[ ] Venta se completa.
[ ] Ticket QR se imprime automáticamente.
```

Resultado esperado:

```txt
ticket_qr_autofactura
fiscal_status pending_customer_invoice
```

---

## 6.6 Pago mixto sin tarjeta

Checklist:

```txt
[ ] Cajero selecciona pago mixto.
[ ] No incluye tarjeta.
[ ] POS pregunta si requiere ticket para facturar.
[ ] Si No, ticket simple.
[ ] Si Sí, ticket QR.
```

---

## 6.7 Error de impresora

Checklist:

```txt
[ ] Simular error de impresora.
[ ] Completar venta.
[ ] Venta queda registrada.
[ ] POS muestra error no bloqueante.
[ ] POS no revierte la venta.
[ ] Cajero puede buscar ticket reciente.
```

Mensaje esperado:

```txt
No se pudo imprimir.
Revisa la impresora.
```

---

## 6.8 Búsqueda rápida de tickets

Checklist:

```txt
[ ] Cajero abre búsqueda rápida.
[ ] Busca por folio.
[ ] Busca por monto.
[ ] Busca por últimos 4 de tarjeta.
[ ] Solo ve tickets de misma caja/turno/últimas 24h.
[ ] Lista muestra resumen fiscal.
```

Campos esperados:

```txt
folio
hora
total
método pago
estado fiscal
QR/no QR
últimos 4 si aplica
```

---

## 6.9 Reimpresión

Checklist:

```txt
[ ] Cajero reimprime ticket reciente.
[ ] Ticket muestra REIMPRESIÓN #N.
[ ] El mismo receipt_token se conserva.
[ ] Se genera auditoría.
```

---

# 7. QA Ticket Templates

## 7.1 Ticket simple

```txt
[ ] Imprime nombre del negocio.
[ ] Imprime sucursal.
[ ] Imprime folio.
[ ] Imprime fecha/hora.
[ ] Imprime productos.
[ ] Imprime total.
[ ] No imprime QR.
[ ] No imprime URL de autofactura.
```

---

## 7.2 Ticket QR

```txt
[ ] Imprime QR visible.
[ ] QR escanea correctamente.
[ ] URL visible abre portal.
[ ] Imprime fecha límite.
[ ] Imprime mensaje de autofactura.
[ ] Imprime método de pago.
```

---

## 7.3 Ticket facturado

```txt
[ ] Muestra FACTURA YA EMITIDA.
[ ] Muestra fecha CFDI.
[ ] Muestra UUID parcial/completo según configuración.
[ ] No muestra QR activo.
```

---

## 7.4 Ticket vencido

```txt
[ ] Muestra QR VENCIDO.
[ ] Muestra fecha límite.
[ ] No muestra QR activo.
[ ] Muestra contacto/revisión si aplica.
```

---

## 7.5 Ticket en revisión

```txt
[ ] Muestra FACTURA EN REVISIÓN.
[ ] Muestra “Conserva este ticket”.
[ ] QR se muestra u oculta según payload backend.
```

---

## 7.6 Compatibilidad térmica

```txt
[ ] Ticket cabe en 80mm.
[ ] Ticket no se rompe con nombres largos.
[ ] Caracteres acentuados imprimen correctamente.
[ ] Símbolo $ imprime correctamente.
[ ] QR no sale cortado.
```

---

# 8. QA Portal Público Autofactura

## 8.1 QR activo

```txt
[ ] Abrir URL con token activo.
[ ] Muestra loading inicial.
[ ] Muestra resumen del ticket.
[ ] Muestra formulario fiscal.
[ ] Productos aparecen en acordeón.
```

---

## 8.2 Validaciones formulario

```txt
[ ] RFC vacío muestra error.
[ ] RFC inválido muestra error.
[ ] Código postal distinto de 5 dígitos muestra error.
[ ] Régimen fiscal requerido.
[ ] Uso CFDI requerido.
[ ] Correo inválido muestra error.
[ ] Correos no coinciden.
```

---

## 8.3 Recordar datos

```txt
[ ] Checkbox aparece.
[ ] Al activar, guarda datos en localStorage.
[ ] Al volver a abrir portal, precarga datos.
[ ] Borrar datos guardados funciona.
[ ] Si checkbox no está activo, no guarda datos.
```

---

## 8.4 Submit exitoso

```txt
[ ] Presionar Generar factura.
[ ] Botón se deshabilita durante submitting.
[ ] Estado cambia a processing.
[ ] Polling inicia.
[ ] Estado final cambia a stamped.
[ ] Se muestra botón Descargar PDF.
[ ] XML aparece como acción secundaria.
```

---

## 8.5 QR vencido

```txt
[ ] Abrir QR vencido.
[ ] No muestra formulario.
[ ] Muestra fecha límite.
[ ] Muestra fecha actual.
[ ] Muestra contacto negocio si existe.
```

---

## 8.6 Ticket ya facturado

```txt
[ ] Abrir QR ya facturado.
[ ] No muestra formulario.
[ ] Muestra estado facturado.
[ ] Muestra PDF/XML si están disponibles.
```

---

## 8.7 Manual review

```txt
[ ] Simular requires_manual_review.
[ ] Portal muestra mensaje claro.
[ ] No muestra error técnico.
[ ] Indica conservar ticket.
```

---

## 8.8 Rate limit

```txt
[ ] Simular HTTP 429.
[ ] Portal muestra mensaje de demasiados intentos.
[ ] Polling no sigue agresivamente.
```

---

## 8.9 Responsive

```txt
[ ] Funciona en 360px.
[ ] Funciona en 390px.
[ ] Funciona en 430px.
[ ] No hay scroll horizontal.
[ ] Botones son táctiles.
[ ] Inputs son legibles.
```

---

# 9. QA Manager Billing UI

## 9.1 Sidebar

```txt
[ ] Gerente ve Dashboard Fiscal.
[ ] Gerente ve Facturas.
[ ] Gerente ve Global Diaria.
[ ] Gerente ve Global Rezagados.
[ ] Gerente ve Manual Review.
[ ] Gerente ve Cancelaciones.
[ ] Gerente ve Conciliación.
[ ] Gerente ve Exportaciones.
[ ] Gerente ve Configuración Fiscal.
```

---

## 9.2 Dashboard fiscal

```txt
[ ] Muestra Global diaria pendiente.
[ ] Muestra QR pendientes de autofactura.
[ ] Muestra tickets QR vencidos.
[ ] Muestra facturas generadas hoy.
[ ] Muestra facturas con error/revisión.
[ ] Muestra pending_reference.
[ ] Muestra conciliación pendiente.
[ ] Cada card navega al módulo correcto.
```

---

## 9.3 Facturas

```txt
[ ] Tabla default es limpia.
[ ] Filtros avanzados expanden/colapsan.
[ ] Buscar por UUID funciona.
[ ] Buscar por RFC funciona.
[ ] Buscar por folio POS funciona.
[ ] Detalle de factura abre correctamente.
[ ] PDF descarga bajo demanda.
[ ] XML descarga correctamente.
```

---

## 9.4 Global diaria

```txt
[ ] Muestra resumen del lote.
[ ] Muestra ventas incluidas.
[ ] Muestra ventas excluidas.
[ ] Muestra warnings.
[ ] Confirmar timbrado pide confirmación fuerte.
[ ] Al confirmar cambia a stamping.
[ ] Al timbrar cambia a stamped.
[ ] Si falla, muestra error operativo.
```

---

## 9.5 Global rezagados

```txt
[ ] Muestra periodo.
[ ] Muestra tickets vencidos.
[ ] Muestra total.
[ ] Confirmar timbrado pide confirmación fuerte.
[ ] Resultado stamped muestra descarga.
```

---

## 9.6 Manual Review

```txt
[ ] Muestra casos en revisión.
[ ] Detalle abre correctamente.
[ ] Permite editar correo.
[ ] Permite editar uso CFDI.
[ ] Permite editar CP.
[ ] No permite editar RFC.
[ ] No permite editar razón social.
[ ] Reintentar muestra confirmación.
[ ] Reintento actualiza estado.
```

---

## 9.7 Cancelaciones CFDI

```txt
[ ] Solo Gerente ve cancelaciones.
[ ] Wizard inicia desde factura.
[ ] Muestra warning fuerte.
[ ] Motivo SAT es obligatorio.
[ ] Motivo interno es obligatorio.
[ ] Evidence URL es opcional.
[ ] Checkbox confirmación final es obligatorio si aplica.
[ ] Cancelación cambia a processing.
[ ] Resultado cancelled se muestra.
```

---

## 9.8 Configuración Fiscal

```txt
[ ] Muestra estado draft.
[ ] Captura RFC.
[ ] Captura razón social.
[ ] Captura régimen fiscal.
[ ] Muestra estado CSD.
[ ] Validar configuración muestra validating.
[ ] Checklist actualiza pasos.
[ ] Si todo pasa, estado ready.
[ ] Activar cambia a active.
[ ] Error provider se muestra operativo.
[ ] Certificado vencido muestra expired_certificates.
```

---

# 10. QA Conciliación Bancaria UI

## 10.1 Acceso

```txt
[ ] Cajero no accede a conciliación.
[ ] Supervisor accede a conciliación.
[ ] Gerente accede a conciliación.
```

---

## 10.2 Carga archivo

```txt
[ ] Subir CSV BBVA.
[ ] Subir XLSX MercadoPago.
[ ] Subir XLSX Clip.
[ ] Archivo inválido muestra error.
[ ] Archivo vacío muestra error.
[ ] Proveedor requerido.
[ ] Sucursal requerida.
```

---

## 10.3 Estados import

```txt
[ ] Import inicia uploaded.
[ ] Cambia a processing.
[ ] Cambia a processed.
[ ] Puede mostrar processed_with_warnings.
[ ] Error cambia a failed.
```

---

## 10.4 Matching

```txt
[ ] Matches de alto score se muestran como Alto.
[ ] Matches medios se muestran como Revisar.
[ ] Sin match se muestra correctamente.
[ ] Duplicado posible se muestra correctamente.
```

---

## 10.5 Revisión manual

```txt
[ ] Lista izquierda muestra movimientos banco.
[ ] Panel derecho muestra candidatos POS.
[ ] Candidatos están ordenados por score.
[ ] Confirmar match actualiza estado.
[ ] Rechazar match crea o mantiene incidencia.
```

---

## 10.6 Incidencias

```txt
[ ] unmatched aparece en bandeja.
[ ] duplicate_candidate aparece en bandeja.
[ ] pending_reference aparece en bandeja.
[ ] possible_cash_error aparece en bandeja.
[ ] manual_review_required aparece en bandeja.
[ ] Se puede agregar nota.
[ ] Se puede resolver incidencia.
[ ] Solo Gerente puede ignorar incidencia.
```

---

## 10.7 Sucursal-first / corporativo

```txt
[ ] Vista default filtra por sucursal.
[ ] Gerente puede ver consolidado si tiene permiso.
[ ] Filtro sucursal funciona.
[ ] Datos siempre indican sucursal origen.
```

---

# 11. QA Roles y Permisos

## 11.1 Cajero

```txt
[ ] Puede cobrar venta.
[ ] Puede generar ticket QR.
[ ] Puede buscar tickets recientes.
[ ] No accede a Manager Billing.
[ ] No ve cancelaciones.
[ ] No ve globales.
[ ] No ve configuración fiscal.
```

---

## 11.2 Supervisor

```txt
[ ] Puede acceder a conciliación.
[ ] Puede resolver pending_reference.
[ ] Puede confirmar/rechazar match.
[ ] No puede cancelar CFDI.
[ ] No puede confirmar global diaria.
[ ] No puede configurar fiscal.
[ ] No puede exportar reportes fiscales.
```

---

## 11.3 Gerente

```txt
[ ] Accede a Manager Billing completo.
[ ] Confirma global diaria.
[ ] Confirma global rezagados.
[ ] Cancela CFDI.
[ ] Resuelve manual review.
[ ] Configura fiscal.
[ ] Exporta reportes.
```

---

# 12. QA Exportaciones

## 12.1 Acceso

```txt
[ ] Solo Gerente ve Exportaciones.
[ ] Cajero no ve Exportaciones.
[ ] Supervisor no ve Exportaciones.
```

---

## 12.2 Validaciones

```txt
[ ] Tipo de exportación requerido.
[ ] Formato requerido.
[ ] Fecha inicio requerida.
[ ] Fecha fin requerida.
[ ] Fecha fin no puede ser menor a inicio.
[ ] Rango demasiado amplio muestra error.
```

---

## 12.3 Jobs

```txt
[ ] Crear exportación genera queued.
[ ] Job cambia a processing.
[ ] Job ready habilita descarga.
[ ] Job failed muestra error.
[ ] Archivo expirado pide regenerar.
```

---

## 12.4 Tipos

```txt
[ ] Exporta facturas emitidas.
[ ] Exporta ZIP XML.
[ ] Exporta global diaria.
[ ] Exporta global rezagados.
[ ] Exporta ventas fiscales.
[ ] Exporta manual review.
[ ] Exporta cancelaciones.
[ ] Exporta conciliación.
[ ] Exporta incidencias conciliación.
```

---

# 13. QA Estados visuales comunes

Badges mínimos:

```txt
[ ] Simple.
[ ] QR activo.
[ ] Pendiente.
[ ] En proceso.
[ ] Timbrada.
[ ] Globalizada.
[ ] Vencida.
[ ] En revisión.
[ ] Pendiente referencia.
[ ] Cancelada.
[ ] Error.
```

Cada badge debe tener:

```txt
texto
color
contraste suficiente
```

No depender solo del color.

---

# 14. QA Errores

Errores mínimos:

```txt
[ ] Error de red.
[ ] Error 401.
[ ] Error 403.
[ ] Error 404.
[ ] Error 409.
[ ] Error 422.
[ ] Error 429.
[ ] Error 500.
[ ] Provider no disponible.
[ ] Timeout.
```

Mensajes deben ser operativos.

No mostrar:

```txt
stack trace
JSON crudo
API keys
payload provider
```

---

# 15. QA Accesibilidad mínima

```txt
[ ] Inputs tienen label visible.
[ ] Botones tienen texto claro.
[ ] Focus visible.
[ ] Contraste suficiente.
[ ] Errores se muestran cerca del campo.
[ ] Estados disabled son distinguibles.
[ ] No se depende solo del color.
[ ] Portal público usable con teclado básico.
```

---

# 16. QA Responsive

## 16.1 Portal público

```txt
[ ] 360px.
[ ] 390px.
[ ] 430px.
[ ] 768px.
[ ] Sin scroll horizontal.
```

## 16.2 Manager

```txt
[ ] Desktop 1366px.
[ ] Desktop 1440px.
[ ] Tablet landscape si aplica.
[ ] Tablas no rompen layout.
[ ] Filtros se colapsan correctamente.
```

## 16.3 POS

```txt
[ ] Desktop 1366px.
[ ] Ventana reducida.
[ ] Modal cobro no se corta.
[ ] Botones principales siguen visibles.
```

---

# 17. QA Performance visual

```txt
[ ] POS no tarda en volver a nueva venta.
[ ] Modal de cobro abre rápido.
[ ] Portal público carga en móvil sin bloqueo visible.
[ ] Tablas Manager paginan.
[ ] Exportaciones pesadas no congelan UI.
[ ] Polling no satura navegador.
```

---

# 18. QA Smoke final

Antes de demo:

```txt
[ ] Venta efectivo sin factura.
[ ] Venta efectivo con QR.
[ ] Venta tarjeta con QR.
[ ] Portal QR genera factura.
[ ] Factura muestra PDF/XML.
[ ] Global diaria se confirma.
[ ] Manual review muestra caso.
[ ] Cancelación wizard carga.
[ ] Conciliación sube archivo.
[ ] Pending_reference aparece.
[ ] Gerente exporta facturas.
[ ] Cajero no accede a Manager Billing.
```

---

# 19. Exit Criteria

El frontend billing puede considerarse listo para integración si:

```txt
[ ] Flujos POS principales pasan.
[ ] Portal público pasa mobile-first.
[ ] Manager Billing pasa permisos.
[ ] Conciliación pasa flujo básico.
[ ] Tickets imprimibles pasan QA visual.
[ ] Exportaciones pasan flujo async.
[ ] Estados de error están cubiertos.
[ ] No hay acciones fiscales críticas visibles para roles incorrectos.
[ ] No se muestra información técnica sensible.
```

---

## 20. Cierre del paquete frontend billing

Con este documento, el paquete:

```txt
docs/frontend/billing/
```

queda completo para V0.1 con nueve documentos:

```txt
billing-frontend-handoff-index-v0.1.md
billing-pos-fiscal-flow-v0.1.md
billing-public-autofactura-portal-v0.1.md
billing-manager-ui-spec-v0.1.md
billing-reconciliation-ui-spec-v0.1.md
billing-roles-permissions-v0.1.md
billing-ticket-templates-v0.1.md
billing-reporting-exports-v0.1.md
billing-frontend-qa-checklist-v0.1.md
```
