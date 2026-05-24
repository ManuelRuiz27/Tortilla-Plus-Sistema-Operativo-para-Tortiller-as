# Tortilla Plus — Core Operating Model V0.1

## 1. Propósito

Este documento corrige y consolida el modelo operativo base de **Tortilla Plus — V1 Operativa Comercial**.

Este documento va antes de billing.

Define:

```txt
negocio / tenant
gerente propietario
usuarios
roles
límites del plan
sucursales
cajas
POS activos
dispositivos
productos
unidades
precios
clientes
crédito
rutas
carga
venta/cobro
liquidación
inventario
producción
caja/turnos
flujo POS completo
```

Ubicación recomendada:

```txt
docs/product/core-operating-model.md
```

---

## 2. Principio central

Tortilla Plus no es solo facturación.

El orden correcto del producto es:

```txt
Core Operativo
→ POS
→ Caja
→ Clientes/Rutas
→ Inventario
→ Billing fiscal
```

Billing depende del core operativo, no al revés.

---

## 3. Roles oficiales V1

Solo existen tres roles operativos:

```txt
Cajero
Supervisor
Gerente
```

No existe rol Owner.

El propietario del negocio se modela como:

```json
{
  "role": "manager",
  "isOwner": true
}
```

Regla:

```txt
Owner = Gerente propietario
```

---

## 4. Gerente propietario

El primer usuario del negocio es:

```txt
Gerente propietario
```

Modelo:

```txt
role = manager
isOwner = true
```

Puede administrar:

```txt
usuarios
sucursales
cajas
POS activos
dispositivos
plan/licencia
configuración del negocio
precios
clientes
rutas
productos
inventario
facturación
```

---

## 5. Tenant / negocio

Un negocio representa a una tortillería o empresa usuaria del SaaS.

Datos mínimos:

```txt
nombre comercial
razón social opcional
RFC opcional al inicio
teléfono
correo
dirección
estado del negocio
plan activo
fecha de alta
```

Estados:

```txt
trial
active
past_due
suspended
cancelled
```

Reglas:

```txt
si el negocio está suspended, no puede operar POS
si el negocio está past_due, puede mostrar warning antes de suspensión
si el negocio está cancelled, no permite nuevas ventas
```

---

## 6. Plan y límites

El plan controla:

```txt
usuarios máximos
POS activos máximos
sucursales máximas
```

Regla comercial base:

```txt
mensualidad base + costo por POS activo
```

No confundir:

```txt
usuario = persona
POS activo = caja/dispositivo autorizado para vender
```

---

## 7. Límites sugeridos V1

Estos límites son técnicos iniciales, no precios definitivos.

```txt
Básico:
  usuarios: 3
  POS activos: 1
  sucursales: 1

Operativo:
  usuarios: 8
  POS activos: 2
  sucursales: 1

Multi-sucursal:
  usuarios: 20
  POS activos: 5
  sucursales: 3

Personalizado:
  usuarios: configurable
  POS activos: configurable
  sucursales: configurable
```

Si se excede un límite:

```txt
bloquear creación/activación
mostrar motivo
ofrecer actualización de plan
```

---

## 8. Usuarios

Un usuario es una persona autorizada para entrar al sistema.

Campos mínimos:

```txt
nombre
teléfono opcional
correo opcional según rol
rol
sucursal asignada
estado
PIN dinámico si aplica
fecha de creación
último acceso
```

Estados:

```txt
active
inactive
invited
locked
```

---

## 9. Creación de usuarios

Flujo:

```txt
Gerente entra a Manager
→ Configuración
→ Usuarios
→ Crear usuario
→ captura nombre
→ selecciona rol
→ asigna sucursal
→ sistema valida límite del plan
→ sistema crea acceso
```

Roles asignables:

```txt
Cajero
Supervisor
Gerente
```

Reglas:

```txt
Cajero no administra usuarios
Supervisor no administra usuarios por default
Gerente puede administrar usuarios
Gerente propietario siempre puede administrar usuarios
```

---

## 10. Acceso por rol

## 10.1 Cajero

El Cajero entra al POS con:

```txt
PIN dinámico semanal
```

No usa correo/contraseña como flujo principal.

## 10.2 Supervisor

El Supervisor entra con:

```txt
correo + contraseña
```

Puede usar PIN si se requiere autorización rápida dentro del POS.

## 10.3 Gerente

El Gerente entra con:

