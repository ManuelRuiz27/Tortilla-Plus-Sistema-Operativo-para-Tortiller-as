# Tortilla Plus — UI/UX Wireframe Checklist V0.1

## 1. Objetivo

Checklist para revisar wireframes antes de pasar a diseño high-fidelity o implementación frontend.

Aplica para:

```txt
POS Cajero
PWA Gerente
Estados de error
Estados vacíos
Bloqueos por plan
Bloqueos por permisos
Flujos críticos
```

Este documento sirve para evitar que diseño entregue pantallas “bonitas” pero incompletas operacionalmente.

---

## 2. Estructura recomendada en Figma

```txt
Tortilla Plus UI/UX
├─ 00 Cover
├─ 01 Design Tokens
├─ 02 Components
├─ 03 POS Wireframes
├─ 04 POS High Fidelity
├─ 05 Manager Wireframes
├─ 06 Manager High Fidelity
├─ 07 Responsive
├─ 08 States
├─ 09 Prototypes
└─ 10 Developer Handoff
```

---

## 3. Naming de frames

Usar nombres claros y versionados.

```txt
POS / Login / Default
POS / Login / Error
POS / Cash Open / Default
POS / Cash Open / Discrepancy
POS / Sale / Empty Cart
POS / Sale / With Items
POS / Payment / Cash
POS / Payment / Card Error
POS / Sale Success / Default

Manager / Dashboard / Default
Manager / Dashboard / Alerts
Manager / Cash / Pending Withdrawals
Manager / Inventory / Negative Stock
Manager / Routes / Blocked Plan
```

No usar nombres vagos:

```txt
Pantalla 1
Dashboard nuevo
Caja copia
Final final
```

---

## 4. Checklist global por pantalla

Cada pantalla debe tener:

```txt
[ ] Nombre de pantalla
[ ] Usuario principal
[ ] Objetivo de la pantalla
[ ] Acción principal visible
[ ] Acción secundaria si aplica
[ ] Estado loading
[ ] Estado vacío
[ ] Estado error
[ ] Estado sin permisos si aplica
[ ] Estado bloqueado por plan si aplica
[ ] Validaciones visibles
[ ] Mensajes de error
[ ] Transición siguiente
[ ] Componentes identificables
[ ] Datos mínimos necesarios
[ ] Responsive considerado
```

Si una pantalla no cumple esto, no está lista para frontend.

---

## 5. Checklist Design Tokens

### Colores

```txt
[ ] Background principal
[ ] Surface/card
[ ] Surface soft
[ ] Primary
[ ] Primary hover
[ ] Secondary
[ ] Text principal
[ ] Text secundario
[ ] Border
[ ] Success
[ ] Warning
[ ] Danger
[ ] Info
[ ] Cash
[ ] Card
[ ] Credit
```

### Tipografía

```txt
[ ] Font principal definida
[ ] H1
[ ] H2
[ ] H3
[ ] Body
[ ] Caption
[ ] Label
[ ] Número grande POS
[ ] Total POS
[ ] Tabla compacta
```

### Espaciado

```txt
[ ] 4px
[ ] 8px
[ ] 12px
[ ] 16px
[ ] 24px
[ ] 32px
[ ] 48px
```

### Bordes y radios

```txt
[ ] Radius small
[ ] Radius medium
[ ] Radius large
[ ] Border default
[ ] Border focus
[ ] Border error
```

### Sombras

```txt
[ ] Shadow card
[ ] Shadow modal
[ ] Shadow dropdown
```

No usar sombras pesadas en POS.

---

## 6. Checklist Componentes Base

### Botones

Variantes mínimas:

```txt
[ ] Primary
[ ] Secondary
[ ] Danger
[ ] Ghost
[ ] Disabled
[ ] Loading
[ ] Icon button
```

Estados:

```txt
[ ] Default
[ ] Hover
[ ] Active
[ ] Focus
[ ] Disabled
[ ] Loading
```

