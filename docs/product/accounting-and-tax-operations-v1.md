# Tortilla Plus — Accounting & Tax Operations V1

## Estado

Documento administrativo-contable inicial para operación de Tortilla Plus como SaaS.

Este documento no sustituye asesoría contable ni fiscal. Debe ser revisado por contador antes de iniciar cobros formales. Su objetivo es evitar desorden financiero desde el primer cliente piloto.

## Objetivo

Definir cómo registrar ingresos, gastos, IVA, pagos, setup, addons, CFDI excedentes y cortes mensuales del SaaS para mantener una operación ordenada desde el inicio.

Este documento se conecta con:

```txt
docs/product/commercial-model-v1.md
docs/product/subscription-and-billing-backlog-v1.md
```

---

# Principios obligatorios

## 1. El IVA no es ingreso

Todo precio publicado como `+ IVA` debe separar:

```txt
ingreso real
IVA trasladado
total cobrado
```

Ejemplo:

```txt
Plan Operativo: $599 + IVA
IVA 16%: $95.84
Total cobrado: $694.84
Ingreso real: $599
IVA trasladado: $95.84
```

El sistema, reportes y hoja contable no deben tratar el total cobrado como ingreso neto.

## 2. Separar ingresos por tipo

No mezclar mensualidades, setup, soporte, addons y CFDI excedentes en una sola bolsa.

## 3. Separar cuenta bancaria del proyecto

Recomendación operativa:

```txt
Usar una cuenta bancaria dedicada para ingresos y gastos de Tortilla Plus.
```

No mezclar con gastos personales ni ingresos ajenos al proyecto.

## 4. Todo pago debe tener referencia

Cada pago debe registrar:

```txt
cliente / organización
fecha
monto
método
referencia bancaria o nota
concepto
periodo que cubre
estatus
```

## 5. Todo precio especial debe quedar documentado

Si un cliente piloto conserva precio preferencial, debe quedar registrado como snapshot en `subscription_items` y como nota comercial.

---

# Régimen fiscal pendiente de validación

Antes del primer cobro formal, validar con contador si conviene operar como:

```txt
Persona física con actividad empresarial / profesional
RESICO persona física, si aplica
Persona moral
```

## Decisión pendiente

```txt
TAX-DEC-01 Definir régimen fiscal operativo de Tortilla Plus.
```

## Criterios para decidir

### Persona física / RESICO puede convenir si:

- el proyecto inicia con pocos clientes;
- no hay socios;
- no hay nómina formal;
- se busca simplicidad administrativa;
- los ingresos esperados están dentro de límites permitidos;
- el contador confirma compatibilidad con la actividad.

### Persona moral puede convenir si:

- habrá socios;
- se busca separar patrimonio personal;
- se pretende contratar personal;
- se venderá a clientes más formales;
- se requiere estructura empresarial más robusta;
- se busca preparar la empresa para crecimiento.

## Regla práctica

No decidir únicamente por pagar menos impuesto. Decidir por estructura, riesgo, formalidad comercial y crecimiento.

---

# Catálogo de ingresos

Crear categorías internas de ingreso.

## Ingresos recurrentes

```txt
saas_subscription_plan_1
saas_subscription_plan_2
saas_subscription_plan_3
extra_pos
extra_terminal
extra_branch
support_priority
```

## Ingresos no recurrentes

```txt
setup_initial
training_extra
support_extra
manual_adjustment
```

## Ingresos por uso

```txt
cfdi_overage
```

## Reglas

- `saas_subscription_*` forma parte de MRR.
- `setup_initial` no forma parte de MRR.
- `training_extra` no forma parte de MRR.
- `cfdi_overage` puede reportarse separado como ingreso variable.
- Soporte prioritario mensual sí forma parte de MRR si es recurrente.

---

# Catálogo de costos directos

Estos costos deben usarse para calcular margen bruto.

