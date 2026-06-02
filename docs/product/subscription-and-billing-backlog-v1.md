# Tortilla Plus — Subscription & Billing Backlog V1

## Estado

Documento técnico-funcional derivado de `docs/product/commercial-model-v1.md`.

Este backlog define los cambios necesarios para que el modelo comercial V1 pueda operar dentro del sistema: suscripciones, cortes mensuales, límites por plan, uso de CFDI, excedentes, pagos SaaS, suspensión y dashboard financiero del Director.

## Objetivo

Convertir el modelo comercial en reglas implementables para backend, base de datos, servicios programados y UI del módulo Director.

El sistema debe poder responder con precisión:

- qué plan tiene una organización;
- qué incluye su plan;
- qué extras tiene contratados;
- cuántos POS puede operar;
- cuántas terminales puede vincular;
- cuántos CFDI tiene incluidos;
- cuántos CFDI ha consumido;
- cuánto debe pagar este mes;
- si está al corriente, vencida, en gracia o suspendida;
- si debe bloquearse la operación del POS.

---

# Fuente comercial

Los precios y límites congelados para piloto son:

```txt
Plan 1 — Mostrador:  $299 MXN + IVA / mes
Plan 2 — Operativo:  $599 MXN + IVA / mes
Plan 3 — Comercial:  $999 MXN + IVA / mes
```

Límites:

```txt
Plan 1:
  branches: 1
  pos: 1
  terminals: 1
  cfdi: 0
  routes: false
  billing_cfdi: false

Plan 2:
  branches: 1
  pos: 2
  terminals: 2
  cfdi: 50
  routes: false
  billing_cfdi: true

Plan 3:
  branches: 2
  pos: 3
  terminals: 3
  cfdi: 100
  routes: true
  billing_cfdi: true
```

Extras:

```txt
extra_pos:       $99 MXN + IVA / mes
extra_terminal:  $79 MXN + IVA / mes
extra_branch:   $149 MXN + IVA / mes
cfdi_overage:   $6 MXN IVA incluido / CFDI adicional
setup:          $1,000 MXN + IVA
```

---

# Problema actual

El modelo actual ya cuenta con:

```txt
plans
features
plan_features
subscriptions
subscription_items
saas_payments
```

Eso permite guardar planes y pagos, pero todavía falta modelar correctamente:

- ciclos de cobro mensuales;
- deuda del periodo;
- uso mensual de CFDI;
- cargos por excedente;
- setup como cargo no recurrente;
- snapshot comercial por cliente;
- estado financiero del cliente;
- reglas de suspensión por falta de pago;
- dashboard de cobranza del Director.

---

# Decisión técnica principal

`subscription_items` debe guardar el snapshot de lo contratado y cobrado a cada organización.

No se debe depender únicamente del precio actual del plan porque los clientes piloto pueden conservar precios preferenciales.

Ejemplo:

```txt
organization A:
  base_plan = 299

organization B:
  base_plan = 349
```

Ambas pueden estar en Plan Mostrador, pero con precios distintos por decisión comercial.

---

# Nuevas entidades requeridas

## 1. BillingCycle

Representa el corte mensual de una suscripción.

### Tabla sugerida

```txt
billing_cycles
```

### Campos

```txt
id uuid pk
organization_id uuid not null
subscription_id uuid not null
period_start date not null
period_end date not null
status enum not null
subtotal decimal(12,2) not null default 0
tax_total decimal(12,2) not null default 0
total decimal(12,2) not null default 0
currency char(3) not null default 'MXN'
due_date date not null
paid_at timestamptz null
created_at timestamptz not null
updated_at timestamptz not null
```

### Estados

```txt
pending
paid
overdue
graced
suspended
cancelled
```

### Reglas

- Se genera un billing cycle por organización/suscripción/mes.
- Debe ser único por `subscription_id + period_start + period_end`.
- Debe conservar snapshot del total calculado.
- No debe recalcularse automáticamente después de pagado.
- Si se actualizan items antes de pagar, se puede recalcular mientras esté `pending`.

---

## 2. BillingCycleItem

Detalle del corte mensual.

### Tabla sugerida

```txt
billing_cycle_items
```

### Campos

```txt
id uuid pk
billing_cycle_id uuid not null
item_type string not null
description string not null
quantity decimal(12,3) not null
unit_price decimal(12,2) not null
subtotal decimal(12,2) not null
tax_amount decimal(12,2) not null default 0
total decimal(12,2) not null
currency char(3) not null default 'MXN'
metadata json null
created_at timestamptz not null
```

### Tipos de item

```txt
base_plan
extra_pos
extra_terminal
extra_branch
cfdi_overage
setup
support_priority
training_extra
manual_adjustment
```

---

## 3. CfdiUsageCounter