```txt
correo + contraseña
```

---

## 11. PIN dinámico semanal para Cajero

Decisión V1:

```txt
El PIN del Cajero se autogenera cada semana.
La semana operativa comienza en lunes.
```

Reglas:

```txt
cada lunes se genera nuevo PIN
el PIN anterior queda inválido
el PIN pertenece al usuario y sucursal/caja permitida
el Gerente puede ver/regenerar PIN
el Supervisor puede ver/regenerar PIN solo si tiene permiso
cada uso de PIN queda auditado
```

Recomendación técnica:

```txt
guardar PIN hasheado
no guardar PIN en texto plano
mostrar PIN solo al generarlo/regenerarlo
permitir impresión o copia controlada
```

Casos:

```txt
si Cajero olvida PIN → Gerente regenera
si Cajero está inactive → PIN no funciona
si usuario locked → PIN no funciona
si cambia de sucursal → se regenera acceso
```

---

## 12. Sucursales

Una sucursal representa un punto físico de operación.

Campos mínimos:

```txt
nombre
dirección
teléfono
estado
horario opcional
configuración fiscal opcional
configuración de precios
```

Estados:

```txt
active
inactive
suspended
```

Reglas:

```txt
una sucursal puede tener varias cajas
una sucursal tiene inventario propio
una sucursal tiene usuarios asignados
una sucursal tiene ventas propias
```

---

## 13. Caja

Una caja representa un punto de cobro dentro de una sucursal.

Campos mínimos:

```txt
nombre
sucursal
estado
POS activo asociado
impresora configurada opcional
turno actual
```

Estados:

```txt
active
inactive
maintenance
```

Reglas:

```txt
una caja puede tener un turno abierto a la vez
una caja puede tener un POS activo asociado
una caja pertenece a una sucursal
```

---

## 14. POS activo

Un POS activo es una licencia operativa para vender desde una caja/dispositivo.

Decisión V1:

```txt
POS activo se cobra/controla por dispositivo/caja.
```

Modelo:

```txt
Sucursal
  └─ Caja
      └─ POS activo
          └─ Dispositivo autorizado
```

Reglas:

```txt
activar POS consume límite del plan
desactivar POS libera capacidad según política comercial
un POS activo puede revocarse
un dispositivo revocado no puede vender
```

---

## 15. Activación de POS

Flujo:

```txt
Gerente entra a Manager
→ Configuración
→ POS / Cajas
→ Crear o seleccionar caja
→ Activar POS
→ sistema valida límite del plan
→ sistema genera código de activación
→ usuario abre POS en PC
→ ingresa código
→ sistema registra dispositivo
→ POS queda autorizado
```

Datos del dispositivo:

```txt
deviceId
nombre del dispositivo
caja
sucursal
estado
fecha activación
último acceso
```

Estados:

```txt
pending_activation
active
inactive
revoked
```

---

## 16. Sin offline real en V1

Decisión V1:

```txt
No habrá offline real en V1.
```

Regla:

```txt
si API no está disponible, POS no debe completar ventas formales
```

Debe mostrar:

```txt
No hay conexión con el servidor.
No se pueden registrar ventas hasta recuperar conexión.
```

Preparación futura:

```txt
la arquitectura puede contemplar offline después
pero no se implementa en V1
```

No implementar en V1:

```txt
ventas offline
sincronización posterior
folios locales
tickets QR offline
cola local de ventas
```

---

## 17. Productos

Existen dos grupos de productos:

```txt
productos especiales pesables
productos CRUD generales
```

Productos especiales:

```txt
Tortilla
Masa
```

Productos generales:

```txt
salsa
guisos
totopos
refrescos
otros
```

---

## 18. Modos de venta de tortilla y masa

Tortilla y masa deben venderse por:

```txt
kg
paquete 800g
importe en pesos
```

Ejemplos:

```txt
1 kg de tortilla
paquete de tortilla 800g
$20 de tortilla
1 kg de masa
$15 de masa
```

Reglas:

```txt
venta por kg usa cantidad directa
venta por paquete descuenta 0.800 kg
venta por importe calcula kg según precio vigente
```

---

## 19. Unidades y redondeos

Reglas recomendadas V1:

```txt
kg con 3 decimales
dinero con 2 decimales
paquete tienda = 0.800 kg
```

Para venta por importe:

```txt
kg = importe / precio_kg
```

El sistema debe guardar:

