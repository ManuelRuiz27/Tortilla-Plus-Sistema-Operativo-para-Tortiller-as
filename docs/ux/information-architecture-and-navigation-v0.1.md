# Tortilla Plus — Arquitectura de Información y Navegación UX V0.1

**Área:** UX/UI, frontend  
**Estado:** Propuesta oficial post R8  
**Documento base:** `docs/system-modules-and-flows-source-of-truth-v0.1.md`  

---

## 1. Objetivo

Rediseñar la navegación para que Tortilla Plus no se perciba como una lista plana de 17 módulos, sino como un sistema organizado por áreas de trabajo operativas.

---

## 2. Principio de navegación

La navegación debe organizarse por intención del usuario:

```txt
vender
producir
revisar inventario
repartir
administrar
facturar
analizar
configurar
```

No por nombres técnicos del backend.

---

## 3. Navegación principal propuesta

```txt
Inicio
Mostrador
Producción
Inventario
Reparto
Clientes
Administración
Fiscal / Reportes
Configuración
```

---

## 4. Mapeo de módulos a navegación UI

| Área UI | Módulos funcionales incluidos |
|---|---|
| Inicio | Caja, POS, producción, rutas, inventario, alertas, reportes rápidos |
| Mostrador | POS, caja, clientes rápidos, recibos |
| Producción | Producción por receta, producción manual, recetas, insumos |
| Inventario | Stock, ledger, movimientos, ajustes, merma |
| Reparto | Rutas, clientes de ruta, carga, entrega, devolución, liquidación |
| Clientes | Clientes, crédito, precios especiales, saldos, pagos |
| Administración | Productos, precios, usuarios, sucursales, dispositivos POS |
| Fiscal / Reportes | Facturación, autofactura, auditoría, reportes operativos |
| Configuración | SaaS, organización, planes, features, permisos avanzados |

---

## 5. Header operativo persistente

Debe estar visible en toda pantalla operativa.

### Datos mínimos

```txt
Sucursal activa
Caja abierta/cerrada
Usuario actual
Rol actual
Alertas críticas
Acceso rápido a POS
Búsqueda global
```

### Ejemplo

```txt
Sucursal Centro · Caja abierta · Ana / Cajera · 2 alertas
```

---

## 6. Pantalla inicial por rol

| Rol | Pantalla inicial | Navegación visible principal |
|---|---|---|
| Dueño | Panel del día | Inicio, Reportes, Caja, Producción, Reparto, Administración |
| Gerente | Panel operativo | Inicio, Producción, Inventario, Reparto, Clientes, Caja |
| Cajero | POS | Mostrador, Caja básica |
| Producción | Lotes del día | Producción, Insumos, Recetas |
| Repartidor | Ruta del día | Reparto |
| Contador | Fiscal / Reportes | Facturación, Reportes, Auditoría |
| Soporte | Configuración | Organizaciones, planes, features, usuarios |

---

## 7. Rutas frontend sugeridas

```txt
/app
/app/pos
/app/production
/app/production/batches
/app/production/batches/new
/app/production/batches/:id
/app/production/recipes
/app/production/recipes/:id
/app/production/inputs
/app/inventory
/app/inventory/movements
/app/inventory/adjustments
/app/routes
/app/routes/:id
/app/routes/:id/run
/app/routes/:id/settlement
/app/customers
/app/customers/:id
/app/admin/products
/app/admin/prices
/app/admin/users
/app/admin/branches
/app/fiscal/invoices
/app/fiscal/autoinvoice
/app/reports
/app/settings
```

---

## 8. Reglas de visibilidad

```txt
- Un usuario solo ve áreas donde tiene al menos una acción útil.
- El cajero no debe ver configuración SaaS ni recetas si no tiene permisos.
- El repartidor no debe ver módulos administrativos.
- Producción debe ver lotes, recetas e insumos, no caja/facturación salvo permiso explícito.
- Contador debe ver fiscal, reportes y auditoría, no operación diaria por defecto.
```

---

## 9. Panel del día

Debe ser la página de aterrizaje para dueño/gerente.

### Bloques

```txt
Ventas hoy
Caja actual
Producción abierta
Lotes con variación
Rutas pendientes
Stock bajo
Crédito pendiente
Facturas pendientes
Alertas críticas
Acciones rápidas
```

### Acciones rápidas

```txt
Abrir POS
Crear lote
Cargar ruta
Registrar ajuste
Cerrar caja
Crear factura global
```

---

## 10. Búsqueda global

Debe permitir buscar:

```txt
producto
cliente
receta
lote
venta
factura
ruta
movimiento de inventario
```

La búsqueda debe abrirse por teclado con atajo global.

Sugerencia:

```txt
Ctrl + K
```

---

## 11. Badges de navegación

La navegación debe mostrar contadores operativos:

```txt
Producción: 2 lotes abiertos
Inventario: 3 alertas
Reparto: 1 ruta sin liquidar
Fiscal: 4 facturas pendientes
Caja: abierta
```

---

## 12. Criterios de aceptación

```txt
- El usuario no ve una lista plana de 17 módulos.
- Cada rol aterriza en su pantalla útil.
- POS es accesible en un click o por atajo.
- Alertas críticas son visibles desde cualquier área.
- La navegación distingue operación diaria de configuración.
- Las rutas frontend siguen intención de usuario, no nombres técnicos internos.
```