Conteo mensual de CFDI emitidos por organización.

### Tabla sugerida

```txt
cfdi_usage_counters
```

### Campos

```txt
id uuid pk
organization_id uuid not null
billing_cycle_id uuid null
period_start date not null
period_end date not null
included_limit int not null default 0
used_count int not null default 0
global_invoice_count int not null default 0
individual_invoice_count int not null default 0
overage_count int not null default 0
overage_unit_price decimal(12,2) not null default 6.00
currency char(3) not null default 'MXN'
created_at timestamptz not null
updated_at timestamptz not null
```

### Reglas

- Las facturas globales diarias consumen el mismo contador que las facturas individuales.
- Plan 1 tiene límite 0.
- Plan 2 tiene límite 50.
- Plan 3 tiene límite 100.
- Excedente = `max(0, used_count - included_limit)`.
- Cada CFDI adicional se cobra según `cfdi_overage`.

---

## 4. SaasOneTimeCharge

Cargo no recurrente: setup, capacitación extra, ajustes manuales.

### Tabla sugerida

```txt
saas_one_time_charges
```

### Campos

```txt
id uuid pk
organization_id uuid not null
subscription_id uuid null
billing_cycle_id uuid null
charge_type string not null
description string not null
amount decimal(12,2) not null
tax_amount decimal(12,2) not null default 0
total decimal(12,2) not null
currency char(3) not null default 'MXN'
status enum not null
created_by_user_id uuid null
created_at timestamptz not null
updated_at timestamptz not null
```

### Estados

```txt
pending
included_in_cycle
cancelled
paid
```

### Tipos

```txt
setup
training_extra
support_extra
manual_adjustment
```

---

# Cambios a entidades existentes

## SubscriptionItem

El modelo actual ya funciona como snapshot de conceptos recurrentes.

Debe soportar estos `item_type`:

```txt
base_plan
included_pos
included_terminal
included_branch
included_cfdi
extra_pos
extra_terminal
extra_branch
support_priority
```

Si el enum actual `SubscriptionItemType` no incluye estos valores, debe ampliarse.

## SaasPayment

Debe poder relacionarse con `billing_cycle_id` en una fase cercana.

Campo sugerido:

```txt
billing_cycle_id uuid null
```

Regla:

- Un pago manual debe poder aplicarse a un billing cycle.
- En piloto puede permitirse pago sin ciclo, pero debe migrarse a pago aplicado.

---

# Reglas de cálculo mensual

## Total mensual base

```txt
monthly_subtotal = SUM(subscription_items recurrentes activos)
```

## CFDI excedente

```txt
cfdi_overage_count = max(0, used_count - included_cfdi)
cfdi_overage_total = cfdi_overage_count * 6.00
```

## Cargos no recurrentes

```txt
one_time_total = SUM(saas_one_time_charges pending del periodo)
```

## Subtotal del periodo

```txt
subtotal = monthly_subtotal + cfdi_overage_total + one_time_total
```

## IVA

Los precios mensuales y setup están expresados como `+ IVA`.

```txt
tax_total = subtotal * 0.16
```

Excepción:

El CFDI adicional se define comercialmente como `$6 IVA incluido`.

Para CFDI excedente, guardar desglose:

```txt
total_cfdi_overage = overage_count * 6.00
subtotal_cfdi_overage = total_cfdi_overage / 1.16
tax_cfdi_overage = total_cfdi_overage - subtotal_cfdi_overage
```

## Total

```txt
total = subtotal + tax_total
```

---

# Política de suspensión

## Estados comerciales

```txt
trial
active
past_due
grace_period
suspended_limited
cancelled
expired
```

## Regla sugerida

```txt
Día 0: vence mensualidad
Día 1–5: grace_period
Día 6: past_due
Día 10: suspended_limited
Día 30: cancelled o suspensión total manual
```

## Comportamiento por estado

### active

Operación normal.

### grace_period

Operación permitida con aviso visible a Owner/Manager.

### past_due

Operación permitida o limitada según configuración. Debe mostrar aviso persistente.

### suspended_limited

Debe bloquear:

```txt
ventas reales
apertura de caja
terminales
registro de nuevas ventas
```

Debe permitir:

```txt
login de Owner
login de Director
consulta de datos
pago/reactivación
```

### cancelled

Debe bloquear operación.

---

# Reglas de límites por plan

## POS

```txt
allowed_pos = included_pos + extra_pos
```

El sistema debe impedir operar un POS si:

```txt
pos.licensed = false
pos.status != active
organization.status in suspended/cancelled
```

## Terminales

```txt
allowed_terminals = included_terminal + extra_terminal
```

El sistema debe impedir vincular más terminales que el límite contratado, salvo autorización del Director.

## Sucursales

