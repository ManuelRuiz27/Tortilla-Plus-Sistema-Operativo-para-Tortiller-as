# Tortilla Plus — Copy UI y Lenguaje de Dominio V0.1

**Área:** UX writing, frontend, producto  
**Estado:** Propuesta oficial post R8  

---

## 1. Objetivo

Evitar que la UI exponga nombres técnicos del backend y definir lenguaje operativo entendible para tortillería.

---

## 2. Principios de lenguaje

```txt
- Hablar en términos de operación real.
- Evitar enums y nombres técnicos.
- Cada error debe explicar qué pasó y qué hacer.
- Los textos deben ser breves, claros y accionables.
- El cajero, repartidor o encargado no deben necesitar saber cómo se llama el modelo en backend.
```

---

## 3. Diccionario técnico → UI

| Backend / técnico | UI recomendado |
|---|---|
| raw_material | Insumo |
| packaging | Empaque |
| production_input_out | Consumo de insumo |
| production_in | Producción ingresada |
| sale_out | Salida por venta |
| route_load_out | Carga de ruta |
| route_return_in | Devolución de ruta |
| waste_out | Merma |
| manual_adjustment_in | Ajuste de entrada |
| manual_adjustment_out | Ajuste de salida |
| return_in | Devolución a inventario |
| return_waste | Devolución no vendible |
| recipe_based | Por receta |
| manual | Manual |
| yieldPercentage | Rendimiento |
| varianceReason | Motivo de variación |
| isRecipeIngredient | Se usa en recetas |
| allowNegativeStock | Permitir stock negativo |
| branch | Sucursal |
| productType | Tipo de producto |
| UnitConversion | Conversión de unidad |
| ProductionBatch | Lote de producción |
| RecipeVersion | Versión de receta |
| InventoryMovement | Movimiento de inventario |

---

## 4. Mensajes de error operativos

### Caja cerrada

```txt
La caja está cerrada.
Abre una caja para poder vender.
```

### Producto no vendible

```txt
Este producto no se puede vender.
Solo los productos marcados como vendibles aparecen en POS.
```

### Producto sin precio

```txt
Este producto no tiene precio activo en esta sucursal.
Configura un precio antes de venderlo.
```

### Stock insuficiente

```txt
No hay stock suficiente para completar esta operación.
Revisa inventario o registra un ajuste autorizado.
```

### Insumo bajo

```txt
El insumo está por debajo del mínimo.
Revisa inventario antes de producir.
```

### Receta sin versión activa

```txt
Esta receta no tiene una versión activa.
Activa una versión antes de crear un lote.
```

### Variación requiere motivo

```txt
La producción tiene una variación relevante.
Captura un motivo antes de cerrar el lote.
```

### Variación requiere autorización

```txt
La variación supera el límite permitido.
Se requiere autorización de un usuario con permiso.
```

### Ruta sin liquidar

```txt
Esta ruta aún no está liquidada.
Liquida la ruta para cerrar la operación del día.
```

### Crédito excedido

```txt
La venta supera el límite de crédito del cliente.
Se requiere autorización para continuar.
```

### Factura con error

```txt
La factura no pudo emitirse.
Revisa los datos fiscales o intenta nuevamente.
```

---

## 5. Labels por módulo

### POS

```txt
Mostrador
Nueva venta
Ticket actual
Cobrar
Pago recibido
Cambio
Cliente opcional
Venta a crédito
Cancelar venta
```

### Producción

```txt
Producción
Nuevo lote
Lote por receta
Lote manual
Insumos esperados
Insumos reales
Salida esperada
Salida real
Rendimiento
Cerrar lote
```

### Recetas

```txt
Recetas
Nueva receta
Versión activa
Crear nueva versión
Activar versión
Archivar versión
Producto de salida
Ingredientes
```

### Insumos

```txt
Insumos
Nuevo insumo
Unidad base
Conversión
Se usa en recetas
Stock actual
Stock mínimo
```

### Inventario

```txt
Inventario
Stock actual
Movimientos
Ajuste de inventario
Merma
Referencia
Origen
```

### Rutas

```txt
Reparto
Ruta del día
Preparar pedido
Cargar ruta
Entregar
Registrar pago
Registrar devolución
Liquidar ruta
```

### Caja

```txt
Caja
Abrir caja
Caja abierta
Cerrar caja
Efectivo esperado
Efectivo contado
Diferencia
Retiro
Ingreso
```

### Facturación

```txt
Facturación
Factura individual
Factura global
Autofactura
Pendiente
Emitida
Cancelada
Error de emisión
```

---

## 6. Microcopy para acciones destructivas

### Cancelar venta

```txt
¿Cancelar esta venta?
Los productos del ticket se eliminarán y no se registrará cobro.
```

### Cerrar lote

```txt
¿Cerrar este lote?
Se descontarán los insumos reales y se ingresará la producción al inventario.
```

### Archivar versión de receta

```txt
¿Archivar esta versión?
No se podrá usar para nuevos lotes, pero su historial se conservará.
```

### Cerrar caja

```txt
¿Cerrar caja?
Verifica el efectivo contado antes de confirmar.
```

---

## 7. Estados vacíos

### Sin productos

```txt
Aún no hay productos registrados.
Crea productos vendibles o insumos para comenzar.
```

### Sin recetas

```txt
Aún no hay recetas.
Crea una receta para producir por insumos.
```

### Sin lotes

```txt
No hay lotes de producción para este día.
Crea un lote para registrar producción.
```

### Sin movimientos

```txt
No hay movimientos con estos filtros.
Cambia los filtros o revisa otra fecha.
```

### Sin alertas

```txt
No hay alertas críticas por ahora.
```

---

## 8. Criterios de aceptación

```txt
- No aparecen enums técnicos en UI.
- Los errores indican acción posible.
- Los labels distinguen insumo, producto, receta, lote y movimiento.
- El usuario entiende por qué una acción está bloqueada.
- El copy es consistente entre POS, producción, inventario y rutas.
```
