# Tortilla Plus - Manual de arranque para dueño V0.1

**Rol:** Dueño / Administrador de organización  
**Estado:** Base para piloto / cuenta nueva  
**Caso cubierto:** Usuario recién registrado, organización o sucursal sin datos operativos  
**Objetivo:** Dejar la sucursal lista para vender, producir, controlar inventario y cerrar caja  

---

## 1. Antes de empezar

Este manual es el primer manual que debe leer un dueño nuevo.

Los manuales de cajero, gerente, producción e inventario sirven cuando la sucursal ya tiene datos cargados. Si la cuenta está en blanco, primero se debe completar este flujo de arranque.

---

## 2. Resultado esperado al terminar

Al finalizar este manual, la sucursal debe tener configurado lo mínimo para operar:

```txt
- organización confirmada
- primera sucursal activa
- usuarios principales creados
- productos base creados
- precios configurados
- insumos creados
- inventario inicial cargado
- receta base configurada
- caja/POS listo
- cliente de prueba creado
- venta de prueba realizada
- caja cerrada de prueba
```

---

## 3. Orden correcto de configuración

No configurar el sistema en cualquier orden. El orden recomendado es:

```txt
1. Organización
2. Sucursal
3. Usuarios
4. Productos vendibles
5. Precios
6. Insumos y empaques
7. Inventario inicial
8. Recetas
9. Caja / POS
10. Clientes
11. Rutas, si aplica
12. Facturación, si aplica
13. Prueba operativa completa
```

Si se brinca productos, precios o caja, el POS no podrá operar correctamente.

---

# 4. Paso 1 - Confirmar organización

## Objetivo

Verificar que la cuenta del dueño esté asociada a la organización correcta.

## Datos mínimos

```txt
- nombre comercial
- razón social, si aplica
- teléfono
- correo de contacto
- domicilio fiscal u operativo
- plan activo
```

## Validación

Antes de crear datos operativos, confirmar que se está dentro de la organización correcta.

## Error común

Crear sucursal, productos o usuarios en una organización equivocada.

---

# 5. Paso 2 - Crear o confirmar sucursal

## Objetivo

Crear la primera sucursal donde se registrarán ventas, caja, inventario y producción.

## Datos mínimos

```txt
- nombre de sucursal
- dirección
- responsable
- teléfono
- estatus activa
```

## Regla operativa

Sin sucursal activa no debe configurarse POS, caja, inventario ni producción.

## Validación

Entrar al sistema y confirmar que se puede seleccionar la sucursal.

---

# 6. Paso 3 - Crear usuarios principales

## Objetivo

Separar responsabilidades desde el inicio.

## Usuarios mínimos sugeridos

```txt
- Dueño / administrador
- Gerente
- Cajero
- Producción, si aplica
- Inventario, si aplica
```

## No crear todavía

```txt
- repartidor autenticado
- contador como rol final
```

Estos roles no forman parte del alcance estable del piloto actual.

## Validación

Cada usuario debe poder entrar solamente a las áreas que correspondan a su rol.

---

# 7. Paso 4 - Crear productos vendibles

## Objetivo

Cargar los productos que sí se pueden vender en POS.

## Productos base para tortillería

```txt
- Tortilla kg
- Tortilla por paquete 800 g
- Masa kg
- Salsa
- Guisos
- Otros productos de mostrador
```

## Campos mínimos por producto

```txt
- nombre
- SKU
- tipo de producto
- unidad
- vendible: sí
- controla inventario: sí/no
- requiere producción: sí/no
- estatus activo
```

## Reglas recomendadas

```txt
Tortilla kg:
- tipo: tortilla
- unidad: kg
- vendible: sí
- controla inventario: sí
- requiere producción: sí

Masa kg:
- tipo: masa
- unidad: kg
- vendible: sí
- controla inventario: sí
- requiere producción: sí

Paquete 800 g:
- tipo: package
- unidad: package
- vendible: sí
- controla inventario: sí
```

## Error común

Crear insumos como productos vendibles. Maíz, cal, harina y empaques no deben aparecer en POS como productos de venta.

---

# 8. Paso 5 - Configurar precios

## Objetivo

Permitir que el POS calcule importes correctamente.

## Precios mínimos

```txt
- tortilla por kg
- tortilla por monto
- paquete 800 g
- masa por kg
- masa por monto
- productos retail por unidad
```

## Validación

Entrar a POS y confirmar que los productos base muestran precio.

## Error común

Crear productos sin precio. Un producto activo sin precio genera fricción en POS y puede bloquear la venta.

---

# 9. Paso 6 - Crear insumos y empaques

## Objetivo

Preparar los productos que se consumen en producción, pero que no se venden directamente en POS.

## Insumos comunes

```txt
- maíz
- harina de maíz
- cal
- harina de trigo, si aplica
- gas, si después se controla como gasto o insumo
```

## Empaques comunes

```txt
- papel
- bolsa
- etiqueta
- caja, si aplica
```

## Configuración recomendada

```txt
- vendible: no
- controla inventario: sí
- ingrediente de receta: sí, cuando aplique
- permite stock negativo: no
```

---

# 10. Paso 7 - Configurar conversiones

## Objetivo

Permitir que el sistema entienda unidades de compra y unidades de consumo.

## Ejemplos

```txt
1 costal de maíz = 50 kg
1 cubeta de maíz = 25 kg
1 bulto de cal = 25 kg
1 costal de harina = 20 kg
```

## Validación

Confirmar que los insumos se pueden capturar en unidad operativa y convertirse a kg.

---

# 11. Paso 8 - Cargar inventario inicial

