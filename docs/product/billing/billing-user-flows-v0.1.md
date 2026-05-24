# Tortilla Plus — Billing User Flows V0.1

## 1. Propósito

Este documento describe los flujos de usuario del módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

No define base de datos, endpoints, componentes ni diseño visual detallado.

Define cómo deben ocurrir los procesos desde la perspectiva operativa de:

```txt
Cajero
Supervisor
Gerente
Cliente final
```

Ubicación recomendada:

```txt
docs/product/billing/billing-user-flows-v0.1.md
```

---

## 2. Roles involucrados

Roles oficiales V1:

```txt
Cajero
Supervisor
Gerente
Cliente final
```

Nota:

```txt
Cliente final no es un rol interno del sistema.
Solo interactúa con el portal público de autofactura.
```

No agregar roles internos adicionales en V1.

---

## 3. Flujo general del módulo fiscal

```txt
1. Se realiza una venta en POS.
2. El método de pago define la intención fiscal.
3. El sistema genera ticket simple o ticket QR.
4. Si hay QR, el cliente puede autofacturar.
5. Si el cliente no factura dentro del mes, la venta pasa a global.
6. El gerente confirma globales.
7. Si hay errores fiscales, el gerente resuelve manual review.
8. Si hay pagos con tarjeta, supervisor/gerente concilian pagos.
9. El gerente puede exportar información fiscal.
```

---

# 4. Flujo POS — Efectivo sin factura

## Actor principal

```txt
Cajero
```

## Objetivo

Registrar una venta rápida en efectivo que no requiere factura individual.

## Flujo

```txt
1. Cajero captura productos.
2. Cajero abre modal de cobro.
3. Cajero selecciona Efectivo.
4. POS pregunta: ¿Requiere ticket para facturar?
5. Cajero selecciona No.
6. Cajero confirma cobro.
7. Sistema registra venta.
8. Venta queda elegible para global diaria.
9. Ticket simple queda opcional.
10. POS vuelve a nueva venta.
```

## Resultado

```txt
venta completada
sin QR
elegible para global diaria
```

## Excepciones

```txt
si falla impresión, venta no se cancela
si cajero cancela antes de cobrar, no se registra venta
```

---

# 5. Flujo POS — Efectivo con factura

## Actor principal

```txt
Cajero
```

## Objetivo

Registrar una venta en efectivo donde el cliente solicita factura.

## Flujo

```txt
1. Cajero captura productos.
2. Cajero abre modal de cobro.
3. Cajero selecciona Efectivo.
4. POS pregunta: ¿Requiere ticket para facturar?
5. Cajero selecciona Sí.
6. Cajero confirma cobro.
7. Sistema registra venta.
8. Sistema genera QR de autofactura.
9. POS imprime ticket QR automáticamente.
10. POS vuelve a nueva venta.
```

## Resultado

```txt
venta completada
ticket QR impreso
estado pending_customer_invoice
```

## Excepciones

```txt
si falla impresora, venta queda registrada
si falla generación QR, backend debe devolver incidencia fiscal
```

---

# 6. Flujo POS — Tarjeta con referencia

## Actor principal

```txt
Cajero
```

## Objetivo

Registrar una venta con tarjeta con trazabilidad para autofactura y conciliación.

## Flujo

```txt
1. Cajero captura productos.
2. Cajero abre modal de cobro.
3. Cajero selecciona Tarjeta.
4. POS solicita referencia/autorización.
5. Cajero cobra en terminal externa.
6. Cajero captura referencia/autorización.
7. Cajero confirma cobro.
8. Sistema registra venta.
9. Sistema genera ticket QR automáticamente.
10. POS imprime ticket QR.
11. Venta queda disponible para autofactura.
12. Venta queda lista para conciliación.
```

## Resultado

```txt
venta completada
ticket QR impreso
referencia capturada
conciliación preparada
```

---

# 7. Flujo POS — Tarjeta sin referencia

## Actor principal

```txt
Cajero
```

## Objetivo

Permitir continuidad operativa cuando no se tiene referencia de terminal, sin perder trazabilidad.

## Flujo

