# Tortilla Plus — Billing Business Rules V0.1

## 1. Propósito

Este documento consolida las reglas de negocio del módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

No define pantallas, componentes, base de datos ni endpoints.

Define únicamente:

```txt
qué debe hacer el sistema
qué reglas fiscales se respetan
qué decisiones de negocio quedan congeladas
qué casos no se permiten
qué roles pueden operar acciones fiscales
```

Ubicación recomendada:

```txt
docs/product/billing/billing-business-rules-v0.1.md
```

---

## 2. Alcance del módulo fiscal

El módulo fiscal cubre tres necesidades distintas:

```txt
1. La tortillería factura sus ventas al cliente final.
2. La tortillería genera facturas globales.
3. Tortilla Plus, como SaaS, factura la licencia al negocio.
```

Este documento se enfoca principalmente en:

```txt
la operación fiscal de la tortillería
```

La facturación SaaS de Tortilla Plus debe mantenerse como dominio separado.

---

## 3. Motor fiscal inicial

La integración fiscal inicial será mediante:

```txt
Facturapi
```

Decisión V1:

```txt
un RFC emisor por negocio
```

Arquitectura futura:

```txt
preparada para multi-RFC
```

No implementar multi-RFC operativo en V1.

---

## 4. Principio operativo general

La facturación no debe romper la velocidad del POS.

Regla:

```txt
POS rápido
fiscalización automatizada
gerente controla excepciones
```

El cajero no debe resolver problemas fiscales complejos.

---

## 5. Tipos de factura del sistema

El sistema contempla tres tipos de factura:

```txt
factura individual de cliente final
factura global de la tortillería
factura SaaS de Tortilla Plus al negocio
```

---

## 6. Factura individual de cliente final

Se genera cuando un cliente solicita factura de su compra.

En V1, el modelo oficial es:

```txt
autofactura por QR
```

El cliente escanea el QR del ticket y captura sus datos fiscales.

---

## 7. Factura global

La factura global cubre ventas que no fueron facturadas individualmente.

Tipos de global:

```txt
global diaria
global rezagados
```

---

## 8. Factura SaaS

Tortilla Plus debe poder facturar al negocio por:

```txt
licencia mensual
licencia anual
POS activos
servicios adicionales futuros
```

Esta lógica no debe mezclarse con la facturación operativa de la tortillería.

---

## 9. Reglas por método de pago

## 9.1 Efectivo

Si la venta es en efectivo, el POS pregunta:

```txt
¿Requiere ticket para facturar?
```

Si el cliente responde No:

```txt
la venta queda disponible para global diaria
```

Si responde Sí:

```txt
se genera ticket QR de autofactura
```

---

## 9.2 Tarjeta

Si la venta incluye tarjeta:

```txt
se genera ticket QR automáticamente
```

No se pregunta al cliente si quiere factura.

Motivo de negocio:

```txt
la venta queda respaldada por movimiento bancario
el cliente puede solicitar factura dentro del mes de compra
```

---

## 9.3 Pago mixto con tarjeta

Si el pago mixto incluye tarjeta:

```txt
se genera ticket QR automáticamente
```

Aplica aunque una parte haya sido pagada en efectivo.

---

## 9.4 Pago mixto sin tarjeta

Si el pago mixto no incluye tarjeta:

```txt
se pregunta si requiere ticket para facturar
```

Ejemplo:

```txt
efectivo + fiado
```

---

## 9.5 Fiado / crédito

En V1, el fiado/crédito debe quedar con trazabilidad fiscal.

Regla recomendada:

```txt
generar QR o mantener estado fiscal pendiente asociado al cliente
```

No permitir que el fiado quede fiscalmente ambiguo.

---

## 10. Ticket simple

El ticket simple se usa cuando:

```txt
venta en efectivo sin factura
venta mixta sin tarjeta y sin factura
```

Características:

```txt
no incluye QR fiscal
puede imprimirse opcionalmente
la venta queda disponible para global diaria
```

---

## 11. Ticket QR de autofactura

El ticket QR se usa cuando:

```txt
cliente solicita factura
venta incluye tarjeta
venta requiere trazabilidad fiscal individual
```

Características:

```txt
incluye QR
incluye URL de autofactura
incluye fecha límite
se imprime automáticamente
```

---

## 12. Vigencia del QR

La vigencia del QR es:

```txt
hasta fin del mes natural de la compra
```

Ejemplo:

```txt
compra: 15/05/2026
vigencia: 31/05/2026 23:59:59
```

Después de vencer:

```txt
el cliente ya no puede autofacturar automáticamente
```

---

## 13. QR vencido

Cuando el QR vence:

```txt
no se reactiva automáticamente
no se genera factura individual automática
la venta pasa a flujo de global rezagados según regla fiscal del negocio
```

El portal público debe mostrar:

```txt
ticket vencido
fecha límite
contacto del negocio
```

---

## 14. Ticket ya facturado

Si el ticket ya fue facturado:

```txt
no puede facturarse de nuevo
```

Puede reimprimirse como comprobante, pero debe marcarse:

```txt
FACTURA YA EMITIDA
```

---

## 15. Ticket en revisión

Si el intento de facturación falla y requiere intervención:

```txt
requires_manual_review
```

El cliente ve:

```txt
factura en revisión
conserva este ticket
```

El gerente resuelve desde Manager.

---

## 16. Estados fiscales principales

Estados de negocio mínimos:

```txt
no_invoice
eligible_for_daily_global
pending_customer_invoice
processing_invoice
customer_invoiced
requires_manual_review
expired
included_in_global
cancel_requested
cancelled
```

---

## 17. Global diaria

La global diaria se prepara automáticamente.

Pero la regla oficial es:

```txt
preparación automática
confirmación del gerente obligatoria
```

El sistema no debe timbrar global diaria de forma silenciosa en V1.

---

## 18. Confirmación de global diaria

Antes de confirmar, el gerente debe revisar:

```txt
fecha
ventas incluidas
ventas excluidas
subtotal
IVA
total
tickets QR pendientes
tickets QR vencidos
warnings
```

Al confirmar:

```txt
se timbra la global
se genera auditoría
```

---

## 19. Global rezagados

La global rezagados cubre tickets QR vencidos que no fueron facturados por el cliente.

Regla:

```txt
preparación automática
confirmación del gerente obligatoria
```

---

## 20. Ventas excluidas de global

Una venta no entra a global diaria si:

```txt
tiene QR activo para autofactura
ya fue facturada individualmente
está en manual review
está cancelada
tiene inconsistencia fiscal
```

---

## 21. Cancelación CFDI

Solo puede cancelar CFDI:

```txt
Gerente
```

No puede cancelar:

```txt
Cajero
Supervisor
```

---

## 22. Regla de cancelación

Para cancelar CFDI se requiere:

```txt
motivo SAT obligatorio
motivo interno obligatorio
auditoría obligatoria
```

Puede incluir:

```txt
link de evidencia opcional
```

El sistema no almacena archivos de evidencia en V1.

---

## 23. Devoluciones

Regla congelada:

```txt
si ya se timbró, no hay devoluciones desde POS
```

Cualquier caso posterior requiere proceso administrativo/fiscal fuera del flujo rápido de venta.

---

## 24. Manual Review

Manual Review se usa para casos que no pueden resolverse automáticamente.

Ejemplos:

```txt
error de provider
timeout
retries agotados
datos fiscales inválidos
estado inconsistente
```

---

## 25. Correcciones permitidas en Manual Review

El gerente puede corregir:

```txt
correo
uso CFDI
código postal
```

No puede corregir directamente:

```txt
RFC
razón social
```

Cambiar RFC o razón social implica:

```txt
nueva solicitud fiscal
o cancelación formal si ya existe CFDI
```

---

## 26. Reintentos fiscales

Los reintentos fiscales siguen política:

```txt
intento inmediato
fallback a cola
máximo 5 intentos
backoff exponencial
```

Si se agotan:

```txt
requires_manual_review
```

---

## 27. Archivos fiscales

Regla de almacenamiento:

```txt
guardar XML + metadata
PDF bajo demanda
```

El XML debe mantenerse persistente.

El PDF no necesita almacenarse permanentemente si puede regenerarse.

---

## 28. Conciliación bancaria

La conciliación bancaria V1 opera con:

```txt
carga manual CSV/XLSX
```

Providers iniciales:

```txt
BBVA
MercadoPago
Clip
```

Arquitectura futura:

```txt
preparada para APIs bancarias/proveedor
```

---

## 29. Matching conciliación

El matching usa:

```txt
score/confianza
```

Factores:

```txt
monto
referencia
proximidad horaria
terminal/proveedor
sucursal
```

---

## 30. Pending reference

Si una venta tarjeta se cierra sin referencia:

```txt
la venta se permite
pero queda como pending_reference
```

Debe aparecer en:

```txt
dashboard gerente
conciliación
cierre de caja
auditoría
```

---

## 31. Incidencias conciliación

Tipos V1:

```txt
unmatched
duplicate_candidate
pending_reference
possible_cash_error
manual_review_required
```

No deben bloquear operación diaria por default.

Deben quedar visibles para Supervisor/Gerente.

---

## 32. Roles oficiales V1

Solo existen tres roles:

```txt
Cajero
Supervisor
Gerente
```

No agregar roles nuevos para V1.

---

## 33. Cajero

Puede:

```txt
cobrar ventas
generar tickets
buscar tickets recientes
reimprimir tickets recientes
capturar referencia de tarjeta
```

No puede:

```txt
cancelar CFDI
confirmar globales
resolver manual review
configurar fiscal
conciliar pagos
exportar reportes fiscales
```

---

## 34. Supervisor

Puede:

```txt
apoyar operación
revisar conciliación
resolver pending_reference
confirmar/rechazar matches
agregar notas operativas
```

No puede:

```txt
cancelar CFDI
confirmar globales
resolver manual review fiscal
configurar RFC/CSD
exportar reportes fiscales
```

---

## 35. Gerente

Puede:

```txt
control fiscal completo
confirmar globales
cancelar CFDI
resolver manual review
configurar facturación
exportar reportes
gestionar conciliación
```

---

## 36. Configuración fiscal

Para activar facturación se requiere validación completa.

Checklist:

```txt
RFC válido
razón social válida
CSD válido
certificados vigentes
conexión Facturapi OK
credenciales OK
timbrado prueba exitoso
```

Solo entonces:

```txt
facturación activa
```

---

## 37. Portal público autofactura

El portal público debe permitir:

```txt
ver resumen del ticket
capturar datos fiscales
generar factura
descargar PDF
descargar XML
ver estado vencido
ver estado en revisión
```

No debe requerir login.

---

## 38. Datos fiscales recordados

El portal puede recordar datos localmente:

```txt
localStorage
```

Solo si el usuario activa:

```txt
Recordar mis datos en este dispositivo
```

---

## 39. Validación de datos fiscales

Frontend valida de forma moderada.

Backend/provider valida finalmente.

Validaciones frontend:

```txt
RFC formato
homoclave
longitud
CP 5 dígitos
correo válido
campos obligatorios
```

---

## 40. Exportaciones fiscales

Solo Gerente puede exportar.

Exportaciones V1:

```txt
facturas emitidas
XML facturas
global diaria
global rezagados
ventas fiscales
autofacturas pendientes
manual review
cancelaciones CFDI
conciliación
incidencias conciliación
```

Formatos:

```txt
CSV
XLSX
ZIP XML
PDF individual bajo demanda
```

---

## 41. Auditoría obligatoria

Deben auditarse:

```txt
confirmar global diaria
confirmar global rezagados
cancelar CFDI
resolver manual review
editar configuración fiscal
validar configuración fiscal
subir archivo conciliación
confirmar match
ignorar incidencia
resolver pending_reference
reimprimir ticket QR
```

---

## 42. Reglas no negociables V1

```txt
El POS no timbra CFDI directamente.
El POS no cancela CFDI.
El POS no confirma globales.
El Cajero no opera configuración fiscal.
El Supervisor no cancela CFDI.
El Gerente confirma globales.
El QR vence al fin de mes natural.
XML se guarda.
PDF se genera bajo demanda.
V1 opera un RFC por negocio.
Arquitectura queda preparada para multi-RFC futuro.
```

---

## 43. Fuera de alcance V1

No implementar:

```txt
multi-RFC operativo
open banking automático
portal de cliente con login
historial fiscal del cliente
subida de constancia fiscal
roles personalizados
contador como rol
devoluciones post-timbrado desde POS
PDF masivo obligatorio
pólizas contables
contabilidad electrónica
```

---

## 44. Relación con otros documentos

Este documento resume reglas de negocio.

Detalles técnicos:

```txt
docs/backend/billing/
```

Detalles frontend:

```txt
docs/frontend/billing/
```

Flujos narrativos:

```txt
docs/product/billing/billing-user-flows-v0.1.md
```

Decisiones congeladas:

```txt
docs/product/billing/billing-decision-log-v0.1.md
```

---

## 45. Definition of Done

Este documento queda completo si cubre:

```txt
[ ] reglas de factura individual
[ ] reglas de factura global
[ ] reglas de QR
[ ] reglas por método de pago
[ ] reglas de cancelación
[ ] reglas de manual review
[ ] reglas de conciliación
[ ] roles oficiales V1
[ ] reglas de configuración fiscal
[ ] exportaciones
[ ] fuera de alcance
```