```txt
allowed_branches = included_branch + extra_branch
```

El Owner no debe poder crear/activar más sucursales que las contratadas.

## CFDI

```txt
allowed_cfdi = included_cfdi
```

No se debe bloquear necesariamente el timbrado al exceder el límite. Se debe generar cargo por excedente.

Excepción: si una organización está suspendida o cancelada, no debe permitirse timbrar CFDI nuevos salvo proceso de regularización definido.

---

# Backend — Endpoints requeridos

## Director / Platform

```txt
GET    /platform/commercial-plans
GET    /platform/organizations/:id/billing-summary
GET    /platform/organizations/:id/billing-cycles
POST   /platform/organizations/:id/billing-cycles/generate
PATCH  /platform/billing-cycles/:id/recalculate
POST   /platform/billing-cycles/:id/mark-paid
POST   /platform/organizations/:id/one-time-charges
GET    /platform/organizations/:id/cfdi-usage
PATCH  /platform/organizations/:id/subscription-items
```

## Organization / Owner

```txt
GET /organization/billing-summary
GET /organization/subscription
GET /organization/cfdi-usage
```

## Billing scheduler

```txt
POST /internal/billing/generate-monthly-cycles
POST /internal/billing/update-overdue-statuses
```

Estos endpoints internos deben protegerse con token interno o proceso programado, no con sesión de usuario común.

---

# Backend — Servicios requeridos

## billing-cycle-service

Responsabilidades:

- generar corte mensual;
- recalcular corte pendiente;
- marcar corte como pagado;
- aplicar pagos manuales;
- cerrar periodo;
- auditar cambios.

## cfdi-usage-service

Responsabilidades:

- contar CFDI emitidos por periodo;
- distinguir global vs individual;
- calcular excedente;
- exponer resumen a Director y Owner.

## subscription-entitlement-service

Responsabilidades:

- calcular límites contratados;
- validar POS permitidos;
- validar terminales permitidas;
- validar sucursales permitidas;
- exponer features habilitadas.

## billing-scheduler

Responsabilidades:

- generar ciclos mensuales;
- actualizar vencidos;
- aplicar grace period;
- marcar `past_due`;
- sugerir o aplicar `suspended_limited` según configuración.

---

# UI Director — Cambios requeridos

## Dashboard financiero

Agregar tarjetas:

```txt
MRR sin IVA
Pagos recibidos del mes
Monto pendiente de cobro
Clientes al corriente
Clientes en grace_period
Clientes vencidos
Clientes suspendidos
CFDI excedentes del mes
```

## Detalle de organización

Agregar sección `Facturación SaaS`:

```txt
Plan actual
Estado de suscripción
Periodo actual
Fecha de vencimiento
Items recurrentes
Cargos únicos pendientes
CFDI usados / incluidos
CFDI excedentes
Total corte actual
Pagos aplicados
Estado del corte
```

## Edición de subscription_items

El Director debe poder modificar:

```txt
base_plan price
extra_pos quantity/unit_price
extra_terminal quantity/unit_price
extra_branch quantity/unit_price
support_priority enabled/unit_price
included_cfdi quantity
```

Debe quedar auditado.

## Pagos SaaS

Mejorar pantalla actual para:

- seleccionar billing cycle;
- aplicar pago a corte;
- ver monto pendiente;
- ver pagos parciales si se permite;
- registrar nota/referencia;
- actualizar estado a pagado si cubre el total.

## CFDI usage

Agregar vista por organización:

```txt
periodo
incluidos
usados
globales
individuales
excedentes
cargo excedente
```

---

# UI Owner

El Owner debe ver, pero no editar libremente:

```txt
plan contratado
estado de suscripción
fecha de vencimiento
POS incluidos/usados
terminales incluidas/usadas
sucursales incluidas/usadas
CFDI incluidos/usados
CFDI excedentes estimados
pagos registrados
avisos de vencimiento
```

No debe poder cambiar plan ni precios desde su panel en V1.

---

# Auditoría obligatoria

Auditar:

```txt
billing_cycle_generated
billing_cycle_recalculated
billing_cycle_marked_paid
subscription_items_updated
one_time_charge_created
one_time_charge_cancelled
cfdi_overage_charged
subscription_status_changed
organization_suspended_for_non_payment
organization_reactivated_after_payment
```

Cada auditoría debe incluir:

```txt
organization_id
user_id o system actor
action
entity_type
entity_id
before_snapshot
after_snapshot
metadata
created_at
```

---

# Tests requeridos

## Unit tests