```txt
1. Cajero selecciona Tarjeta.
2. Cajero no captura referencia.
3. POS permite continuar.
4. POS muestra advertencia no bloqueante.
5. Sistema registra venta.
6. Sistema genera ticket QR.
7. Venta queda marcada como pending_reference.
8. La incidencia aparece para Supervisor/Gerente.
```

## Resultado

```txt
venta completada
ticket QR impreso
pending_reference
```

## Regla importante

```txt
no bloquear fila
sí generar incidencia
sí auditar
```

---

# 8. Flujo POS — Pago mixto con tarjeta

## Actor principal

```txt
Cajero
```

## Objetivo

Registrar pago dividido donde una parte se paga con tarjeta.

## Flujo

```txt
1. Cajero captura productos.
2. Cajero selecciona pago mixto.
3. Cajero captura importes por método.
4. Si una parte incluye tarjeta, POS solicita referencia.
5. Cajero confirma cobro.
6. Sistema registra venta.
7. Sistema genera ticket QR automáticamente.
8. POS imprime ticket QR.
```

## Resultado

```txt
ticket QR
pending_customer_invoice
conciliación preparada
```

---

# 9. Flujo POS — Pago mixto sin tarjeta

## Actor principal

```txt
Cajero
```

## Objetivo

Registrar pago mixto sin tarjeta y clasificar fiscalmente la venta.

## Flujo

```txt
1. Cajero selecciona pago mixto.
2. Pago no incluye tarjeta.
3. POS pregunta si requiere ticket para facturar.
4. Si No, venta queda para global diaria.
5. Si Sí, sistema genera QR.
```

## Resultado posible A

```txt
ticket simple
eligible_for_daily_global
```

## Resultado posible B

```txt
ticket QR
pending_customer_invoice
```

---

# 10. Flujo Cliente — Autofactura QR

## Actor principal

```txt
Cliente final
```

## Objetivo

Generar factura desde el QR impreso en ticket.

## Flujo

```txt
1. Cliente escanea QR.
2. Portal público consulta ticket.
3. Portal muestra resumen de ticket.
4. Portal muestra formulario fiscal.
5. Cliente captura RFC, razón social, régimen, CP, uso CFDI y correo.
6. Cliente envía solicitud.
7. Sistema procesa intento inmediato.
8. Portal muestra procesamiento.
9. Portal hace polling.
10. Portal muestra factura generada.
11. Cliente descarga PDF.
12. Cliente puede descargar XML.
```

## Resultado

```txt
CFDI individual timbrado
ticket marcado como facturado
PDF/XML disponibles
```

---

# 11. Flujo Cliente — QR vencido

## Actor principal

```txt
Cliente final
```

## Objetivo

Informar que el ticket ya no puede autofacturarse automáticamente.

## Flujo

```txt
1. Cliente escanea QR vencido.
2. Portal consulta token.
3. Backend responde estado vencido.
4. Portal muestra pantalla informativa.
5. Portal muestra fecha límite.
6. Portal muestra contacto del negocio si existe.
```

## Resultado

```txt
no se permite autofactura automática
cliente recibe información clara
```

## No permitido

```txt
reactivar QR automáticamente
generar factura individual fuera de vigencia desde portal
```

---

# 12. Flujo Cliente — Ticket ya facturado

## Actor principal

```txt
Cliente final
```

## Objetivo

Permitir descarga si el ticket ya fue facturado.

## Flujo

```txt
1. Cliente abre QR ya usado.
2. Portal muestra estado facturado.
3. Portal no muestra formulario fiscal.
4. Portal muestra PDF/XML si están disponibles.
```

## Resultado

```txt
cliente puede recuperar documentos
no se genera nueva factura
```

---

# 13. Flujo Cliente — Factura en revisión

## Actor principal

```txt
Cliente final
```

## Objetivo

Informar que la solicitud no pudo resolverse automáticamente.

## Flujo

```txt
1. Cliente envía datos fiscales.
2. Sistema intenta timbrar.
3. Fallan reintentos o provider requiere revisión.
4. Portal muestra estado en revisión.
5. Cliente conserva ticket.
6. Gerente resuelve desde Manager.
```

## Resultado

```txt
requires_manual_review
cliente informado sin lenguaje técnico
```

---

# 14. Flujo Gerente — Confirmar global diaria

## Actor principal

