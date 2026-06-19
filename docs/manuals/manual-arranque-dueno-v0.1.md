# Tortilla Plus - Manual de arranque para dueno V0.1

**Rol:** Dueno / administrador de organizacion  
**Estado:** Base para piloto / cuenta nueva  
**Caso cubierto:** usuario recien registrado, organizacion o sucursal sin datos operativos  
**Objetivo:** dejar la sucursal lista para vender, producir, controlar inventario y cerrar caja  
**Screenshots UX-R12:** `docs/manuals/screenshots/21-settings.png` a `32-venta-prueba-pos.png`

---

## 1. Antes de empezar

Este manual es el primer manual que debe leer un dueno nuevo.

Los manuales de cajero, gerente, produccion e inventario sirven cuando la sucursal ya tiene datos cargados. Si la cuenta esta en blanco, primero se debe completar este flujo de arranque.

---

## 2. Resultado esperado al terminar

Al finalizar este manual, la sucursal debe tener configurado lo minimo para operar:

```txt
- organizacion confirmada
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

## 3. Orden correcto de configuracion

```txt
1. Organizacion
2. Sucursal
3. Usuarios
4. Productos vendibles
5. Precios
6. Insumos y empaques
7. Conversiones si aplica
8. Inventario inicial
9. Recetas
10. Caja / POS
11. Clientes
12. Rutas, si aplica
13. Facturacion, si aplica
14. Prueba operativa completa
15. Cierre de caja
16. Reporte
```

Si se brinca productos, precios o caja, el POS no podra operar correctamente.

---

## 4. Confirmar organizacion

**Objetivo:** verificar que la cuenta del dueno este asociada a la organizacion correcta.

Datos minimos:

```txt
- nombre comercial
- razon social, si aplica
- telefono
- correo de contacto
- domicilio fiscal u operativo
- plan activo
```

Screenshot:

```txt
screenshots/21-settings.png
```

Estado visual V0.1:

```txt
La configuracion general existe dentro de Sucursal, cajas y plan.
Pendiente UX / no disponible visualmente para onboarding V0.1: no hay wizard separado de organizacion para cuenta nueva.
```

---

## 5. Crear o confirmar sucursal

**Objetivo:** confirmar la primera sucursal donde se registraran ventas, caja, inventario y produccion.

Datos minimos:

```txt
- nombre de sucursal
- direccion
- responsable
- telefono
- estatus activa
```

Screenshot:

```txt
screenshots/21-settings.png
```

Estado visual V0.1:

```txt
Pendiente UX / no disponible visualmente para onboarding V0.1: no existe una pantalla clara de alta de primera sucursal dentro del flujo operativo del dueno.
```

---

## 6. Crear usuarios principales

**Objetivo:** separar responsabilidades desde el inicio.

Usuarios minimos sugeridos:

```txt
- Dueno / administrador
- Gerente
- Cajero
- Produccion, si aplica
- Inventario, si aplica
```

No crear todavia:

```txt
- repartidor autenticado
- contador como rol final
```

Estado visual V0.1:

```txt
Pendiente UX / no disponible visualmente para onboarding V0.1: la pantalla de usuarios/permisos no esta separada como paso claro del arranque inicial.
```

---

## 7. Crear productos base

**Objetivo:** cargar los productos que si se pueden vender en POS.

Productos base:

```txt
- Tortilla kg
- Tortilla por paquete 800 g
- Masa kg
- Salsa u otro producto de mostrador
```

Screenshots:

```txt
screenshots/22-productos-listado.png
screenshots/23-producto-nuevo.png
```

Recomendacion:

```txt
Maiz, cal, harina y empaques no deben crearse como vendibles para POS.
```

---

## 8. Configurar precios

**Objetivo:** permitir que el POS calcule importes correctamente.

Precios minimos:

```txt
- tortilla por kg
- tortilla por monto
- paquete 800 g
- masa por kg
- masa por monto
- productos retail por unidad
```

Screenshot:

```txt
screenshots/24-precios.png
```

Error comun:

```txt
Crear productos sin precio. Un producto activo sin precio genera friccion en POS y puede bloquear la venta.
```

---

## 9. Crear insumos, empaques y conversiones

**Objetivo:** preparar productos no vendibles que se consumen en produccion.

Insumos comunes:

```txt
- maiz
- harina de maiz
- cal
- harina de trigo, si aplica
```

Empaques comunes:

```txt
- papel
- bolsa
- etiqueta
```

Screenshots:

```txt
screenshots/25-insumos-listado.png
screenshots/26-insumo-nuevo.png
```

Estado visual V0.1:

```txt
Las conversiones existen en la pantalla de insumos.
Pendiente UX: no hay wizard dedicado para conversiones durante arranque.
```

---

## 10. Cargar inventario inicial

**Objetivo:** registrar existencias iniciales antes de vender o producir.

Motivo recomendado:

```txt
Carga inicial de inventario
```

Screenshot:

```txt
screenshots/29-inventario-ajuste-inicial.png
```

Regla operativa:

```txt
Todo inventario inicial debe entrar como movimiento de inventario, no como cambio manual directo en base de datos.
```

---

## 11. Crear receta base

**Objetivo:** permitir produccion por receta y control de insumos.

Receta minima sugerida:

```txt
Nombre: Masa estandar
Salida esperada: 33 kg de masa
Insumos:
- maiz: 25 kg
- harina de maiz: 8 kg
- cal: 0.100 kg
```

Screenshots:

```txt
screenshots/27-recetas-listado.png
screenshots/28-receta-nueva.png
```

Error comun:

```txt
Intentar producir por receta sin inventario suficiente de insumos.
```

---

## 12. Configurar caja / POS

**Objetivo:** dejar listo el punto de venta.

Configuracion minima:

```txt
- sucursal activa
- dispositivo POS o caja configurada
- cajero asignado
- caja abierta
- monto inicial
```

Screenshot:

```txt
screenshots/31-apertura-caja.png
```

Error comun:

```txt
Intentar vender sin caja abierta. El sistema debe bloquear o solicitar apertura de caja.
```

---

## 13. Crear cliente de prueba

**Objetivo:** validar clientes frecuentes y credito sin afectar operacion real.

Cliente minimo:

```txt
Nombre: Cliente prueba
Tipo: mostrador o tienda
Telefono: opcional
Credito: desactivado al inicio
```

Screenshot:

```txt
screenshots/30-cliente-nuevo.png
```

---

## 14. Configurar rutas, si aplica

**Objetivo:** preparar reparto a tiendas, puestos o clientes recurrentes cuando el plan lo permita.

Configuracion minima:

```txt
- ruta
- cliente asignado
- chofer como entidad operativa
- productos por entregar
```

Estado visual V0.1:

```txt
La configuracion de rutas existe en pantallas operativas de reparto, no como paso dedicado del arranque.
No prometer repartidor autenticado.
```

---

## 15. Configurar facturacion, si aplica

**Objetivo:** preparar emision fiscal cuando el negocio vaya a facturar.

Datos minimos:

```txt
- razon social
- RFC
- regimen fiscal
- codigo postal fiscal
- certificados, si aplica
- PAC o sandbox
- serie y folio
```

Estado visual V0.1:

```txt
Pendiente UX / no disponible visualmente para onboarding V0.1: la configuracion fiscal no esta separada como asistente de arranque.
No prometer PAC real si no esta configurado.
```

---

## 16. Ejecutar venta de prueba

**Objetivo:** comprobar que productos, precios y caja funcionan antes de operar con clientes reales.

Flujo minimo:

```txt
1. Abrir caja.
2. Entrar al POS.
3. Buscar producto.
4. Agregar producto al ticket.
5. Cobrar.
6. Confirmar que la venta queda registrada.
```

Screenshot:

```txt
screenshots/32-venta-prueba-pos.png
```

---

## 17. Cerrar caja y revisar reporte

Despues de la venta de prueba:

```txt
1. Entrar a caja.
2. Capturar efectivo contado.
3. Revisar diferencia.
4. Confirmar cierre.
5. Entrar a reportes.
6. Revisar ventas y caja del dia.
```

Screenshots de referencia UX-R11:

```txt
screenshots/09-cierre-caja.png
screenshots/20-reportes.png
```

---

## 18. Checklist de arranque

```txt
[ ] Organizacion correcta
[ ] Sucursal activa
[ ] Usuario dueno activo
[ ] Usuario gerente creado
[ ] Usuario cajero creado
[ ] Productos base creados
[ ] Precios configurados
[ ] Insumos creados
[ ] Conversiones configuradas, si aplica
[ ] Inventario inicial cargado
[ ] Receta base activa
[ ] Caja/POS configurado
[ ] Cliente de prueba creado
[ ] Venta de prueba completada
[ ] Cierre de caja probado
[ ] Reporte revisado
```

---

## 19. Que no se debe prometer todavia

Durante piloto o demo inicial, no prometer:

```txt
- repartidor autenticado
- contador como rol final
- busqueda global funcional
- bascula real
- alertas backend formales
- PAC real si no esta configurado
- tolerancias configurables por organizacion
- agua inventariable
- flujo obligatorio masa -> tortilla
- descuento automatico de empaques en venta
```

---

## 20. Orden correcto de lectura de manuales

```txt
1. Manual de arranque para dueno
2. Manual del administrador
3. Manual del gerente
4. Manual del cajero
5. Manual de produccion
6. Manual de inventario
```