Usos:

```txt
Primary = acción principal
Danger = cancelar/rechazar/desactivar
Secondary = navegación o acción secundaria
```

---

### Inputs

```txt
[ ] Text input
[ ] Number input
[ ] Money input
[ ] Password input
[ ] Select
[ ] Search input
[ ] Textarea
[ ] PIN input
```

Estados:

```txt
[ ] Default
[ ] Focus
[ ] Error
[ ] Disabled
[ ] Readonly
[ ] Loading
```

---

### Alerts

```txt
[ ] Success
[ ] Warning
[ ] Error
[ ] Info
[ ] Blocked by plan
[ ] Blocked by permission
```

Cada alert debe tener:

```txt
[ ] Título
[ ] Mensaje corto
[ ] Acción opcional
```

---

### Badges

```txt
[ ] Caja abierta
[ ] Caja cerrada
[ ] Pendiente
[ ] Autorizado
[ ] Rechazado
[ ] Stock bajo
[ ] Stock negativo
[ ] Plan free
[ ] Plan paid
[ ] Feature bloqueada
```

---

### Cards

```txt
[ ] Metric card
[ ] Alert card
[ ] Cash summary card
[ ] Product card
[ ] Branch card
[ ] Route card
```

Regla: usar cards para resumen, no para listas grandes.

---

### Tables

Toda tabla debe contemplar:

```txt
[ ] Header
[ ] Rows
[ ] Empty state
[ ] Loading state
[ ] Error state
[ ] Row actions
[ ] Search/filter si aplica
[ ] Pagination si aplica
[ ] Estado visual por fila
```

---

### Modals

```txt
[ ] Payment modal
[ ] PIN modal
[ ] Confirm modal
[ ] Form modal
[ ] Success modal
[ ] Error modal
```

Reglas:

```txt
[ ] Acción principal clara
[ ] Cancelar visible
[ ] Loading en submit
[ ] Error dentro del modal
[ ] No cerrar en submit activo
```

---

## 7. Checklist POS — Login

```txt
[ ] Logo visible
[ ] Email
[ ] Contraseña
[ ] Botón entrar
[ ] Error de credenciales
[ ] Loading al enviar
[ ] Diseño limpio sin distracciones
[ ] Responsive tablet/desktop
```

No incluir:

```txt
[ ] Hero grande
[ ] Texto comercial largo
[ ] Animaciones innecesarias
```

---

## 8. Checklist POS — Selección de sucursal

```txt
[ ] Lista de sucursales asignadas
[ ] Card por sucursal
[ ] Nombre de sucursal
[ ] Dirección breve si existe
[ ] Estado activa/inactiva
[ ] Botón entrar
[ ] Empty state sin sucursales
[ ] Error state
```

Validación UX:

```txt
[ ] Sucursal activa distinguible
[ ] Sucursal inactiva no permite entrar
```

---

## 9. Checklist POS — Apertura de caja

```txt
[ ] Sucursal visible
[ ] Cajero visible
[ ] Saldo sugerido visible
[ ] Input saldo contado
[ ] Diferencia calculada
[ ] Nota opcional
[ ] Botón abrir caja
[ ] Estado loading
[ ] Error caja ya abierta
[ ] Error sin permiso
```

Discrepancia:

```txt
[ ] Si saldo contado ≠ sugerido, mostrar alerta
[ ] La alerta explica que se auditará
[ ] No bloquea apertura
```

---

## 10. Checklist POS — Venta

### Layout

```txt
[ ] Header compacto
[ ] Panel captura rápida
[ ] Panel productos frecuentes
[ ] Buscador producto
[ ] Carrito fijo
[ ] Total grande
[ ] Botón cobrar siempre visible
[ ] Botón cancelar ticket
```

### Captura rápida

```txt
[ ] Tortilla kg
[ ] Tortilla $
[ ] Masa kg
[ ] Masa $
[ ] Paquete 800g
```

### Carrito