```txt
importe capturado
kg calculados
precio aplicado
redondeo aplicado
```

---

## 20. Precios

Tipos de precio:

```txt
precio general
precio por cliente
precio por producto
precio por sucursal
precio especial autorizado
```

Regla principal:

```txt
venta sin cliente → precio general de sucursal
venta con cliente → precio asignado al cliente
```

Si el cliente no tiene precio específico para un producto:

```txt
usar precio general de sucursal
```

---

## 21. Cambio manual de precio

Regla V1:

```txt
Cajero no puede cambiar precio manualmente.
```

Precio especial requiere:

```txt
Supervisor o Gerente
motivo
auditoría
```

Auditar:

```txt
usuario solicitante
usuario autorizador
precio original
precio aplicado
producto
venta
motivo
fecha/hora
```

---

## 22. Clientes

Tipos mínimos:

```txt
mostrador
cliente frecuente
tienda / punto de venta
cliente ruta
cliente con crédito
```

Campos mínimos:

```txt
nombre comercial
contacto
teléfono
dirección
tipo cliente
ruta asignada opcional
lista de precios
crédito habilitado
límite de crédito
saldo actual
estado
```

Estados:

```txt
active
inactive
blocked
```

---

## 23. Venta con cliente desde POS

Flujo:

```txt
Cajero abre POS
→ busca o selecciona cliente opcional
→ POS carga precios del cliente
→ captura productos
→ cobra
→ venta queda asociada al cliente
```

Reglas:

```txt
seleccionar cliente no debe hacer lento el POS
cliente debe ser opcional
precio del cliente debe aplicarse automáticamente
```

---

## 24. Crédito / fiado

Regla:

```txt
solo clientes con crédito habilitado pueden comprar fiado
```

Campos de crédito:

```txt
creditEnabled
creditLimit
currentBalance
availableCredit
paymentTerms opcional
blockedReason opcional
```

Venta fiado:

```txt
validar cliente
validar crédito habilitado
validar límite
registrar cargo
actualizar saldo
generar estado de cuenta
```

Si excede límite:

```txt
bloquear o pedir autorización Supervisor/Gerente
```

Decisión recomendada V1:

```txt
exceder límite requiere autorización Supervisor/Gerente y auditoría
```

---

## 25. Abonos de clientes

Debe existir flujo para registrar pagos a crédito.

Flujo:

```txt
buscar cliente
ver saldo
registrar abono
seleccionar método de pago
emitir comprobante
actualizar saldo
auditar
```

Métodos:

```txt
efectivo
tarjeta
transferencia
mixto
```

---

## 26. Rutas

Decisión V1:

```txt
Rutas V1 incluyen carga, venta/cobro y liquidación.
```

Una ruta no debe ser solo visual.

---

## 27. Modelo de ruta

Una ruta tiene:

```txt
nombre
sucursal
vendedor/repartidor asignado
clientes asignados
estado
fecha operativa
carga de producto
ventas/entregas
cobros
fiados
devoluciones
liquidación
```

Estados:

```txt
draft
loaded
in_route
returned
liquidated
cancelled
```

---

## 28. Flujo de ruta

Flujo oficial:

```txt
Gerente/Supervisor crea ruta
→ asigna clientes
→ asigna vendedor/repartidor
→ carga producto
→ ruta sale
→ se registran entregas/ventas
→ se registran cobros
→ se registran fiados
→ se registra devolución
→ se liquida ruta
```

---

## 29. Carga de ruta

La carga descuenta inventario cuando sale el producto.

Datos:

```txt
producto
cantidad cargada
unidad
responsable
fecha/hora
```

Reglas:

```txt
carga de tortilla descuenta kg
carga de masa descuenta kg
paquete descuenta 0.800 kg por unidad
```

Si no hay stock suficiente:

```txt
permitir con warning
auditar stock negativo
```

---

## 30. Venta/cobro en ruta

Cada cliente de ruta puede tener:

```txt
entrega
venta
cobro
fiado
devolución
nota
```

Reglas:

```txt
usar precio del cliente
permitir cobro parcial
permitir fiado si cliente tiene crédito
actualizar saldo
```

---

## 31. Devolución de ruta

Al regresar ruta:

```txt
registrar producto no vendido
registrar producto devuelto
registrar merma si aplica
actualizar inventario
```

Reglas:

```txt
producto devuelto vuelve a inventario si es vendible
merma no vuelve a inventario
```

---