```txt
Gerente
```

## Objetivo

Timbrar la factura global diaria de ventas no facturadas individualmente.

## Flujo

```txt
1. Sistema prepara borrador global automáticamente.
2. Gerente entra a Manager Billing.
3. Gerente abre Global Diaria.
4. Sistema muestra resumen.
5. Gerente revisa ventas incluidas.
6. Gerente revisa ventas excluidas.
7. Gerente revisa warnings.
8. Gerente confirma timbrado.
9. Sistema timbra global.
10. Sistema registra auditoría.
11. Gerente puede descargar XML/PDF.
```

## Resultado

```txt
global diaria timbrada
ventas incluidas marcadas como globalizadas
```

## No permitido

```txt
timbrado silencioso sin confirmación
confirmación por Cajero
confirmación por Supervisor
```

---

# 15. Flujo Gerente — Confirmar global rezagados

## Actor principal

```txt
Gerente
```

## Objetivo

Timbrar ventas con QR vencido que no fueron facturadas por el cliente.

## Flujo

```txt
1. Sistema detecta tickets QR vencidos.
2. Sistema prepara lote de rezagados.
3. Gerente abre Global Rezagados.
4. Gerente revisa periodo.
5. Gerente revisa tickets incluidos.
6. Gerente revisa totales.
7. Gerente confirma timbrado.
8. Sistema timbra global.
9. Sistema registra auditoría.
```

## Resultado

```txt
global rezagados timbrada
tickets vencidos quedan globalizados
```

---

# 16. Flujo Gerente — Manual Review

## Actor principal

```txt
Gerente
```

## Objetivo

Resolver solicitudes fiscales que fallaron automáticamente.

## Flujo

```txt
1. Gerente abre Manual Review.
2. Sistema muestra casos pendientes.
3. Gerente selecciona caso.
4. Gerente revisa error resumido.
5. Gerente puede corregir correo, uso CFDI o CP.
6. Gerente reintenta timbrado.
7. Sistema procesa.
8. Caso cambia a resuelto o permanece en revisión.
```

## Resultado posible A

```txt
factura timbrada
caso resuelto
```

## Resultado posible B

```txt
sigue en revisión
requiere acción posterior
```

## No permitido

```txt
editar RFC directamente
editar razón social directamente
resolver desde POS
```

---

# 17. Flujo Gerente — Cancelar CFDI

## Actor principal

```txt
Gerente
```

## Objetivo

Solicitar cancelación de un CFDI de forma guiada y auditada.

## Flujo

```txt
1. Gerente busca factura.
2. Gerente abre detalle.
3. Gerente inicia cancelación.
4. Sistema muestra warning fuerte.
5. Gerente selecciona motivo SAT.
6. Gerente captura motivo interno.
7. Gerente agrega link de evidencia opcional.
8. Gerente confirma cancelación.
9. Sistema procesa cancelación.
10. Sistema registra auditoría.
```

## Resultado

```txt
cancelación solicitada/procesada
auditoría completa
```

## No permitido

```txt
cancelación por Cajero
cancelación por Supervisor
cancelación sin motivo SAT
cancelación sin motivo interno
```

---

# 18. Flujo Supervisor — Resolver pending_reference

## Actor principal

```txt
Supervisor
```

## Objetivo

Completar referencias faltantes de ventas con tarjeta.

## Flujo

```txt
1. Supervisor abre Conciliación.
2. Sistema muestra incidencia pending_reference.
3. Supervisor abre detalle.
4. Supervisor revisa venta POS.
5. Supervisor captura referencia faltante o relaciona movimiento bancario.
6. Sistema actualiza conciliación.
7. Incidencia queda resuelta.
8. Sistema registra auditoría.
```

## Resultado

```txt
venta tarjeta queda conciliable
incidencia resuelta
```

---

# 19. Flujo Supervisor/Gerente — Cargar estado de cuenta

## Actor principal

```txt
Supervisor o Gerente
```

## Objetivo

Importar movimientos para conciliación bancaria.

## Flujo

```txt
1. Usuario abre Conciliación.
2. Selecciona sucursal.
3. Selecciona proveedor.
4. Sube CSV/XLSX.
5. Sistema valida archivo.
6. Sistema procesa movimientos.
7. Sistema genera matches por score.
8. Sistema genera incidencias para casos no claros.
```