```txt
[ ] Producto
[ ] Cantidad
[ ] Unidad
[ ] Precio
[ ] Total
[ ] Eliminar item
[ ] Vaciar carrito
[ ] Total general
```

### Estados

```txt
[ ] Carrito vacío
[ ] Productos cargando
[ ] Productos no disponibles
[ ] Error al cargar productos
[ ] Sin conexión
```

### Teclado

```txt
[ ] F1 Tortilla kg
[ ] F2 Tortilla $
[ ] F3 Masa kg
[ ] F4 Masa $
[ ] F5 Paquete
[ ] F8 Cobrar
[ ] F9 Cancelar ticket
[ ] Ctrl + F Buscar
[ ] Enter confirma acción principal
[ ] Esc cierra modal
```

---

## 11. Checklist POS — Captura por kilo

```txt
[ ] Producto visible
[ ] Input cantidad kg
[ ] Precio por kg
[ ] Total calculado
[ ] Botón agregar
[ ] Error cantidad inválida
[ ] Error sin precio
[ ] Cierra al agregar
[ ] Regresa foco al flujo de venta
```

Criterio:

```txt
[ ] Total se entiende sin hacer cálculo mental
```

---

## 12. Checklist POS — Captura por monto

```txt
[ ] Producto visible
[ ] Input monto en pesos
[ ] Precio por kg
[ ] Equivalente kg
[ ] Botón agregar
[ ] Error monto inválido
[ ] Error sin precio
```

Criterio:

```txt
[ ] Kg aproximados visibles con máximo 3 decimales
```

---

## 13. Checklist POS — Cobro

### Modal general

```txt
[ ] Total visible
[ ] Tabs efectivo/tarjeta/mixto
[ ] Botón completar venta
[ ] Botón cancelar
[ ] Loading procesando venta
[ ] Error backend dentro del modal
```

### Efectivo

```txt
[ ] Recibido
[ ] Cambio
[ ] Botones rápidos de denominaciones
[ ] Botón exacto
[ ] Bloquea si recibido < total
```

### Tarjeta

```txt
[ ] Monto
[ ] Referencia
[ ] Proveedor/terminal
[ ] Bloquea si referencia vacía
[ ] Enfoca referencia si falta
```

### Mixto

```txt
[ ] Monto efectivo
[ ] Monto tarjeta
[ ] Referencia tarjeta
[ ] Indicador faltante/sobrante
[ ] Bloquea si suma no cuadra
```

---

## 14. Checklist POS — Venta exitosa

```txt
[ ] Mensaje venta completada
[ ] Folio visible
[ ] Total visible
[ ] Método de pago
[ ] Cambio si aplica
[ ] Botón nueva venta
[ ] Botón imprimir futuro o deshabilitado
[ ] Enter inicia nueva venta
```

Criterio:

```txt
[ ] El cajero entiende que puede seguir vendiendo inmediatamente
```

---

## 15. Checklist POS — Sin conexión

```txt
[ ] Banner visible
[ ] Mensaje claro
[ ] Carrito se mantiene
[ ] Botón cobrar bloqueado
[ ] No promete sincronización
```

Mensaje recomendado:

```txt
Sin conexión. No se puede completar la venta hasta reconectar.
```

---

## 16. Checklist Manager — Layout

```txt
[ ] Sidebar
[ ] Topbar
[ ] Selector de sucursal
[ ] Usuario/rol visible
[ ] Estado de plan
[ ] Alertas críticas
[ ] Content area
[ ] Responsive tablet
[ ] Responsive mobile
```

Sidebar:

```txt
[ ] Dashboard
[ ] Caja
[ ] Inventario
[ ] Producción
[ ] Productos
[ ] Precios
[ ] Clientes
[ ] Rutas
[ ] Facturación
[ ] Reportes
[ ] Configuración
```

---

## 17. Checklist Manager — Dashboard

