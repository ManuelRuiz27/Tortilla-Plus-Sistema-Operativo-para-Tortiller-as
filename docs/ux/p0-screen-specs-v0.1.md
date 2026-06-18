# Tortilla Plus — Especificación de Pantallas P0 UX V0.1

**Área:** UX/UI, frontend  
**Estado:** Propuesta oficial post R8  

---

## 1. Objetivo

Definir las pantallas P0 que deben modificarse o crearse antes de agregar nuevas funcionalidades.

P0 se enfoca en operación diaria:

```txt
- Panel del día
- POS teclado-first
- Producción por receta guiada
- Centro de alertas
- Header operativo persistente
- Navegación por rol
```

---

## 2. Pantalla: Panel del día

### Objetivo

Dar al dueño o gerente una vista inmediata del estado operativo.

### Usuario principal

```txt
Dueño
Gerente
```

### Bloques requeridos

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

### Estados vacíos

```txt
Sin lotes abiertos.
Sin rutas pendientes.
Sin alertas críticas.
Sin facturas pendientes.
```

### Criterios de aceptación

```txt
- El usuario entiende el estado del día en menos de 10 segundos.
- Hay acciones rápidas visibles.
- Las alertas críticas se muestran arriba del fold.
- Los KPIs usan lenguaje operativo.
```

---

## 3. Pantalla: POS teclado-first

### Objetivo

Permitir venta rápida de mostrador sin fricción.

### Usuario principal

```txt
Cajero
```

### Layout base

```txt
Captura rápida izquierda
Ticket actual derecha
Total fijo abajo o derecha
Métodos de pago visibles al cobrar
```

### Acciones rápidas

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

### Datos visibles

```txt
Caja abierta/cerrada
Sucursal
Cliente actual opcional
Items del ticket
Total
Pago recibido
Cambio
```

### Reglas

```txt
- No mostrar insumos.
- No mostrar empaques.
- No mostrar productos no vendibles.
- Si caja está cerrada, bloquear venta y ofrecer abrir caja.
```

---

## 4. Pantalla: Producción por receta wizard

### Objetivo

Guiar lote por receta hasta cierre sin ambigüedad.

### Usuario principal

```txt
Producción
Gerente
```

### Pasos

```txt
1. Elegir receta
2. Confirmar insumos esperados
3. Capturar reales
4. Revisar rendimiento
5. Cerrar lote
```

### Datos requeridos

```txt
Sucursal
Fecha
Receta/version
Salida esperada
Insumos esperados
Insumos reales
Salida real
Motivo de variación
Autorizador si aplica
```

### Estados

```txt
Cargando receta
Sin receta activa
Stock insuficiente
Requiere motivo
Requiere autorización
Cerrado correctamente
```

### Pantalla de revisión

Debe comparar:

```txt
Esperado vs real
Cantidad absoluta
Porcentaje de variación
Estado visual
```

---

## 5. Pantalla: Centro de alertas

### Objetivo

Concentrar excepciones operativas accionables.

### Tipos de alerta

```txt
Stock bajo
Stock negativo
Lote con variación
Caja sin cerrar
Ruta sin liquidar
Crédito excedido
Factura con error
Producto sin precio
Receta sin versión activa
```

### Campos mínimos

```txt
Tipo
Severidad
Mensaje
Módulo origen
Fecha
Acción recomendada
Estado
```

### Acciones

```txt
Ver detalle
Resolver
Ignorar temporalmente
Asignar responsable
```

### Criterios

```txt
- Toda alerta crítica debe tener acción.
- No mostrar errores técnicos sin traducción.
- Debe filtrarse por severidad y módulo.
```

---

## 6. Componente: Header operativo persistente

### Objetivo

Mantener estado crítico visible en toda la app.

### Contenido

```txt
Sucursal activa
Caja abierta/cerrada
Usuario
Rol
Alertas críticas
Búsqueda global
Acceso rápido a POS
```

### Regla

El header no debe saturar pantallas de alta velocidad como POS. En POS puede compactarse, pero no desaparecer el estado de caja.

---

## 7. Navegación por rol

### Objetivo

Reducir ruido y mostrar solo áreas útiles.

### Reglas

```txt
Dueño: todo excepto soporte técnico interno.
Gerente: operación, inventario, producción, rutas, clientes, caja.
Cajero: mostrador y caja básica.
Producción: producción, recetas, insumos.
Repartidor: ruta del día.
Contador: fiscal, reportes, auditoría.
Soporte: configuración SaaS.
```

---

## 8. Criterios globales P0

```txt
- La navegación ya no expone 17 módulos planos.
- El POS funciona con teclado.
- Producción por receta está guiada.
- Las alertas operativas son visibles.
- El header informa estado crítico.
- Cada rol ve solo lo necesario.
```