```txt
hosting
managed_database
backups
storage
monitoring_logs
email_transactional
pac_cfdi_stamps
payment_gateway_fees
sms_whatsapp_if_enabled
external_support
```

## Regla

Si el costo crece con clientes o uso, es costo directo.

Ejemplos:

- timbres CFDI;
- comisiones de cobro;
- almacenamiento de documentos;
- soporte directo por cliente;
- infraestructura proporcional.

---

# Catálogo de gastos operativos

Estos costos no se atribuyen directamente a un cliente, pero afectan utilidad.

```txt
accountant
legal_advice
domain
software_tools
computer_equipment
internet
transportation
sales_visits
marketing
bank_fees
administrative_expenses
```

---

# Impuestos y cuentas de control

Separar al menos:

```txt
IVA trasladado
IVA acreditable
ISR estimado
retenciones si aplican
```

## IVA trasladado

IVA cobrado al cliente.

No es ingreso.

## IVA acreditable

IVA pagado en gastos deducibles/facturados correctamente.

Debe validarse con contador.

## ISR

Debe estimarse mensualmente según régimen fiscal.

No asumir utilidad disponible sin separar impuestos.

---

# Registro mínimo por pago SaaS

Cada pago registrado en `saas_payments` o en el módulo Director debe tener:

```txt
organization_id
subscription_id
billing_cycle_id si existe
amount_total
subtotal
tax_total
currency
provider
payment_method
provider_payment_id o referencia manual
paid_at
status
notes
created_by_user_id
```

## Estados recomendados

```txt
pending
approved
failed
refunded
cancelled
partially_applied
```

---

# Reglas de emisión CFDI del SaaS

Cuando Tortilla Plus cobre mensualidad, setup, addons o soporte, debe poder emitir CFDI al cliente, si el cliente lo requiere y si la operación fiscal ya está definida.

## Conceptos sugeridos

```txt
Suscripción mensual Tortilla Plus — Plan Mostrador
Suscripción mensual Tortilla Plus — Plan Operativo
Suscripción mensual Tortilla Plus — Plan Comercial
POS adicional Tortilla Plus
Terminal adicional vinculada Tortilla Plus
Sucursal adicional Tortilla Plus
Setup inicial Tortilla Plus
Capacitación adicional Tortilla Plus
Soporte prioritario Tortilla Plus
CFDI adicional excedente Tortilla Plus
```

## Regla

No mezclar conceptos en una sola descripción genérica si se requiere trazabilidad financiera.

---

# Separación entre facturación del cliente y facturación del SaaS

Hay dos mundos distintos:

## 1. Facturación que la tortillería emite a sus compradores

Esto pertenece al módulo operativo del cliente.

Ejemplos:

```txt
factura global diaria de ventas de la tortillería
factura individual solicitada por cliente final
```

## 2. Facturación que Tortilla Plus emite a la tortillería

Esto pertenece al negocio SaaS.

Ejemplos:

```txt
mensualidad SaaS
setup
addons
soporte
CFDI excedentes
```

## Regla crítica

No mezclar en reportes ni tablas contables. Son ingresos de sujetos distintos.

---

# Corte mensual interno

Cada mes debe generarse un resumen administrativo con:

```txt
MRR sin IVA
Ingresos no recurrentes sin IVA
Ingresos por uso sin IVA
IVA trasladado
pagos recibidos
cuentas por cobrar
gastos directos
gastos operativos
margen bruto
utilidad estimada antes de impuestos
impuestos estimados
clientes activos
clientes vencidos
clientes suspendidos
```

---

# Fórmulas financieras

## MRR

```txt
MRR = suma de mensualidades recurrentes sin IVA
```

Incluye:

```txt
base_plan
extra_pos
extra_terminal
extra_branch
support_priority si es mensual
```

No incluye:

```txt
setup
training_extra
cfdi_overage
manual_adjustment no recurrente
```

## Ingreso total del mes

```txt
ingreso_total_sin_iva = MRR + ingresos_no_recurrentes + ingresos_por_uso
```