```txt
[ ] Ventas del día
[ ] Caja actual
[ ] Efectivo esperado
[ ] Retiros pendientes
[ ] Stock negativo
[ ] Rutas pendientes
[ ] Facturación pendiente
[ ] Alertas arriba
[ ] Sin actividad del día
[ ] Error dashboard
```

No incluir en V0.1:

```txt
[ ] Gráficas complejas
[ ] BI avanzado
[ ] Predicciones
```

---

## 18. Checklist Manager — Caja

```txt
[ ] Caja actual
[ ] Cajero que abrió
[ ] Hora de apertura
[ ] Efectivo esperado
[ ] Ventas por método
[ ] Retiros pendientes
[ ] Historial de cajas
[ ] Faltantes/sobrantes
[ ] Ver detalle
[ ] Autorizar retiro
[ ] Rechazar retiro
[ ] Cerrar caja
```

Bloqueo:

```txt
[ ] Si hay retiro pendiente, cierre aparece bloqueado
[ ] Mensaje explica por qué
```

---

## 19. Checklist Manager — Detalle caja

```txt
[ ] Fondo inicial
[ ] Ventas efectivo
[ ] Ventas tarjeta
[ ] Ventas transferencia
[ ] Ventas crédito
[ ] Ingresos
[ ] Retiros autorizados
[ ] Retiros pendientes
[ ] Efectivo esperado
[ ] Efectivo contado
[ ] Diferencia
[ ] Estado abierta/cerrada
```

Criterio:

```txt
[ ] La pantalla se siente como corte operativo, no como dashboard decorativo
```

---

## 20. Checklist Manager — Retiros pendientes

```txt
[ ] Tabla de retiros
[ ] Fecha/hora
[ ] Sucursal
[ ] Cajero
[ ] Monto
[ ] Motivo
[ ] Descripción
[ ] Estado
[ ] Autorizar
[ ] Rechazar
[ ] Ver detalle
[ ] Modal PIN
[ ] Modal motivo rechazo
```

Validaciones:

```txt
[ ] Autorizar requiere PIN
[ ] Rechazar requiere motivo
[ ] Error PIN inválido visible
```

---

## 21. Checklist Manager — Inventario

```txt
[ ] Tabla inventario
[ ] Producto
[ ] Tipo
[ ] Stock actual
[ ] Mínimo
[ ] Unidad
[ ] Estado
[ ] Última actualización
[ ] Ajustar inventario
[ ] Ver movimientos
```

Estados:

```txt
[ ] OK
[ ] Stock bajo
[ ] Stock negativo
[ ] Sin stock
```

Criterio:

```txt
[ ] Stock negativo no se oculta
[ ] Stock negativo se distingue claramente
```

---

## 22. Checklist Manager — Producción

```txt
[ ] Fecha
[ ] Tortilla producida kg
[ ] Masa producida kg
[ ] Notas
[ ] Registrar producción
[ ] Cerrar producción
[ ] Estado sin producción
[ ] Estado producción abierta
[ ] Estado producción cerrada
```

Validaciones:

```txt
[ ] Cantidades no negativas
[ ] Al menos una cantidad > 0
[ ] Solo tortilla y masa
```

---

## 23. Checklist Manager — Productos

```txt
[ ] Tabla productos
[ ] Crear producto
[ ] Editar producto
[ ] Desactivar producto
[ ] Nombre
[ ] SKU
[ ] Tipo
[ ] Unidad
[ ] Rastrea inventario
[ ] Requiere producción
[ ] Estado
```

Package:

```txt
[ ] Si tipo package, pide producto base
[ ] Si tipo package, pide peso
[ ] Peso visible en resumen
```

Regla:

```txt
[ ] No usar eliminar físico como acción principal
```

---

## 24. Checklist Manager — Precios

```txt
[ ] Tabla precios
[ ] Producto
[ ] Modo venta
[ ] Precio actual
[ ] Vigencia
[ ] Estado
[ ] Actualizar precio
[ ] Ver historial
```

Modal cambio precio:

```txt
[ ] Producto
[ ] Modo venta
[ ] Nuevo precio
[ ] Fecha inicio
[ ] Motivo opcional
[ ] Advertencia de histórico
```

Mensaje obligatorio:

```txt
Las ventas anteriores conservarán su precio histórico.
```

---

## 25. Checklist Manager — Clientes

```txt
[ ] Tabla clientes
[ ] Crear cliente
[ ] Editar cliente
[ ] Nombre
[ ] Tipo
[ ] Teléfono
[ ] Crédito habilitado
[ ] Límite
[ ] Saldo
[ ] Estado
```

Detalle cliente:

```txt
[ ] Datos generales
[ ] Crédito
[ ] Límite
[ ] Saldo actual
[ ] Precios especiales
[ ] Ventas recientes
[ ] Movimientos de saldo
```

Alerta:

```txt
[ ] Si saldo > límite, destacarlo
```

---

## 26. Checklist Manager — Rutas

```txt
[ ] Feature blocked para plan sin rutas
[ ] Rutas activas
[ ] Repartidores
[ ] Pedidos pendientes
[ ] Pedidos cargados
[ ] Pedidos entregados
[ ] Liquidaciones pendientes
[ ] Crear ruta
[ ] Crear repartidor
```

Detalle ruta:

```txt
[ ] Clientes asignados
[ ] Pedidos del día
[ ] Producto cargado
[ ] Producto entregado
[ ] Producto devuelto
[ ] Cobrado
[ ] Pendiente de liquidar
[ ] Cargar pedido
[ ] Registrar entrega
[ ] Registrar cobro
[ ] Revisar devolución
[ ] Cerrar liquidación
[ ] Depositar a caja
```

Regla crítica:

```txt
[ ] Cobrado en ruta y liquidado a caja deben verse como cosas distintas
```

---

## 27. Checklist Manager — Facturación

```txt
[ ] Feature blocked para plan sin facturación
[ ] Ventas facturables
[ ] Factura global diaria
[ ] Facturas emitidas
[ ] Errores de timbrado
[ ] XML/PDF
```

Factura global:

```txt
[ ] Fecha
[ ] Sucursal
[ ] Ventas incluidas
[ ] Total
[ ] Estado generada/no generada
[ ] Botón generar global
[ ] Botones XML/PDF si ya existe
```

Errores:

```txt
[ ] Error PAC visible
[ ] Doble global bloqueada
[ ] Venta ya facturada distinguible
```

---

## 28. Checklist Manager — Reportes

```txt
[ ] Filtro fecha inicio
[ ] Filtro fecha fin
[ ] Filtro sucursal
[ ] Tabs de reportes
[ ] Tabla resultados
[ ] Empty state
[ ] Loading state
[ ] Error state
```

Reportes:

```txt
[ ] Ventas por día
[ ] Ventas por sucursal
[ ] Ventas por producto
[ ] Ventas por cliente
[ ] Retiros por motivo
[ ] Faltantes/sobrantes
```

No incluir en V0.1:

```txt
[ ] BI predictivo
[ ] Dashboards complejos
[ ] Data warehouse
```

---

## 29. Checklist Manager — Configuración

```txt
[ ] Datos de sucursal
[ ] Usuarios
[ ] Dispositivos POS
[ ] Motivos de retiro
[ ] Paquete 800g
[ ] Estado de plan
```

Plan:

```txt
[ ] Plan actual visible
[ ] Límite usuarios visible
[ ] Límite sucursales visible
[ ] Límite POS visible
[ ] Estado past_due/grace/suspended visible
```

---

## 30. Checklist Responsive

### POS Desktop / Tablet horizontal

```txt
[ ] Captura izquierda 65%
[ ] Carrito derecha 35%
[ ] Total siempre visible
[ ] Cobrar siempre visible
[ ] Botones rápidos grandes
[ ] Inputs grandes
```

### POS Mobile

