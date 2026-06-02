# Tortilla Plus — Modelo Comercial V1

## Estado

Documento base para salida a clientes piloto.

Este archivo congela el modelo comercial inicial de Tortilla Plus para operación piloto con tortillerías locales. Debe usarse como fuente de verdad para decisiones de pricing, planes, límites, addons, setup, facturación y reglas comerciales derivadas.

## Objetivo

Definir un esquema comercial prudente para entrar al mercado sin sobreprecio frente a competidores genéricos, pero conservando margen por la especialización vertical de Tortilla Plus.

Tortilla Plus no compite como POS genérico. Compite como POS especializado para tortillerías con:

- venta de tortilla por kilo;
- venta por monto: “N pesos de tortilla”;
- venta de masa por kilo o monto;
- paquete de tortilla de 800 g;
- productos retail cambiantes;
- caja;
- clientes frecuentes;
- crédito/fiado;
- producción;
- terminal vinculada;
- facturación CFDI según plan;
- rutas de reparto según plan.

---

# Decisión de precios piloto

Los precios piloto quedan congelados así:

```txt
Plan 1 — Mostrador:  $299 MXN + IVA / mes
Plan 2 — Operativo:  $599 MXN + IVA / mes
Plan 3 — Comercial:  $999 MXN + IVA / mes
```

Estos precios aplican para clientes piloto iniciales.

## Condición comercial de piloto

```txt
Precios piloto válidos para primeros 10 clientes activos o durante los primeros 6 meses de comercialización, lo que ocurra primero.
```

Después de ese punto se debe revisar precio, soporte, costos reales, incidencias y margen.

Los clientes piloto pueden conservar precio preferencial si se decide como estrategia comercial, pero debe quedar registrado por organización en sus `subscription_items`.

---

# Plan 1 — Mostrador

## Precio

```txt
$299 MXN + IVA / mes
```

## Cliente objetivo

Tortillería local pequeña con una sola caja y operación básica de mostrador.

## Incluye

```txt
1 organización
1 sucursal
1 POS/caja activa
1 terminal vinculada
ventas de tortilla por kilo
ventas de tortilla por monto
ventas de masa por kilo
ventas de masa por monto
paquete tortilla 800 g
productos retail básicos
control de caja
inventario básico
clientes básicos
reportes básicos
usuarios operativos mínimos
```

## No incluye

```txt
facturación CFDI
rutas de reparto
multi-sucursal
reportes avanzados
conciliación avanzada
soporte prioritario
POS adicionales incluidos
terminales adicionales incluidas
```

## Límites técnicos

```txt
included_branches = 1
included_pos = 1
included_terminals = 1
included_cfdi = 0
routes_enabled = false
billing_cfdi_enabled = false
advanced_reports_enabled = false
```

---

# Plan 2 — Operativo

## Precio

```txt
$599 MXN + IVA / mes
```

## Cliente objetivo

Tortillería con operación más seria: clientes frecuentes, crédito/fiado, producción y necesidad básica de facturación.

## Incluye

```txt
1 organización
1 sucursal
2 POS/cajas activas
2 terminales vinculadas
ventas completas de tortilla y masa
paquete tortilla 800 g
productos retail
control de caja
inventario
producción
clientes con crédito/fiado
usuarios por rol
reportes operativos
facturación CFDI hasta 50 timbrados al mes
facturas globales diarias incluidas dentro del límite de 50
```

## CFDI incluidos

```txt
included_cfdi = 50 timbrados / mes
```

Nota operativa:

Si se genera factura global diaria, aproximadamente 30 o 31 timbrados mensuales pueden consumirse en facturas globales. El resto queda disponible para facturas individuales.

## Límites técnicos

```txt
included_branches = 1
included_pos = 2
included_terminals = 2
included_cfdi = 50
routes_enabled = false
billing_cfdi_enabled = true
advanced_reports_enabled = false
```

---

# Plan 3 — Comercial

## Precio

```txt
$999 MXN + IVA / mes
```

## Cliente objetivo

Tortillería con mayor operación: más cajas, rutas, crédito, reportes y facturación frecuente.

## Incluye

```txt
1 organización
hasta 2 sucursales
3 POS/cajas activas
3 terminales vinculadas
ventas completas de tortilla y masa
paquete tortilla 800 g
productos retail
control de caja
inventario
producción
clientes con crédito/fiado
usuarios por rol
rutas de reparto
reportes avanzados
facturación CFDI hasta 100 timbrados al mes
facturas globales diarias incluidas dentro del límite de 100
soporte prioritario básico
```