## Margen bruto

```txt
margen_bruto = (ingreso_total_sin_iva - costos_directos) / ingreso_total_sin_iva
```

## Utilidad operativa estimada

```txt
utilidad_operativa = ingreso_total_sin_iva - costos_directos - gastos_operativos
```

## Flujo disponible estimado

```txt
flujo_disponible = utilidad_operativa - impuestos_estimados - reservas
```

---

# Reserva recomendada

Desde los primeros clientes, separar reservas.

## Reserva mínima sugerida

```txt
20% de ingresos sin IVA para impuestos y contingencias
```

Esto no sustituye cálculo fiscal real. Es una disciplina de caja para no gastar dinero que después se debe pagar.

## Reserva operativa

Cuando haya clientes activos:

```txt
1 mes de costos fijos mínimos como reserva operativa
```

Después:

```txt
3 meses de costos fijos mínimos
```

---

# Control de soporte

El soporte debe medirse porque puede destruir margen.

## Registrar por cliente

```txt
organization_id
fecha
tipo de soporte
minutos invertidos
causa
resuelto_si_no
requiere_cambio_producto_si_no
```

## Categorías

```txt
onboarding
capacitación
bug
duda operativa
configuración
terminal
facturación
caja
inventario
reporte
otro
```

## Indicador crítico

```txt
horas_soporte_por_cliente_mes
```

Si un cliente de Plan 1 paga $299 + IVA y consume 2 horas de soporte al mes, probablemente no es rentable.

---

# Reglas de cobranza

## Calendario sugerido

```txt
Día 0: emisión de corte
Día 1: recordatorio amistoso
Día 5: fin de gracia
Día 6: estado past_due
Día 10: suspended_limited
Día 30: cancelación o suspensión total manual
```

## Comunicación sugerida

### Recordatorio

```txt
Tu suscripción Tortilla Plus está próxima a vencer. Para evitar interrupciones en la operación del POS, realiza tu pago antes de la fecha indicada.
```

### Vencido

```txt
Tu suscripción Tortilla Plus tiene pago pendiente. El servicio puede limitarse si no se regulariza.
```

### Suspensión limitada

```txt
La operación de ventas está temporalmente bloqueada por falta de pago. El acceso administrativo permanece disponible para regularizar la cuenta.
```

---

# Estados operativos y contables

## active

Cliente al corriente. Operación normal.

## grace_period

Cliente vencido dentro de ventana de gracia. Operación permitida con aviso.

## past_due

Cliente vencido fuera de gracia. Operación puede seguir o limitarse según configuración. Para piloto, mantener aviso fuerte.

## suspended_limited

Bloquea ventas, apertura de caja y terminales.

Permite login de Owner y consulta administrativa.

## cancelled

Servicio cancelado. No operar ventas.

---

# Conciliación mensual básica

Cada mes revisar:

```txt
pagos registrados en sistema
movimientos bancarios
CFDI emitidos por Tortilla Plus
IVA trasladado
clientes con deuda
clientes suspendidos
gastos deducibles
comisiones bancarias
```

## Resultado esperado

```txt
Pagos en banco = pagos registrados en Director ± diferencias identificadas
```

Toda diferencia debe tener nota.

---

# Información que debe entregar el Director al dueño

El dashboard del Director debe mostrar:

```txt
MRR sin IVA
pagos recibidos del mes
IVA trasladado estimado
cuentas por cobrar
clientes vencidos
clientes suspendidos
CFDI excedentes cobrados
setup cobrado
soporte prioritario cobrado
costos directos estimados
margen bruto estimado
```

---

# Información que debe entregar al contador

Reporte mensual exportable:

```txt
cliente
RFC del cliente si existe
concepto
subtotal
IVA
total
fecha de pago
método de pago
referencia
CFDI emitido si/no
UUID CFDI si aplica
estatus
```

Reporte de gastos:

