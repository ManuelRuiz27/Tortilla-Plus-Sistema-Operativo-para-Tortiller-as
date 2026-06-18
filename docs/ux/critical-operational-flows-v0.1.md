# Tortilla Plus — Flujos Operativos Críticos UX V0.1

**Área:** UX/UI, flujos, QA funcional  
**Estado:** Propuesta oficial post R8  

---

## 1. Objetivo

Definir cómo deben comportarse los flujos críticos del sistema desde perspectiva de usuario, no desde implementación backend.

Cada flujo debe ser claro, guiado y medible.

---

## 2. Flujo POS / Mostrador

### Usuario principal

```txt
Cajero
```

### Objetivo

Vender rápido, con mínimo teclado y sin exponer productos no vendibles.

### Flujo UX

```txt
Caja abierta
→ capturar producto/modo
→ agregar item
→ revisar ticket
→ cobrar
→ confirmar pago
→ imprimir/enviar recibo
```

### Atajos recomendados

```txt
F1 Tortilla kg
F2 Tortilla $
F3 Masa kg
F4 Masa $
F5 Paquete
F6 Buscar producto
F9 Cobrar
Esc Cancelar
```

### Estados de error

```txt
Caja cerrada.
Producto sin precio.
Producto no vendible.
Stock insuficiente para retail/ruta.
Cliente excede crédito.
Pago incompleto.
```

### Criterios UX

```txt
- Total siempre visible.
- Cambio siempre visible.
- Cliente opcional, no obligatorio.
- Insumos y empaques no aparecen.
- Cobro en menos de 3 acciones después de capturar productos.
```

---

## 3. Flujo Producción por receta

### Usuario principal

```txt
Encargado de producción
Gerente
```

### Objetivo

Crear y cerrar lote con consumo real de insumos, salida real y rendimiento entendible.

### Flujo UX recomendado

```txt
Paso 1: Elegir receta
Paso 2: Confirmar insumos esperados
Paso 3: Capturar insumos reales y salida real
Paso 4: Revisar rendimiento
Paso 5: Cerrar lote
```

### Estados

```txt
Abierto
Capturando reales
Requiere motivo
Requiere autorización
Cerrado
Cancelado
```

### Reglas visuales de rendimiento

```txt
< 3% variación:
  Verde. Cierre normal.

3% a 10%:
  Ámbar. Motivo requerido.

> 10%:
  Rojo. Motivo y autorización requeridos.
```

### Microcopy

```txt
Produjiste 1.2 kg menos de lo esperado.
Esta diferencia requiere motivo.
Esta diferencia requiere autorización de gerente.
```

### Criterios UX

```txt
- Comparar esperado vs real en la misma fila.
- Mostrar variación en kg y porcentaje.
- No cerrar lote sin explicar bloqueo.
- Mostrar movimientos generados después del cierre.
```

---

## 4. Flujo Recetas

### Usuario principal

```txt
Gerente
Encargado de producción
```

### Objetivo

Configurar fórmulas de producción sin romper históricos.

### Flujo UX

```txt
Crear receta
→ elegir salida masa/tortilla
→ agregar ingredientes
→ guardar versión inicial
→ activar versión
→ crear nueva versión cuando cambie la fórmula
```

### Microcopy obligatorio

Cuando una receta activa se modifique:

```txt
Esta receta ya tiene historial. Para cambiarla se creará una nueva versión.
```

### Criterios UX

```txt
- Mostrar versión activa.
- Mostrar historial de versiones.
- Evitar edición destructiva.
- Mostrar uso de receta en lotes.
- Mostrar ingredientes con unidad normalizada.
```

---

## 5. Flujo Insumos y conversiones

### Usuario principal

```txt
Gerente
Encargado de producción
```

### Objetivo

Crear insumos y conversiones entendibles para producción.

### Flujo UX