## CFDI incluidos

```txt
included_cfdi = 100 timbrados / mes
```

Nota operativa:

Si se genera factura global diaria, aproximadamente 30 o 31 timbrados mensuales pueden consumirse en facturas globales. El resto queda disponible para facturas individuales.

## Límites técnicos

```txt
included_branches = 2
included_pos = 3
included_terminals = 3
included_cfdi = 100
routes_enabled = true
billing_cfdi_enabled = true
advanced_reports_enabled = true
```

---

# Extras y addons

Los extras deben cobrarse como `subscription_items`, no como campos sueltos.

## POS adicional

```txt
$99 – $149 MXN + IVA / POS adicional / mes
```

Precio inicial recomendado para piloto:

```txt
$99 MXN + IVA / POS adicional / mes
```

Puede subir a $149 MXN + IVA cuando el producto esté más estable.

## Terminal adicional vinculada

```txt
$79 – $99 MXN + IVA / terminal adicional / mes
```

Precio inicial recomendado:

```txt
$79 MXN + IVA / terminal adicional / mes
```

Importante:

La terminal incluida significa integración lógica/vinculación al POS. No incluye hardware, comisiones del procesador, retenciones ni costos bancarios.

Texto comercial obligatorio:

```txt
Incluye vinculación y operación de terminal compatible. No incluye costo del hardware, comisiones del procesador ni retenciones aplicables.
```

## Sucursal adicional

```txt
$149 – $199 MXN + IVA / sucursal adicional / mes
```

Precio inicial recomendado:

```txt
$149 MXN + IVA / sucursal adicional / mes
```

## CFDI adicional

Regla definida:

```txt
CFDI adicional = costo vigente Facturapi + $5 MXN de ganancia
```

Con el costo de referencia actual usado para piloto:

```txt
Costo Facturapi: $0.60 MXN IVA incluido
Ganancia Tortilla Plus: $5.00 MXN
Precio CFDI adicional: $5.60 MXN IVA incluido
```

Precio comercial recomendado por simplicidad:

```txt
$6.00 MXN IVA incluido / CFDI adicional
```

El sistema debe poder actualizar este costo si Facturapi cambia su precio.

## Setup inicial

Debe cobrarse para recuperar tiempo de configuración.

```txt
$1,000 – $1,500 MXN + IVA
```

Precio piloto recomendado:

```txt
$1,000 MXN + IVA
```

Incluye:

- alta de organización;
- configuración de sucursal;
- configuración de productos base;
- configuración de precios;
- configuración de usuarios;
- configuración inicial de POS;
- vinculación básica de terminal compatible;
- capacitación inicial;
- prueba de venta y caja.

## Capacitación extra

```txt
$500 MXN + IVA / sesión
```

## Soporte prioritario

```txt
$399 MXN + IVA / mes
```

No incluir soporte ilimitado en los planes piloto.

---

# Tabla comercial resumen

| Plan | Precio mensual | Sucursales incluidas | POS incluidos | Terminales incluidas | CFDI incluidos | Rutas | Uso recomendado |
|---|---:|---:|---:|---:|---:|---:|---|
| Mostrador | $299 + IVA | 1 | 1 | 1 | 0 | No | Tortillería chica |
| Operativo | $599 + IVA | 1 | 2 | 2 | 50 | No | Tortillería con crédito/facturación |
| Comercial | $999 + IVA | 2 | 3 | 3 | 100 | Sí | Tortillería con rutas/más operación |

---

# Tabla de extras resumen

| Extra | Precio piloto recomendado |
|---|---:|
| POS adicional | $99 + IVA / mes |
| Terminal adicional | $79 + IVA / mes |
| Sucursal adicional | $149 + IVA / mes |
| CFDI adicional | $6 IVA incluido |
| Setup inicial | $1,000 + IVA |
| Capacitación extra | $500 + IVA / sesión |
| Soporte prioritario | $399 + IVA / mes |

---

# Reglas de facturación CFDI para clientes

## Plan 1

No incluye facturación CFDI.

Si el cliente requiere facturación, debe migrar a Plan 2 o contratar addon si se habilita en una fase posterior.

## Plan 2

Incluye hasta 50 timbrados mensuales.

Las facturas globales diarias consumen el mismo contador de CFDI incluidos.

Ejemplo:

```txt
30 facturas globales en el mes
20 facturas individuales restantes dentro del plan
```

## Plan 3

Incluye hasta 100 timbrados mensuales.

Las facturas globales diarias consumen el mismo contador de CFDI incluidos.

Ejemplo:

```txt
30 facturas globales en el mes
70 facturas individuales restantes dentro del plan
```

## Excedentes

Todo CFDI por encima del límite mensual se cobra a:

```txt
$6 MXN IVA incluido / CFDI adicional
```

Regla interna:

```txt
precio_excedente_cfdi = costo_facturapi_actual + 5 MXN de ganancia
```

---

# Reglas de terminales

Cada plan incluye terminales vinculadas según límite.

```txt
Plan 1: 1 terminal
Plan 2: 2 terminales
Plan 3: 3 terminales
```

La terminal incluida no significa que Tortilla Plus entrega hardware.

## Texto obligatorio para contratos y ventas

```txt
La suscripción incluye vinculación y operación de terminal compatible dentro del sistema. El hardware, comisiones, retenciones y condiciones comerciales de Mercado Pago, Clip u otro procesador son responsabilidad del cliente.
```

---

# Reglas de precio piloto

## Congelamiento temporal

```txt
Los precios piloto aplican para los primeros 10 clientes activos o los primeros 6 meses de comercialización.
```

## Revisión obligatoria

Al llegar a 10 clientes activos o 6 meses, se debe revisar:

- horas de soporte por cliente;
- incidencias por cliente;
- costo de infraestructura;
- costo de facturación CFDI;
- uso promedio de POS;
- uso promedio de terminales;
- número de CFDI generados;
- margen bruto;
- cancelaciones;
- facilidad de onboarding.

## Política para clientes piloto

Se puede mantener precio preferencial a clientes piloto si:

- pagan a tiempo;
- aceptan dar feedback;
- aceptan posibles ajustes de flujo;
- no exigen soporte fuera de alcance;
- no requieren personalización no contemplada.

Cualquier precio preferencial debe quedar guardado como snapshot en `subscription_items`.

---

# Modelo financiero base

## Fórmula de ingreso mensual recurrente

```txt
MRR = suma de mensualidades sin IVA
```

No incluir IVA como ingreso.

## Fórmula de ingreso por cliente

```txt
monthly_revenue = base_plan + extras + overages
```

## Fórmula de costo directo estimado

```txt
COGS = infraestructura asignada + timbres CFDI + comisiones de cobro + soporte directo + backups/logs
```

## Fórmula de margen bruto

```txt
margen_bruto = (MRR - COGS) / MRR
```

## Meta de margen

```txt
margen bruto mínimo: 60%
margen bruto deseable: 70% – 80%
```

Si un cliente consume demasiadas horas de soporte, debe migrar de plan, contratar soporte prioritario o quedar fuera del perfil ideal.

---

# Escenarios de ingreso mensual con clientes mixtos

Supuesto de mezcla inicial local:

```txt
60% Plan 1
30% Plan 2
10% Plan 3
```

No considera setup, extras, CFDI excedentes ni soporte prioritario.

| Clientes | Mezcla estimada | MRR sin IVA |
|---:|---|---:|
| 5 | 3 Plan 1, 1 Plan 2, 1 Plan 3 | $2,495 |
| 10 | 6 Plan 1, 3 Plan 2, 1 Plan 3 | $4,585 |
| 15 | 9 Plan 1, 4 Plan 2, 2 Plan 3 | $7,069 |
| 20 | 12 Plan 1, 6 Plan 2, 2 Plan 3 | $9,174 |
| 30 | 18 Plan 1, 9 Plan 2, 3 Plan 3 | $13,759 |

Advertencia:

El servidor no será el mayor costo inicial. El mayor costo será soporte, onboarding y mantenimiento.

---

# Contabilidad y orden administrativo

## Regla principal

No mezclar IVA con ingreso.

Ejemplo:

```txt
Plan Operativo: $599 + IVA
IVA 16%: $95.84
Total cobrado: $694.84
Ingreso real: $599
IVA trasladado: $95.84
```

## Cuentas de ingreso sugeridas

```txt
Ingresos SaaS mensualidad
Ingresos setup/configuración
Ingresos soporte extra
Ingresos addons
Ingresos CFDI excedentes
Ingresos capacitación
```

## Costos directos sugeridos