```txt
proveedor
RFC proveedor si existe
concepto
subtotal
IVA
total
fecha
método
UUID CFDI recibido si aplica
categoría
```

---

# Riesgos administrativos

## Riesgo 1 — Cobrar barato y absorber soporte

Mitigación:

- setup obligatorio;
- soporte incluido limitado;
- medir horas de soporte;
- cobrar capacitación extra.

## Riesgo 2 — Mezclar IVA con ingreso

Mitigación:

- reportes separados;
- cuenta de control de IVA;
- revisión mensual con contador.

## Riesgo 3 — No facturar mensualidades

Mitigación:

- definir régimen fiscal antes de cobros formales;
- emitir CFDI cuando corresponda;
- conservar comprobantes.

## Riesgo 4 — No saber quién debe

Mitigación:

- implementar billing cycles;
- aplicar pagos a ciclos;
- dashboard de cuentas por cobrar.

## Riesgo 5 — No costear timbres CFDI

Mitigación:

- contar uso mensual;
- cobrar excedentes;
- actualizar costo Facturapi cuando cambie.

---

# Backlog administrativo-contable

## Sprint Admin 1 — Orden inicial

```txt
1. Definir régimen fiscal con contador.
2. Definir cuenta bancaria del proyecto.
3. Definir catálogo de conceptos comerciales.
4. Definir formato de reporte mensual al contador.
5. Separar IVA trasladado en reportes.
6. Registrar setup y mensualidad por separado.
```

## Sprint Admin 2 — Reportes para contador

```txt
1. Exportar reporte mensual de ingresos SaaS.
2. Exportar reporte mensual de pagos recibidos.
3. Exportar reporte de cuentas por cobrar.
4. Exportar reporte de CFDI excedentes.
5. Exportar reporte de soporte por cliente.
```

## Sprint Admin 3 — CFDI del SaaS

```txt
1. Definir si Tortilla Plus emitirá CFDI desde el mismo sistema o proceso externo.
2. Registrar UUID CFDI del cobro SaaS.
3. Asociar CFDI emitido al billing cycle.
4. Generar acuse/documento asociado.
```

---

# Requisitos técnicos derivados

El sistema debe permitir:

```txt
registrar subtotal/IVA/total en pagos SaaS
asociar pagos a billing cycles
registrar referencia bancaria
registrar método de pago
exportar ingresos mensuales
exportar cuentas por cobrar
exportar CFDI emitidos por Tortilla Plus
separar facturación operativa de clientes y facturación SaaS propia
registrar soporte por organización
calcular MRR sin IVA
calcular IVA trasladado estimado
```

---

# No hacer todavía

No implementar sin validación contable:

```txt
facturación automática de mensualidades SaaS
cobro automático recurrente
cancelaciones fiscales automáticas
retenciones complejas
contabilidad completa dentro del POS
```

---

# Prompt sugerido para Codex

```txt
Usa docs/product/accounting-and-tax-operations-v1.md como guía.
No implementes facturación automática del SaaS todavía.

Implementa primero soporte de datos para orden administrativo:
- subtotal, tax_total y total en pagos SaaS si aún no existen.
- referencia de pago manual.
- método de pago.
- asociación de pago con billing_cycle cuando exista.
- export mensual de ingresos SaaS.
- export mensual de cuentas por cobrar.
- separación explícita de ingreso sin IVA e IVA trasladado.

No mezclar facturación operativa del cliente con facturación del SaaS.
No crear platform_admin.
No implementar cobro automático recurrente todavía.
```

---

# Criterios de aceptación

Este documento queda cubierto si:

- el modelo comercial separa ingreso, IVA y total;
- el Director puede registrar pagos con referencia;
- los reportes pueden entregar subtotal, IVA y total;
- los pagos pueden asociarse a cortes cuando exista `billing_cycles`;
- se puede exportar reporte mensual para contador;
- se distingue facturación de la tortillería vs facturación del SaaS;
- no se implementa automatización fiscal sin validación contable.