## 32. Liquidación de ruta

La liquidación debe mostrar:

```txt
producto cargado
producto vendido
producto devuelto
merma
ventas efectivo
ventas tarjeta
ventas fiado
cobros recibidos
saldo pendiente
diferencias
```

Debe requerir:

```txt
confirmación Supervisor/Gerente
```

Al liquidar:

```txt
ruta queda cerrada
se genera auditoría
no se puede editar sin autorización
```

---

## 33. Inventario

Inventario por sucursal.

Debe controlar:

```txt
tortilla kg
masa kg
paquetes
productos generales
carga a ruta
venta mostrador
devolución de ruta
merma
ajustes
```

---

## 34. Producción del día

Debe existir registro de producción.

Campos:

```txt
sucursal
producto
cantidad producida
unidad
usuario
fecha/hora
nota opcional
```

Productos principales:

```txt
tortilla
masa
```

Reglas:

```txt
producción aumenta inventario
venta disminuye inventario
carga de ruta disminuye inventario
devolución vendible aumenta inventario
merma disminuye inventario
```

---

## 35. Stock negativo

Decisión existente:

```txt
tortilla/masa pueden venderse aunque no haya stock suficiente
```

Regla:

```txt
permitir venta
generar warning
auditar stock negativo
mostrar en dashboard gerente
```

No debe bloquear POS.

---

## 36. Merma

Debe registrarse:

```txt
producto
cantidad
motivo
usuario
fecha/hora
sucursal
```

Motivos sugeridos:

```txt
producto dañado
sobrante no vendible
error producción
devolución no vendible
otro
```

---

## 37. Caja / turno

El POS debe operar dentro de una sesión de caja.

Flujo:

```txt
abrir caja
registrar fondo inicial
realizar ventas
registrar retiros
registrar ingresos si aplica
cerrar caja
comparar esperado vs contado
registrar diferencia
```

---

## 38. Apertura de caja

Campos:

```txt
caja
sucursal
cajero
fondo inicial
fecha/hora apertura
```

Reglas:

```txt
una caja solo puede tener un turno abierto
un cajero solo puede operar una caja activa a la vez
```

---

## 39. Retiros de caja

Regla existente:

```txt
Supervisor puede autorizar retiros de efectivo.
```

Campos:

```txt
monto
motivo
solicitante
autorizador
fecha/hora
```

Regla:

```txt
caja no puede cerrar si hay retiros pendientes
```

---

## 40. Cierre de caja

Debe mostrar:

```txt
fondo inicial
ventas efectivo
ventas tarjeta
ventas mixtas
fiado
retiros
ingresos
esperado en efectivo
efectivo contado
diferencia
tickets
warnings
pending_reference
```

Requiere:

```txt
Cajero cierra o solicita cierre
Supervisor/Gerente revisa si hay diferencia según regla
```

---

## 41. Cancelaciones operativas POS

Diferenciar de cancelación CFDI.

Tipos:

```txt
cancelar producto antes de cobrar
cancelar venta antes de cobrar
cancelar venta después de cobrar
anular ticket
```

Reglas recomendadas:

```txt
antes de cobrar → Cajero puede cancelar
después de cobrar → requiere Supervisor/Gerente
si ya tiene CFDI → no cancelar desde POS
```

Siempre auditar:

```txt
venta
usuario
motivo
fecha/hora
monto
estado fiscal
```

---

## 42. Descuentos

V1 puede evitar descuentos complejos.

Regla recomendada:

```txt
descuento manual no permitido para Cajero
descuento/precio especial requiere autorización
```

Si se implementa:

```txt
motivo obligatorio
auditoría
```

---

## 43. Flujo POS completo

Flujo base:

```txt
Cajero entra con PIN dinámico
→ sistema valida usuario/caja/dispositivo
→ verifica caja abierta
→ captura productos
→ selecciona cliente opcional
→ aplica precios
→ cobra
→ genera ticket simple o QR según regla fiscal
→ imprime si aplica
→ descuenta inventario
→ registra movimiento de caja
→ vuelve a nueva venta
```

---

## 44. Flujo POS con cliente

```txt
buscar cliente
→ seleccionar cliente
→ cargar precios del cliente
→ vender productos
→ seleccionar pago
→ si pago fiado validar crédito
→ completar venta
```

---

## 45. Flujo POS por importe

Ejemplo:

```txt
cliente pide $20 de tortilla
→ cajero selecciona tortilla por importe
→ captura 20
→ sistema calcula kg según precio vigente
→ agrega línea de venta
```

Debe guardar:

```txt
producto
importe
kg calculado
precio/kg aplicado
```

---

## 46. Código de barras futuro

V1 debe quedar preparada para lector.

Reglas:

```txt
lector actúa como teclado
producto puede tener SKU/código
si código no existe, mostrar no encontrado
no permitir alta rápida desde POS en V1
```

---

## 47. Báscula futura

V1 opera manual.

Pero debe preparar:

```txt
producto pesable
cantidad kg
modo captura manual
modo báscula futuro
```

No implementar en V1:

```txt
lectura serial/USB
tara
peso estable
integración hardware
```

---

## 48. Reportes operativos mínimos

Más importantes que reportes fiscales en operación diaria:

```txt
ventas del día
ventas por cajero
ventas por producto
kg vendidos
paquetes vendidos
ventas por cliente
ventas por ruta
crédito pendiente
corte de caja
producción vs venta
merma
stock negativo
```

---

## 49. Dashboard Gerente

Debe responder:

```txt
cuánto vendí hoy
cuánto hay en caja
cuántos kg vendí
qué clientes deben
qué rutas están pendientes de liquidar
qué caja tiene diferencia
qué productos se vendieron más
qué POS están activos
qué stock está negativo
qué tickets fiscales están pendientes
```

---

## 50. Onboarding inicial

Flujo mínimo para una nueva tortillería:

```txt
crear negocio
crear Gerente propietario
crear sucursal
crear caja
activar POS
crear productos base
definir precios
crear usuarios
abrir caja
empezar venta
```

Productos base sugeridos:

```txt
Tortilla kg
Masa kg
Paquete tortilla 800g
Paquete masa 800g
```

---

## 51. Auditoría operativa

Auditar:

```txt
creación de usuario
desactivación de usuario
regeneración de PIN
activación POS
revocación dispositivo
cambio de precio
precio especial autorizado
cambio de stock
producción registrada
merma registrada
carga de ruta
liquidación de ruta
retiro de caja
cierre de caja
cancelación de venta
cambio de límite de crédito
abono de cliente
```

---

## 52. Relación con billing fiscal

Billing fiscal debe consumir información del core:

```txt
venta
cliente
método de pago
ticket
sucursal
caja
cajero
estado fiscal
```

Billing no debe decidir:

```txt
precios
crédito
inventario
rutas
turnos
```

Billing solo clasifica y procesa fiscalmente ventas ya registradas.

---

## 53. Huecos resueltos por este documento

Este documento cubre:

```txt
Owner como Gerente
usuarios
PIN dinámico semanal
límites del plan
POS por dispositivo/caja
no offline V1
rutas operativas reales
clientes/precios
crédito/fiado
inventario/producción
caja/turnos
flujo POS completo
```

---

## 54. Decisiones congeladas

```txt
Owner = Gerente con isOwner=true.
Cajero entra con PIN dinámico semanal.
La semana de PIN comienza en lunes.
POS activo se cobra/controla por dispositivo/caja.
V1 no tendrá offline real.
Rutas V1 incluyen carga, venta/cobro y liquidación.
Cajero no cambia precios manualmente.
Crédito solo para clientes con crédito habilitado.
Tortilla/masa pueden vender con stock negativo, con warning y auditoría.
```

---

## 55. Pendientes de validación futura

No bloquean V1 documental, pero deben revisarse antes de implementación completa:

```txt
límite exacto de usuarios por plan
límite exacto de POS por plan
si Supervisor puede regenerar PIN
si cierre de caja requiere aprobación siempre o solo con diferencia
si ruta la captura repartidor en app móvil o desde Manager
si se permiten descuentos reales en V1
```

---

## 56. Fuera de alcance V1

No implementar:

```txt
offline real
báscula integrada
open banking
roles personalizados
multi-RFC operativo
app móvil de repartidor avanzada
descuentos complejos
programa de lealtad
CRM avanzado
```

---

## 57. Siguiente paso documental

Después de este documento, compactar la documentación existente a:

```txt
docs/product/billing.md
docs/frontend/billing.md
docs/backend/billing.md
docs/contracts/billing-openapi.yaml
docs/contracts/billing-events.md
docs/architecture/monorepo.md
docs/architecture/local-dev-and-deploy.md
```

Billing debe referenciar este documento como base operativa.