```txt
BILL-UNIT-01 calcula total Plan 1 sin extras
BILL-UNIT-02 calcula total Plan 2 sin excedentes
BILL-UNIT-03 calcula total Plan 3 sin excedentes
BILL-UNIT-04 calcula POS adicional
BILL-UNIT-05 calcula terminal adicional
BILL-UNIT-06 calcula sucursal adicional
BILL-UNIT-07 calcula CFDI excedente con IVA incluido
BILL-UNIT-08 no recalcula ciclo pagado
BILL-UNIT-09 respeta precio snapshot de subscription_items
```

## Integration tests

```txt
BILL-INT-01 genera billing cycle mensual
BILL-INT-02 billing cycle incluye base_plan
BILL-INT-03 billing cycle incluye extras activos
BILL-INT-04 billing cycle incluye setup pendiente
BILL-INT-05 billing cycle incluye CFDI excedentes
BILL-INT-06 pago manual marca ciclo como pagado
BILL-INT-07 organización pasa a grace_period después de vencimiento
BILL-INT-08 organización pasa a past_due
BILL-INT-09 organización pasa a suspended_limited
BILL-INT-10 POS queda bloqueado si organización está suspended_limited
BILL-INT-11 Owner no puede editar subscription_items
BILL-INT-12 Director puede editar subscription_items
```

## Frontend tests/manual QA

```txt
BILL-UI-01 Director ve MRR
BILL-UI-02 Director ve deuda pendiente
BILL-UI-03 Director genera corte manual
BILL-UI-04 Director registra pago contra corte
BILL-UI-05 Director ve CFDI usados/excedentes
BILL-UI-06 Owner ve plan y vencimiento
BILL-UI-07 Owner ve límites contratados
BILL-UI-08 Manager ve aviso de suscripción vencida
BILL-UI-09 Cajero recibe bloqueo claro si organización suspendida
```

---

# Prioridad de implementación

## Sprint Billing 1 — Mínimo para piloto

```txt
1. Crear BillingCycle y BillingCycleItem.
2. Generar corte mensual manual desde Director.
3. Calcular items recurrentes desde subscription_items.
4. Registrar pago manual aplicado a billing cycle.
5. Mostrar billing summary en Director.
6. Mostrar estado de suscripción en Owner.
7. Bloquear POS por suspended_limited.
```

## Sprint Billing 2 — CFDI usage y excedentes

```txt
1. Crear CfdiUsageCounter.
2. Contar CFDI globales e individuales.
3. Calcular excedentes.
4. Agregar excedente al billing cycle.
5. Mostrar uso en Director y Owner.
```

## Sprint Billing 3 — Automatización

```txt
1. Scheduler mensual de cortes.
2. Scheduler de vencimientos.
3. Grace period automático.
4. Suspensión automática o sugerida.
5. Alertas de cobro.
```

## Sprint Billing 4 — SaaS invoicing propio

```txt
1. Facturar la mensualidad de Tortilla Plus.
2. Emitir CFDI al cliente por mensualidad/setup.
3. Registrar UUID CFDI del cobro SaaS.
4. Enviar comprobante por correo.
```

---

# No hacer todavía

No implementar en este sprint:

```txt
cobro automático recurrente con Mercado Pago/OpenPay
impersonación
platform_admin
repartidor como usuario
facturación automática del SaaS sin validación contable
precios públicos definitivos posteriores a piloto
```

---

# Prompt sugerido para Codex

```txt
Implementa el backlog docs/product/subscription-and-billing-backlog-v1.md en orden estricto.

Primero Sprint Billing 1:
- Crear BillingCycle y BillingCycleItem en Prisma.
- Generar migración.
- Implementar servicio billing-cycle-service.
- Generar corte mensual manual desde /platform/organizations/:id/billing-cycles/generate.
- Calcular items recurrentes desde subscription_items activos.
- Registrar pago manual aplicado a billing cycle.
- Mostrar billing summary en módulo Director.
- Mostrar resumen de suscripción en Owner.
- Asegurar bloqueo de POS por suspended_limited.

No implementar cobro automático.
No implementar facturación SaaS propia.
No implementar platform_admin.
No implementar repartidor como UserRole.

Al terminar:
- npm run build debe pasar.
- apps/api npm run db:validate debe pasar.
- apps/api npm run test debe pasar.
- apps/web npm run build debe pasar.
- Agregar tests mínimos BILL-UNIT-01 a BILL-UNIT-09 si existe estructura de tests.
```

---

# Criterios de aceptación finales

Este backlog se considera listo si:

- el sistema genera cortes mensuales;
- los cortes usan precios snapshot desde `subscription_items`;
- el Director ve deuda y pagos;
- el Director puede registrar pago contra corte;
- el Owner ve su estado de suscripción;
- el sistema puede calcular límites contratados;
- el sistema puede bloquear operación por suspensión;
- el uso de CFDI queda preparado para Sprint Billing 2;
- no se agrega `platform_admin`;
- no se rompe el flujo de POS existente.
