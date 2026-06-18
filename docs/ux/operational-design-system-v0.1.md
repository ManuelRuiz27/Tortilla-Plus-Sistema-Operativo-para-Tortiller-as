# Tortilla Plus — Sistema de Diseño Operativo V0.1

**Área:** UX/UI, frontend, design system  
**Estado:** Propuesta oficial post R8  

---

## 1. Objetivo

Definir los lineamientos visuales y patrones de interfaz para una UI operativa, clara y diferenciada para tortillerías.

Este documento no reemplaza componentes técnicos. Define criterios de diseño, tokens sugeridos, estados y lenguaje visual.

---

## 2. Dirección estética

```txt
Industrial-operativa mexicana
+ cálida
+ rápida en mostrador
+ clara en producción
+ sobria para administración
+ legible en operación diaria
```

Evitar:

```txt
- SaaS genérico blanco sin identidad.
- Tarjetas idénticas para todo.
- Uso excesivo de gradientes.
- Componentes decorativos sin utilidad.
- Íconos ambiguos.
```

---

## 3. Paleta base

```txt
--color-bg-main:        #F6F1E7;
--color-surface:        #FFFDF7;
--color-surface-muted:  #EFE5D4;
--color-panel-dark:     #2B2118;
--color-primary:        #D97706;
--color-primary-soft:   #FAD7A0;
--color-success:        #2F7D32;
--color-warning:        #F59E0B;
--color-danger:         #B91C1C;
--color-info:           #2563EB;
--color-text-main:      #1F1A14;
--color-text-muted:     #6B5E4A;
--color-border:         #DDD0BD;
```

---

## 4. Semántica de color

| Uso | Color | Regla |
|---|---|---|
| Acción principal | Primario | Crear, continuar, cobrar, cerrar flujo |
| Éxito | Verde | Producción correcta, caja cuadrada, lote cerrado |
| Advertencia | Ámbar | Variación moderada, stock bajo, pendiente |
| Error / bloqueo | Rojo | Stock crítico, autorización requerida, error fiscal |
| Información | Azul | Datos auxiliares, ayuda, estado informativo |
| Fondo operativo | Masa claro | Contexto general de trabajo |
| Panel crítico | Oscuro | Header, navegación o áreas de alta jerarquía |

---

## 5. Tipografía

### Recomendación

```txt
Números / KPIs / totales:
- Archivo
- IBM Plex Sans Condensed
- Saira Condensed

Texto de operación:
- Atkinson Hyperlegible
- Source Sans 3
- IBM Plex Sans
```

### Reglas

```txt
- Totales de POS siempre en tamaño dominante.
- Kilos, pesos y variaciones deben alinearse numéricamente.
- No usar fuentes decorativas para datos operativos.
- Evitar texto pequeño en producción, caja y POS.
```

---

## 6. Estados operativos

### Producción

```txt
Abierto
Capturando reales
Listo para cierre
Requiere motivo
Requiere autorización
Cerrado
Cancelado
```

### Ruta

```txt
Pendiente
Preparada
Cargada
En ruta
Entregada parcialmente
Liquidación pendiente
Liquidada
```

### Caja

```txt
Cerrada
Abierta
En cierre
Cerrada con diferencia
```

### Facturación

```txt
Pendiente
Solicitada
Emitida
Cancelada
Error PAC
```

---

## 7. Componentes operativos base

### Header operativo

Debe mostrar:

```txt
- sucursal
- caja
- usuario
- rol
- alertas
- acceso rápido a POS
```

### Card operativa

Debe responder:

```txt
¿Qué está pasando?
¿Cuál es el número principal?
¿Está bien, pendiente o bloqueado?
¿Qué acción sigue?
```

### Tabla operativa

Debe incluir:

```txt
- filtros visibles
- búsqueda
- estado
- acción primaria clara
- columna de última actividad cuando aplique
```

### Badge operativo

Ejemplos:

```txt
Stock bajo
Requiere motivo
Caja abierta
Ruta pendiente
Sin precio
Versión activa
```

---

## 8. Botones

### Primario

Uso:

```txt
Cobrar
Cerrar lote
Guardar receta
Crear ruta
Cerrar caja
```

### Secundario

Uso:

```txt
Guardar borrador
Ver detalle
Editar
Duplicar
Imprimir
```

### Destructivo

Uso:

```txt
Cancelar venta
Cancelar lote
Eliminar conversión
Archivar versión
```

### Regla

Toda pantalla debe tener una sola acción primaria dominante.

---

## 9. Alertas

### Tipos

```txt
Informativa
Advertencia
Bloqueante
Crítica
```

### Ejemplos

```txt
Stock bajo de maíz.
Lote con variación requiere motivo.
Caja abierta desde ayer.
Ruta Norte sin liquidar.
Producto sin precio activo.
Receta sin versión activa.
```

### Regla

Una alerta debe indicar:

```txt
- qué pasó
- por qué importa
- qué acción puede tomar el usuario
```

---

## 10. Movimiento y microinteracciones

Usar movimiento solo cuando ayude a entender estado:

```txt
- confirmación de cobro
- transición de paso en wizard
- alerta crítica al aparecer
- cambio de estado de lote
- cierre de caja exitoso
```

Evitar animaciones decorativas en POS o caja.

---

## 11. Densidad visual

### POS

```txt
Alta densidad, teclado-first, total dominante.
```

### Producción

```txt
Densidad media, wizard y comparación esperado vs real.
```

### Inventario

```txt
Densidad alta, filtros y tablas trazables.
```

### Reportes

```txt
Densidad media, KPIs y tablas resumidas.
```

---

## 12. Criterios de aceptación

```txt
- La UI tiene identidad visual propia.
- Los estados críticos se distinguen por color y texto.
- El POS prioriza rapidez.
- Producción prioriza claridad y prevención de errores.
- Inventario prioriza trazabilidad.
- El lenguaje visible es operativo, no técnico.
```