```txt
Crear insumo
→ elegir unidad base
→ marcar si se usa en recetas
→ capturar conversión opcional
→ capturar stock inicial opcional
→ usar en receta
```

### Criterios UX

```txt
- Separar insumos de productos vendibles.
- Mostrar unidad base visible.
- Mostrar conversiones como lenguaje humano: 1 cubeta = 25 kg.
- Mostrar recetas donde se usa el insumo.
```

---

## 6. Flujo Inventario / Movimientos

### Usuario principal

```txt
Gerente
Dueño
Encargado de inventario
```

### Objetivo

Entender qué pasó con el stock y por qué.

### Flujo UX

```txt
Ver stock
→ filtrar producto/sucursal
→ abrir movimientos
→ revisar referencia
→ tomar acción si hay alerta
```

### Movimiento legible

```txt
Consumo de insumo
Maíz: -25.000 kg
Referencia: Lote #PROD-0143
Usuario: Producción
Fecha: 17/06/2026 08:31
```

### Criterios UX

```txt
- No mostrar solo códigos técnicos.
- Filtros visibles.
- Cada movimiento debe tener referencia.
- Stock bajo y negativo deben ser visibles.
```

---

## 7. Flujo Caja

### Usuario principal

```txt
Cajero
Gerente
```

### Objetivo

Abrir, operar y cerrar caja sin confusión.

### Flujo UX

```txt
Abrir caja
→ operar ventas
→ registrar ingresos/retiros
→ revisar resumen
→ capturar efectivo contado
→ ver diferencia
→ cerrar caja
```

### Criterios UX

```txt
- Estado de caja persistente en POS.
- Cierre guiado por pasos.
- Diferencia visible antes de confirmar.
- Motivo obligatorio si hay diferencia según regla operativa.
```

---

## 8. Flujo Reparto

### Usuarios principales

```txt
Gerente
Repartidor
```

### Experiencias separadas

```txt
Planeación de ruta — gerente
Ejecución de ruta — repartidor
```

### Flujo gerente

```txt
Crear ruta
→ asignar clientes
→ ordenar ruta
→ preparar pedidos
→ validar stock
→ liberar ruta
```

### Flujo repartidor

```txt
Ver cliente actual
→ entregar
→ cobrar
→ registrar devolución
→ pasar al siguiente cliente
→ cerrar recorrido
```

### Criterios UX

```txt
- Repartidor no ve módulos administrativos.
- Debe saber cliente actual y siguiente acción.
- Devolución debe ser rápida.
- Liquidación pendiente debe alertarse.
```

---

## 9. Flujo Clientes / Crédito

### Usuario principal

```txt
Gerente
Cajero
Repartidor
```

### Objetivo

Vender con crédito controlado y saldos visibles.

### Flujo UX

```txt
Seleccionar cliente
→ ver saldo/límite
→ aplicar precio especial
→ vender a crédito
→ actualizar saldo
→ registrar pago
```

### Alerta de crédito

```txt
Saldo actual: $2,850
Venta actual: $400
Nuevo saldo: $3,250
Límite: $3,000
Requiere autorización.
```

---

## 10. Flujo Facturación

### Usuario principal

```txt
Dueño
Contador
Cajero autorizado
```

### Flujo UX

```txt
Venta completada
→ cliente solicita factura
→ validar datos fiscales
→ emitir factura individual o global
→ consultar estado
→ cancelar si aplica
```

### Criterios UX

```txt
- Mostrar estado claro: pendiente, emitida, cancelada, error.
- Separar factura individual de global.
- Error fiscal debe indicar acción corregible.
```

---

## 11. Criterio general de aceptación

Un flujo crítico está aceptado si:

```txt
- tiene usuario objetivo claro
- tiene acción primaria clara
- muestra estado actual
- explica bloqueos en lenguaje operativo
- evita nombres técnicos visibles
- reduce pasos innecesarios
- tiene estados vacíos y de error definidos
```