## Objetivo

Registrar existencias iniciales antes de vender o producir.

## Inventario mínimo

```txt
- tortilla disponible
- masa disponible
- productos retail
- maíz
- harina
- cal
- empaques
```

## Motivo recomendado para ajuste inicial

```txt
Carga inicial de inventario
```

## Regla operativa

Todo inventario inicial debe entrar como movimiento de inventario, no como cambio manual directo en base de datos.

---

# 12. Paso 9 - Crear receta base

## Objetivo

Permitir producción por receta y control de insumos.

## Receta mínima sugerida

```txt
Nombre: Masa estándar
Salida esperada: 33 kg de masa
Insumos:
- maíz: 25 kg
- harina de maíz: 8 kg
- cal: 0.100 kg
```

## Validación

Crear un lote por receta y confirmar que el sistema muestre insumos esperados.

## Error común

Intentar producir por receta sin inventario suficiente de insumos.

---

# 13. Paso 10 - Configurar caja / POS

## Objetivo

Dejar listo el punto de venta.

## Configuración mínima

```txt
- sucursal activa
- dispositivo POS o caja configurada
- cajero asignado
- caja abierta
- monto inicial
```

## Validación

El cajero debe poder entrar a POS y ver productos vendibles con precio.

## Error común

Intentar vender sin caja abierta. El sistema debe bloquear o solicitar apertura de caja.

---

# 14. Paso 11 - Crear cliente de prueba

## Objetivo

Validar clientes frecuentes y crédito sin afectar operación real.

## Cliente mínimo

```txt
Nombre: Cliente prueba
Tipo: mostrador o tienda
Teléfono: opcional
Crédito: desactivado al inicio
```

## Si se usará crédito

Configurar:

```txt
- crédito habilitado
- límite de crédito
- saldo inicial, si aplica
- precios especiales, si aplica
```

---

# 15. Paso 12 - Configurar rutas, si aplica

## Objetivo

Preparar reparto a tiendas, puestos o clientes recurrentes.

## Configuración mínima

```txt
- ruta
- cliente asignado
- chofer como entidad operativa
- productos por entregar
```

## Nota importante

El piloto actual no incluye repartidor autenticado como usuario final. La ruta se opera desde la experiencia de gerente.

---

# 16. Paso 13 - Configurar facturación, si aplica

## Objetivo

Preparar emisión fiscal cuando el negocio vaya a facturar.

## Datos mínimos

```txt
- razón social
- RFC
- régimen fiscal
- código postal fiscal
- certificados, si aplica
- PAC o sandbox
- serie y folio
```

## Advertencia

No prometer facturación real si PAC, certificados, CORS o ambiente productivo no están configurados.

---

# 17. Paso 14 - Prueba operativa completa

Antes de operar con usuarios reales, ejecutar una prueba de extremo a extremo.

## Flujo mínimo de prueba

```txt
1. Abrir caja.
2. Vender 1 kg de tortilla.
3. Vender 1 producto retail.
4. Crear lote por receta.
5. Cerrar lote por receta.
6. Revisar movimientos de inventario.
7. Crear cliente de prueba.
8. Hacer venta a cliente, si aplica.
9. Cerrar caja.
10. Revisar reporte del día.
```

## Resultado esperado

```txt
- venta registrada
- caja actualizada
- inventario descontado
- producción ingresada
- insumos consumidos
- movimientos visibles
- reporte actualizado
```

---

# 18. Checklist de arranque

Antes de capacitar a cajeros o gerentes, confirmar:

```txt
[ ] Organización correcta
[ ] Sucursal activa
[ ] Usuario dueño activo
[ ] Usuario gerente creado
[ ] Usuario cajero creado
[ ] Productos base creados
[ ] Precios configurados
[ ] Insumos creados
[ ] Conversiones configuradas
[ ] Inventario inicial cargado
[ ] Receta base activa
[ ] Caja/POS configurado
[ ] Cliente de prueba creado
[ ] Venta de prueba completada
[ ] Cierre de caja probado
[ ] Reporte revisado
```

---

# 19. Errores comunes de cuenta nueva

| Caso | Causa probable | Solución |
|---|---|---|
| POS sin productos | No hay productos vendibles activos | Crear productos base y precios |
| Producto sin precio | Falta precio por sucursal | Configurar precio antes de vender |
| No se puede vender | Caja cerrada | Abrir caja |
| No aparece receta | No hay receta activa | Crear receta y versión activa |
| No se puede cerrar lote | Falta stock o motivo de variación | Revisar inventario y capturar motivo |
| Inventario no cuadra | No se cargó inventario inicial | Registrar ajuste inicial con motivo |
| Ruta no aparece | Feature no habilitada o sin datos | Revisar plan y crear ruta |
| Factura no se emite | PAC o datos fiscales incompletos | Validar configuración fiscal |

---

# 20. Qué no se debe prometer todavía

Durante piloto o demo inicial, no prometer:

```txt
- repartidor autenticado
- contador como rol final
- búsqueda global funcional
- báscula real
- alertas backend formales
- PAC real si no está configurado
- tolerancias configurables por organización
- agua inventariable
- flujo obligatorio masa -> tortilla
- descuento automático de empaques en venta
```

---

# 21. Orden correcto de lectura de manuales

Para un usuario nuevo, el orden debe ser:

```txt
1. Manual de arranque para dueño
2. Manual del administrador
3. Manual del gerente
4. Manual del cajero
5. Manual de producción
6. Manual de inventario
```

No usar el manual del gerente como primer manual de onboarding. El gerente supervisa operación; el dueño primero debe configurar la operación.