## Resultado

```txt
importación procesada
matches generados
incidencias abiertas si aplica
```

---

# 20. Flujo Supervisor/Gerente — Confirmar match de conciliación

## Actor principal

```txt
Supervisor o Gerente
```

## Objetivo

Confirmar relación entre movimiento bancario y venta POS.

## Flujo

```txt
1. Usuario abre revisión manual.
2. Selecciona movimiento bancario.
3. Sistema muestra candidatos POS.
4. Usuario revisa score y datos.
5. Usuario confirma match.
6. Sistema actualiza estado.
7. Sistema registra auditoría.
```

## Resultado

```txt
movimiento conciliado
venta relacionada a depósito/movimiento
```

---

# 21. Flujo Gerente — Configurar facturación

## Actor principal

```txt
Gerente
```

## Objetivo

Activar facturación fiscal para el negocio.

## Flujo

```txt
1. Gerente abre Configuración Fiscal.
2. Captura RFC.
3. Captura razón social.
4. Captura régimen fiscal.
5. Captura CP fiscal.
6. Carga/valida CSD según integración.
7. Sistema valida certificados.
8. Sistema valida conexión provider.
9. Sistema ejecuta timbrado de prueba.
10. Si todo pasa, facturación queda lista/activa.
```

## Resultado

```txt
facturación activa
```

## Si falla

```txt
estado de error claro
facturación no activa
```

---

# 22. Flujo Gerente — Exportar información fiscal

## Actor principal

```txt
Gerente
```

## Objetivo

Generar archivos para revisión fiscal o contable.

## Flujo

```txt
1. Gerente abre Exportaciones.
2. Selecciona tipo de exportación.
3. Selecciona periodo.
4. Selecciona sucursal.
5. Selecciona formato.
6. Solicita exportación.
7. Sistema crea job.
8. Gerente espera estado ready.
9. Gerente descarga archivo.
10. Sistema registra auditoría.
```

## Tipos

```txt
facturas emitidas
XML
global diaria
global rezagados
ventas fiscales
manual review
cancelaciones
conciliación
incidencias
```

---

# 23. Flujo de errores provider

## Actor principal

```txt
Sistema
Gerente
Cliente final
```

## Objetivo

Evitar que errores del proveedor fiscal rompan la operación.

## Flujo

```txt
1. Sistema intenta timbrar.
2. Provider falla o responde timeout.
3. Sistema programa retry.
4. Frontend muestra processing/retrying.
5. Si retry funciona, se marca stamped.
6. Si retries se agotan, pasa a manual review.
7. Gerente revisa.
```

## Resultado

```txt
la venta no se pierde
el cliente recibe estado claro
el gerente ve incidencia
```

---

# 24. Flujo de auditoría

## Actor principal

```txt
Sistema
```

## Objetivo

Registrar acciones fiscales sensibles.

## Acciones auditadas

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

## Datos mínimos

```txt
usuario
rol
acción
fecha/hora
entidad afectada
valor anterior
valor nuevo
sucursal
caja si aplica
```

---

# 25. Flujos fuera de alcance V1

No documentar ni implementar como flujos V1:

```txt
cliente con login fiscal
multi-RFC operativo
aprobación multinivel
contador como usuario interno
open banking automático
cancelación CFDI desde POS
devolución post-timbrado desde POS
subida de constancia fiscal por cliente
soporte chat dentro de portal
```

---

# 26. Definition of Done

Este documento queda completo si cubre:

```txt
[ ] flujo POS efectivo sin factura
[ ] flujo POS efectivo con factura
[ ] flujo POS tarjeta
[ ] flujo POS mixto
[ ] flujo autofactura cliente
[ ] flujo QR vencido
[ ] flujo ticket facturado
[ ] flujo global diaria
[ ] flujo global rezagados
[ ] flujo manual review
[ ] flujo cancelación CFDI
[ ] flujo conciliación
[ ] flujo configuración fiscal
[ ] flujo exportaciones
[ ] flujos fuera de alcance
```

---

## 27. Siguiente documento

Después de este documento, generar:

```txt
billing-decision-log-v0.1.md
```