```txt
[ ] Mostrar advertencia de pantalla no recomendada
[ ] Layout no se rompe
[ ] Cobrar sigue visible
```

### Manager Desktop

```txt
[ ] Sidebar completa
[ ] Topbar completa
[ ] Tablas completas
```

### Manager Tablet

```txt
[ ] Sidebar colapsable
[ ] Cards apilables
[ ] Tablas con scroll horizontal controlado
```

### Manager Mobile

```txt
[ ] Sidebar hamburguesa
[ ] Cards apiladas
[ ] Tablas simplificadas
[ ] Acciones críticas en menú
```

---

## 31. Checklist Prototype

El prototipo en Figma debe conectar:

### Auth

```txt
[ ] Login → Select branch
[ ] Select branch → POS
[ ] Select branch → Manager
```

### POS

```txt
[ ] POS Router → Apertura caja
[ ] Apertura caja → Venta
[ ] Venta → Modal kilo
[ ] Venta → Modal monto
[ ] Venta → Modal cobro
[ ] Cobro → Venta exitosa
[ ] Venta exitosa → Venta nueva
```

### Manager

```txt
[ ] Dashboard → Caja
[ ] Dashboard → Retiros
[ ] Dashboard → Inventario
[ ] Dashboard → Rutas
[ ] Dashboard → Facturación
[ ] Caja → Detalle caja
[ ] Clientes → Detalle cliente
[ ] Rutas → Detalle ruta
```

---

## 32. Checklist Developer Handoff

Cada pantalla debe entregar:

```txt
[ ] Frame desktop
[ ] Frame tablet si aplica
[ ] Frame mobile si aplica
[ ] Componentes usados
[ ] Estados
[ ] Medidas principales
[ ] Tokens aplicados
[ ] Notas de interacción
[ ] Flujo prototipado
[ ] Errores visibles
[ ] Empty states
[ ] Loading states
```

Cada componente debe entregar:

```txt
[ ] Nombre
[ ] Variantes
[ ] Estados
[ ] Props esperadas si aplica
[ ] Uso correcto
[ ] Uso incorrecto
```

---

## 33. Criterios de rechazo de diseño

Un diseño debe rechazarse si:

```txt
[ ] No muestra estados de error
[ ] No muestra estados vacíos
[ ] No considera permisos
[ ] No considera plan bloqueado
[ ] No permite operación POS con teclado
[ ] Oculta total de venta
[ ] Hace difícil cobrar
[ ] Mezcla cobro de ruta con caja
[ ] No destaca stock negativo
[ ] No muestra retiros pendientes
[ ] Usa gráficas decorativas sin función operativa
[ ] Requiere demasiados clics para vender
```

---

## 34. Prioridad de wireframes

### P0 — Obligatorios

```txt
Login
Selección sucursal
Apertura caja
Venta POS
Cobro POS
Venta exitosa
Dashboard gerente
Caja gerente
Retiros pendientes
Inventario
```

### P1 — Siguiente bloque

```txt
Producción
Productos
Precios
Clientes
Detalle cliente
```

### P2 — Comercial avanzado

```txt
Rutas
Detalle ruta
Facturación
Reportes
Configuración
```

---

## 35. Definition of Done Wireframes

```txt
[ ] P0 completo
[ ] P1 completo
[ ] P2 estructurado aunque sea low-fi
[ ] Todos los flujos críticos prototipados
[ ] Estados loading/empty/error incluidos
[ ] Estados blocked by plan incluidos
[ ] Estados blocked by permission incluidos
[ ] POS validado para teclado
[ ] Manager validado para alertas operativas
[ ] Handoff listo para frontend
```

---

## 36. Siguiente paso

Después de cargar este documento, el paquete frontend/UI-UX queda completo para iniciar:

```txt
FE-0 — Frontend Foundation
```

La siguiente tarea real no es diseñar pantallas finales; es validar que el repo tenga estructura, dependencias, router, stores, guards, API client y mocks base.