```txt
Hosting
Base de datos
Backups
PAC/timbres CFDI
Correo transaccional
Comisiones de cobro
Soporte técnico externo
Monitoreo/logs
```

## Gastos operativos sugeridos

```txt
Contador
Dominio
Software/herramientas
Equipo de cómputo
Internet
Publicidad
Transporte
Comisiones bancarias
```

## Impuestos a separar

```txt
IVA trasladado
IVA acreditable
ISR
Retenciones, si aplican
```

## Reglas administrativas iniciales

- Usar cuenta bancaria separada para ingresos del proyecto.
- Registrar cada pago de cliente.
- Emitir CFDI por mensualidad/setup cuando corresponda.
- Guardar comprobantes de gastos deducibles.
- Separar IVA cobrado desde el inicio.
- Revisar régimen fiscal con contador antes del primer cobro formal.
- No cobrar de forma informal si se pretende escalar.

---

# Contrato y comunicación comercial

## Frase recomendada para propuesta comercial

```txt
Tortilla Plus es un sistema POS especializado para tortillerías. La suscripción incluye operación de caja, venta por kilo/monto, productos, clientes, control operativo y terminal vinculada según plan. Los planes con facturación incluyen un número mensual de timbrados CFDI; los excedentes se cobran por CFDI adicional.
```

## Frase sobre precios piloto

```txt
Precio piloto preferencial para primeros clientes locales. El precio puede conservarse mientras la cuenta permanezca activa, al corriente y dentro del alcance contratado.
```

## Frase sobre soporte

```txt
El soporte incluido cubre dudas operativas y corrección de incidencias del sistema. Configuraciones adicionales, capacitaciones extra o personalizaciones pueden cotizarse por separado.
```

---

# Traducción técnica a subscription_items

Cada suscripción debe representarse como lista de conceptos cobrables.

Ejemplo Plan 2:

```txt
subscription_items:
- item_type: base_plan
  quantity: 1
  unit_price: 599.00
  currency: MXN

- item_type: included_pos
  quantity: 2
  unit_price: 0.00
  currency: MXN

- item_type: included_terminal
  quantity: 2
  unit_price: 0.00
  currency: MXN

- item_type: included_cfdi
  quantity: 50
  unit_price: 0.00
  currency: MXN
```

Ejemplo extras:

```txt
subscription_items:
- item_type: extra_pos
  quantity: 1
  unit_price: 99.00
  currency: MXN

- item_type: extra_terminal
  quantity: 1
  unit_price: 79.00
  currency: MXN

- item_type: extra_branch
  quantity: 1
  unit_price: 149.00
  currency: MXN
```

Ejemplo CFDI excedente:

```txt
usage_charge:
- type: cfdi_overage
  quantity: 10
  unit_price: 6.00
  currency: MXN
```

---

# Reglas técnicas derivadas

El backend y el módulo Director deben soportar:

- cálculo de límites por plan;
- conteo de POS activos/licenciados;
- conteo de terminales vinculadas;
- conteo mensual de CFDI emitidos;
- cálculo de CFDI excedentes;
- snapshot de precios por cliente;
- registro de setup como concepto no recurrente;
- registro de pagos SaaS;
- suspensión por falta de pago;
- bloqueo de operación cuando aplique.

---

# Fuera de alcance de este documento

Este documento no implementa:

- cobro automático de suscripciones;
- facturación automática del SaaS;
- integración de pasarela para cobrar mensualidades;
- contratos legales completos;
- reglas definitivas de cancelación;
- régimen fiscal definitivo del dueño;
- migraciones de base de datos.

Estos puntos deben cubrirse en documentos posteriores:

```txt
pricing-roadmap-v1.md
subscription-and-billing-backlog-v1.md
accounting-and-tax-operations-v1.md
```

---

# Criterios de aceptación

El modelo comercial V1 queda aprobado si:

- los tres planes tienen precio y límites claros;
- todos los planes incluyen terminal vinculada;
- Plan 2 incluye 50 CFDI mensuales;
- Plan 3 incluye 100 CFDI mensuales;
- facturas globales diarias consumen el límite mensual de CFDI;
- CFDI adicional se cobra a costo Facturapi vigente + $5 MXN de ganancia;
- existe precio de setup;
- existe política de precio piloto;
- se especifica que IVA no es ingreso;
- se especifica que terminal incluida no incluye hardware ni comisiones del procesador;
- se especifica que los precios deben guardarse como snapshot en `subscription_items`.
