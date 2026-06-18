# Tortilla Plus — Roadmap de Implementación UX Post R8 V0.1

**Área:** UX/UI, frontend, producto  
**Estado:** Propuesta oficial para desarrollo incremental  

---

## 1. Objetivo

Ordenar la implementación de cambios UX/UI después de R8 sin agregar reglas de negocio nuevas antes del piloto operativo.

---

## 2. Regla principal

No iniciar nuevas funcionalidades funcionales complejas hasta cerrar los cambios P0 de experiencia:

```txt
- navegación por áreas de trabajo
- panel del día
- POS rápido
- producción por receta guiada
- alertas operativas
- navegación por rol
```

---

## 3. Fase UX-1 — Reestructuración base

### Prioridad

```txt
P0
```

### Alcance

```txt
- Nuevo menú por áreas de trabajo.
- Header operativo persistente.
- Navegación por rol.
- Búsqueda global base.
- Badges de navegación por alertas/pendientes.
```

### Criterios de aceptación

```txt
- La UI no expone 17 módulos planos.
- Cada rol ve solo áreas útiles.
- POS es accesible en un click o atajo.
- Estado de sucursal/caja siempre visible.
```

---

## 4. Fase UX-2 — Panel del día y alertas

### Prioridad

```txt
P0
```

### Alcance

```txt
- Panel del día para dueño/gerente.
- Centro de alertas.
- Alertas por stock bajo, caja, producción, ruta, facturación y crédito.
- Acciones rápidas desde panel.
```

### Criterios de aceptación

```txt
- El gerente entiende el estado del día en menos de 10 segundos.
- Toda alerta crítica tiene acción.
- Las alertas se filtran por severidad y módulo.
```

---

## 5. Fase UX-3 — POS teclado-first

### Prioridad

```txt
P0
```

### Alcance

```txt
- Rediseñar POS para operación rápida.
- Agregar atajos F1-F9.
- Total fijo y dominante.
- Cliente opcional no invasivo.
- Estado de caja visible.
- Productos no vendibles ocultos.
```

### Criterios de aceptación

```txt
- Venta rápida sin mouse para productos principales.
- Cobro en menos de 3 acciones después de capturar productos.
- No aparecen insumos ni empaques.
```

---

## 6. Fase UX-4 — Producción por receta guiada

### Prioridad

```txt
P0
```

### Alcance

```txt
- Convertir producción por receta en wizard.
- Comparar esperado vs real.
- Mostrar rendimiento en kg y porcentaje.
- Mostrar reglas de variación.
- Solicitar motivo/autorización de forma clara.
- Mostrar movimientos generados al cierre.
```

### Criterios de aceptación

```txt
- El usuario entiende por qué se bloquea un cierre.
- Variaciones se explican en lenguaje operativo.
- Cierre de lote muestra impacto en inventario.
```

---

## 7. Fase UX-5 — Flujos operativos secundarios

### Prioridad

```txt
P1
```

### Alcance

```txt
- Cierre de caja guiado.
- Ruta modo repartidor.
- Ficha comercial de cliente.
- Movimientos de inventario legibles.
- Ficha técnica de receta.
- Ficha operativa de insumo.
```

### Criterios de aceptación

```txt
- Caja muestra diferencia antes de confirmar.
- Repartidor ve una secuencia simple cliente por cliente.
- Cliente muestra saldo, límite y precios especiales.
- Movimiento de inventario explica origen y referencia.
```

---

## 8. Fase UX-6 — Reportes accionables

### Prioridad

```txt
P2
```

### Alcance

```txt
- Rendimiento por lote.
- Consumo diario de insumos.
- Producción esperada vs real.
- Merma por receta.
- Stock bajo de insumos.
- Lotes con variación y autorización.
```

### Criterios de aceptación

```txt
- Reportes responden preguntas operativas.
- No son solo tablas exportables.
- Se conectan con alertas y decisiones.
```

---

## 9. Fase UX-7 — Piloto controlado

### Prioridad

```txt
P2
```

### Alcance

```txt
- Probar en operación real o simulada con roles reales.
- Medir tiempos de venta, producción, caja y ruta.
- Registrar fricciones.
- Convertir hallazgos en deuda funcional o técnica.
```

### Métricas

```txt
Tiempo para vender un ticket.
Tiempo para abrir/cerrar caja.
Tiempo para crear/cerrar lote.
Errores al capturar producción.
Tiempo para cargar ruta.
Tiempo para liquidar ruta.
Preguntas frecuentes del usuario.
Clicks/tabs por tarea.
```

---

## 10. Deudas funcionales post piloto

Evaluar después de piloto:

```txt
- tolerancia configurable por organización
- agua como insumo inventariable
- flujo formal masa -> tortilla
- descuento de empaques en venta
```

No implementar antes de validar dolor real.

---

## 11. Orden recomendado

```txt
1. UX-1 Navegación e IA
2. UX-2 Panel del día y alertas
3. UX-3 POS teclado-first
4. UX-4 Producción guiada
5. UX-5 Flujos secundarios
6. UX-6 Reportes accionables
7. UX-7 Piloto controlado
```
