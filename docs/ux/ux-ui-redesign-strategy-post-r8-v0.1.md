# Tortilla Plus — Estrategia UX/UI Post R8 V0.1

**Producto:** Tortilla Plus — Sistema Operativo para Tortillerías  
**Área:** UX/UI, producto, frontend  
**Estado:** Propuesta oficial para implementación post R8  
**Documento base:** `docs/system-modules-and-flows-source-of-truth-v0.1.md`  

---

## 1. Objetivo

Definir la dirección UX/UI post R8 para convertir el sistema de 17 módulos funcionales en una experiencia operativa clara, rápida y usable para una tortillería real.

La prioridad ya no es agregar más módulos. La prioridad es reducir fricción, ordenar navegación, guiar flujos críticos y hacer visibles alertas operativas.

---

## 2. Diagnóstico UX

Tortilla Plus ya no debe tratarse como un POS simple. Es un sistema operativo ligero para tortillerías con:

```txt
- POS
- caja
- producción
- inventario
- insumos
- recetas
- rutas
- crédito
- facturación
- auditoría
- reportes
```

El riesgo principal post R8 es cognitivo-operativo:

```txt
- demasiados módulos visibles
- navegación plana
- pantallas CRUD donde debería haber flujos guiados
- lenguaje técnico expuesto al usuario
- baja visibilidad de excepciones operativas
- poca diferenciación por rol
```

---

## 3. Principio rector

La UI debe responder primero:

```txt
Hoy, ¿qué tengo que hacer?
```

No debe iniciar desde una lista de módulos. Debe iniciar desde estado operativo, alertas y acciones rápidas.

---

## 4. Dirección visual

### Estética propuesta

```txt
Industrial-operativa mexicana
+ cálida
+ densa donde importa
+ rápida en mostrador
+ clara en producción
+ sobria para administración
```

No usar estética SaaS genérica tipo dashboard blanco sin identidad.

### Paleta sugerida

```txt
Fondo principal:      #F6F1E7  masa / maíz claro
Panel oscuro:         #2B2118  comal / barro oscuro
Primario operativo:   #D97706  maíz tostado
Éxito:                #2F7D32  producción correcta
Alerta:               #F59E0B  variación / pendiente
Error:                #B91C1C  stock crítico / bloqueo
Texto fuerte:         #1F1A14
Texto secundario:     #6B5E4A
Borde suave:          #DDD0BD
```

### Tipografía sugerida

```txt
Números grandes / KPIs:
- Archivo
- IBM Plex Sans Condensed
- Saira Condensed
- Chivo

Texto operativo:
- Atkinson Hyperlegible
- Source Sans 3
- IBM Plex Sans
```

---

## 5. Cambio estructural: de 17 módulos a 7 áreas de trabajo

La fuente de verdad mantiene 17 módulos funcionales. La UI no debe exponerlos como menú plano.

### Áreas de trabajo UI

```txt
1. Inicio
2. Mostrador
3. Producción
4. Inventario
5. Reparto
6. Administración
7. Fiscal / Reportes
8. Configuración
```

La configuración puede ocultarse según rol.

---

## 6. Prioridades UX

### P0 — Antes de nuevas funcionalidades

```txt
- rediseñar navegación por áreas de trabajo
- crear panel del día
- agregar header operativo persistente
- agregar alertas globales
- aplicar navegación por rol
- optimizar POS teclado-first
- convertir producción por receta en wizard
```

### P1 — Para piloto controlado

```txt
- cierre de caja guiado
- ruta modo repartidor
- ficha comercial de cliente
- movimientos de inventario legibles
- estados visuales por flujo
- ficha técnica de recetas
- ficha operativa de insumos
```

### P2 — Después del piloto

```txt
- dashboard de rendimiento
- dashboard de consumo de insumos
- reporte de merma
- reporte de stock bajo
- lotes con variación
- registro de hallazgos del piloto
```

---

## 7. Qué no modificar todavía

No implementar todavía estas deudas funcionales aceptadas temporalmente salvo hallazgo real en piloto:

```txt
- tolerancia configurable por organización
- agua como insumo inventariable
- flujo formal masa -> tortilla obligatorio
- descuento de empaques en venta
```

---

## 8. Criterios de diseño obligatorios

```txt
- Nada de dashboards genéricos.
- Nada de CRUD plano cuando el flujo requiere guía.
- POS siempre rápido y teclado-first.
- Producción siempre guiada y con estados claros.
- Inventario siempre trazable.
- Alertas antes que reportes tardíos.
- UX por rol, no por lista completa de módulos.
- Lenguaje operativo, no nombres técnicos del backend.
```

---

## 9. Resultado esperado

La UI debe pasar de:

```txt
Sistema con 17 módulos visibles
```

a:

```txt
Sistema con áreas de trabajo, flujos guiados, alertas operativas y acciones rápidas por rol.
```
