# Tortilla Plus — Reporte QA de Flujos del Sistema

**Commit revisado:** `09db71b`  
**Área:** QA funcional, UX/UI, producto  
**Estado:** Revisión post R8 / post UX-R9  
**Resultado general:** Apto para piloto controlado en staging, con condiciones  

---

## 1. Alcance del reporte

Este documento resume la revisión QA de los flujos funcionales principales de Tortilla Plus después del último commit indicado: `09db71b`.

La revisión se basa en:

```txt
- documentación funcional del sistema
- documentación UX post R8
- roadmap UX-R0 a UX-R9
- deuda técnica UX registrada
- reporte de piloto controlado
- cambios observados en frontend/backend
```

No se ejecutó una instancia viva del sistema desde este entorno. La evaluación es una revisión técnica y funcional basada en código/documentación disponible.

---

## 2. Leyenda

### Resultado

```txt
Pasa      El flujo cumple el comportamiento esperado.
Parcial   El flujo funciona, pero tiene deuda UX, edge cases o carencias operativas.
Falla     El flujo no cumple el requisito funcional o UX.
```

### Prioridad

```txt
Crítica   Bloquea piloto o puede provocar operación incorrecta.
Alta      Riesgo fuerte de confusión, error operativo o regresión.
Media     Deuda importante, pero no bloquea piloto controlado.
Baja      Mejora deseable o ajuste menor.
```

---

# 3. Navegación, layout y estructura general

## 3.1 Navegación por áreas de trabajo

**Resultado:** Pasa  
**Prioridad:** Baja

La navegación ya no se presenta como una lista plana de módulos. Ahora agrupa el sistema en áreas de trabajo:

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

Esto corrige el principal problema UX identificado: exponer demasiada estructura técnica al usuario final.

### Recomendación

Mantener compatibilidad con rutas anteriores mediante redirects o alias mientras dure la transición. Evitar romper enlaces internos existentes, documentación o accesos guardados por usuarios.

---

## 3.2 Header operativo

**Resultado:** Parcial  
**Prioridad:** Media

El header operativo ya muestra contexto relevante:

```txt
- sucursal
- caja
- usuario
- rol
- acceso rápido a POS
- acceso a alertas
- búsqueda visual
```

El problema detectado es que el header puede mostrar `Alertas 0` aunque el centro de alertas derive alertas activas desde frontend.

### Riesgo

Mostrar `Alertas 0` puede generar falsa tranquilidad en operación real.

### Corrección recomendada

Aplicar una de estas soluciones:

```txt
1. Conectar el header al conteo real de alertas.
2. Ocultar el contador si no existe fuente real.
3. Mostrar solo “Alertas” sin número cuando el conteo no esté disponible.
```

Este punto debe quedar como deuda UX si no se corrige antes del piloto.

---

## 3.3 Panel del día

**Resultado:** Parcial  
**Prioridad:** Media

El panel del día resume información relevante, como ventas, caja y retiros pendientes. Sin embargo, todavía no cubre todo lo esperado para operación diaria.

### Faltantes recomendados

```txt
- lotes de producción abiertos
- lotes con variación
- recetas sin versión activa
- stock bajo de insumos
- rutas pendientes de liquidar
- crédito vencido o por cobrar
- facturas pendientes
- errores fiscales
```

### Corrección recomendada

Alimentar el panel del día con el mismo criterio del centro de alertas para que funcione como consola operativa real, no solo como resumen comercial.

---

# 4. POS / Mostrador

## 4.1 Atajos de teclado

**Resultado:** Pasa  
**Prioridad:** Baja

Los atajos ya están alineados con la especificación UX:

```txt
F1  Tortilla por kg
F2  Tortilla por monto
F3  Masa por kg
F4  Masa por monto
F5  Paquete
F6  Buscar
F9  Cobrar
Esc Cancelar
```

También se mantiene `Ctrl+F` para búsqueda.

### Recomendación

Asegurar que la capacitación y la documentación operativa usen exactamente este mapa de teclas.

---

## 4.2 Productos no vendibles

**Resultado:** Pasa  
**Prioridad:** Baja

El POS filtra productos no vendibles. Insumos y empaques no aparecen como productos de venta.

### Validación esperada

```txt
raw_material -> no visible en POS
packaging    -> no visible en POS
isSellable=false -> no visible / no vendible
```

---

## 4.3 Errores de POS

**Resultado:** Parcial  
**Prioridad:** Media

Los errores de dominio existen, pero algunos pueden presentarse como mensajes genéricos.

### Casos que deben tener copy operativo claro

```txt
- caja cerrada
- producto sin precio
- producto no vendible
- stock insuficiente
- cliente excede crédito
- pago incompleto
- terminal Mercado Pago no lista
```

### Corrección recomendada

Centralizar los mensajes de error del POS usando `docs/ux/ui-copy-and-domain-language-v0.1.md` como fuente de verdad.

---

## 4.4 Cobro y ticket

**Resultado:** Pasa  
**Prioridad:** Baja

El ticket muestra productos, cantidades, precios y total. El flujo de cobro permite completar la venta y limpiar el estado del carrito.

### Recomendación

En piloto, medir:

```txt
- tiempo para vender tortilla por monto
- tiempo para vender tortilla por kg
- tiempo para vender paquete
- tiempo para corregir item
- tiempo para cancelar ticket
```

---

# 5. Producción

## 5.1 Producción por receta

**Resultado:** Parcial  
**Prioridad:** Alta

El flujo ya funciona como wizard visual. Guía al usuario por:

```txt
1. elegir receta
2. confirmar insumos esperados
3. capturar reales
4. revisar rendimiento
5. cerrar lote
```

Muestra esperado vs real, diferencia y porcentaje de variación.

### Problema detectado

Cuando la variación supera 10 %, la UI sigue usando al usuario actual como autorizador.

### Riesgo

Operativamente, una variación alta debería autorizarla un supervisor, gerente o usuario con permiso explícito. Si el sistema asume al usuario actual, puede simular autorización sin una interacción clara.

### Corrección recomendada

Implementar una de estas opciones:

```txt
1. Selector de usuario autorizador.
2. PIN de supervisor.
3. Modal de autorización con credenciales de usuario autorizado.
```

Mientras no exista, mantenerlo como deuda aceptada temporalmente para piloto controlado.

---

## 5.2 Motivo de variación

**Resultado:** Pasa  
**Prioridad:** Baja

El sistema solicita motivo cuando la variación es relevante.

### Regla esperada

```txt
< 3%      permite cerrar sin motivo
3% - 10%  requiere motivo
> 10%     requiere motivo y autorización
```

---

## 5.3 Producción manual

**Resultado:** Pasa  
**Prioridad:** Baja

La producción manual se conserva para compatibilidad operativa y sigue registrando movimientos mediante el ledger.

### Recomendación

En UI, separar claramente:

```txt
Producción manual
Producción por receta
```

para evitar que el usuario confunda ambos flujos.

---

# 6. Recetas, insumos y conversiones

## 6.1 Recetas versionadas

**Resultado:** Pasa  
**Prioridad:** Baja

El flujo respeta versionado y evita modificar historial productivo directamente.

### Validaciones esperadas

```txt
- salida debe ser masa o tortilla
- ingredientes deben ser isRecipeIngredient=true
- receta activa debe tener currentVersionId
- nueva versión debe conservar histórico
```

---

## 6.2 Insumos y empaques

**Resultado:** Pasa  
**Prioridad:** Baja

Insumos y empaques se manejan como productos no vendibles, stockeables y utilizables en producción cuando corresponde.

---

## 6.3 Conversiones

**Resultado:** Pasa  
**Prioridad:** Baja

Las conversiones por producto/organización permiten operar unidades como costal, cubeta o bulto.

### Mejora futura

Agregar editor masivo o importación para conversiones cuando existan muchos insumos.

---

# 7. Inventario / Ledger

## 7.1 Vista de stock

**Resultado:** Pasa  
**Prioridad:** Baja

Inventario muestra existencias con estados visuales:

```txt
correcto
bajo mínimo
agotado
negativo
```

También permite ajustes y merma con motivo.

---

## 7.2 Movimientos trazables

**Resultado:** Parcial  
**Prioridad:** Media

La tabla de movimientos muestra:

```txt
- fecha
- producto
- tipo de movimiento
- cantidad
- referencia
- motivo
- usuario
```

### Problema detectado

La referencia y el usuario todavía pueden mostrarse como IDs técnicos.

### Riesgo

Para auditoría real, un gerente necesita leer:

```txt
Lote PROD-0143
Venta #000521
Ruta Norte / Pedido #123
Usuario: Ana López
```

en lugar de UUIDs o IDs internos.

### Corrección recomendada

Enriquecer el endpoint de movimientos o mapear referencias en frontend para mostrar nombres legibles.

---

## 7.3 Alertas de stock

**Resultado:** Parcial  
**Prioridad:** Media

El sistema detecta stock crítico, pero el contador del header no refleja necesariamente el conteo real.

### Corrección recomendada

Integrar el builder de alertas al layout o crear endpoint formal de alertas.

---

# 8. Rutas / Reparto

## 8.1 Planeación y preparación de ruta

**Resultado:** Pasa  
**Prioridad:** Baja

Se pueden crear rutas, asignar clientes, preparar productos y cargar inventario.

---

## 8.2 Entrega, devolución y liquidación

**Resultado:** Pasa  
**Prioridad:** Baja

El flujo permite entregar, registrar pagos, manejar devoluciones y liquidar ruta.

---

## 8.3 Experiencia de repartidor

**Resultado:** Parcial  
**Prioridad:** Media

La experiencia actual sigue orientada al gerente. No existe todavía una UI dedicada para repartidor autenticado.

### Corrección futura

Crear modo repartidor con flujo simplificado:

```txt
Ruta del día
Cliente actual
Entregar
Cobrar
Registrar devolución
Siguiente cliente
Cerrar recorrido
```

### Nota de piloto

No prometer repartidor autenticado en el piloto actual.

---

# 9. Clientes / Crédito

## 9.1 Alta y edición de cliente

**Resultado:** Pasa  
**Prioridad:** Baja

Clientes pueden configurarse con datos básicos, crédito, saldo y precios especiales.

---

## 9.2 Crédito y abonos

**Resultado:** Pasa  
**Prioridad:** Baja

El sistema actualiza saldos y permite registrar pagos.

---

## 9.3 Alertas de crédito

**Resultado:** Parcial  
**Prioridad:** Media

El builder de alertas puede detectar crédito pendiente, pero la UI de clientes debería hacerlo más visible.

### Corrección recomendada

Agregar badges o resaltados en:

```txt
- tabla de clientes
- detalle de cliente
- panel del día
- centro de alertas
```

---

# 10. Caja y conciliación

## 10.1 Apertura y cierre de caja

**Resultado:** Pasa  
**Prioridad:** Baja

La caja puede abrirse y cerrarse. El cierre guiado muestra efectivo esperado, efectivo contado, diferencia y motivo.

---

## 10.2 Retiros e ingresos

**Resultado:** Pasa  
**Prioridad:** Baja

Retiros e ingresos quedan registrados y los retiros requieren autorización.

---

## 10.3 Conciliación

**Resultado:** Parcial  
**Prioridad:** Media

El sistema detecta diferencias, pero falta una experiencia completa de revisión, comentario y resolución de diferencias.

### Corrección recomendada

Agregar pantalla o sección de auditoría para:

```txt
- diferencia de caja
- diferencia de ruta
- quién revisó
- comentario
- resolución
- fecha de cierre
```

---

# 11. Facturación / Fiscal

## 11.1 Factura individual y global

**Resultado:** Pasa  
**Prioridad:** Baja

El sistema soporta facturación individual y global conforme al alcance actual.

---

## 11.2 Autofactura

**Resultado:** Parcial  
**Prioridad:** Media

Autofactura existe, pero no debe prometerse como flujo completo si no está validada en ambiente productivo o staging real.

### Nota de piloto

No prometer autofactura real si PAC, CORS, dominios o documentos productivos no están listos.

---

## 11.3 Errores fiscales

**Resultado:** Parcial  
**Prioridad:** Media

Los errores fiscales pueden requerir copy más específico.

### Corrección recomendada

Distinguir errores como:

```txt
RFC inválido
uso CFDI faltante
régimen fiscal faltante
PAC no disponible
factura ya emitida
factura cancelada
```

---

# 12. SaaS, roles y configuración

## 12.1 Roles y permisos

**Resultado:** Pasa  
**Prioridad:** Baja

Los roles y permisos se aplican en rutas y acciones.

---

## 12.2 Roles fuera de alcance actual

**Resultado:** Parcial  
**Prioridad:** Media

No existe todavía experiencia final para:

```txt
repartidor autenticado
contador como rol final
```

Esto no bloquea piloto si se declara explícitamente fuera de alcance.

---

## 12.3 Dispositivos POS

**Resultado:** Pasa  
**Prioridad:** Baja

Los dispositivos POS están vinculados a sucursal y se respetan límites operativos.

---

# 13. Reportes y auditoría

## 13.1 Reporte de producción

**Resultado:** Pasa  
**Prioridad:** Baja

El nuevo reporte de producción cubre:

```txt
- lotes cerrados
- salida esperada
- salida real
- variación
- rendimiento promedio
- consumo de ingredientes
- producción por receta
- producción por producto
- lotes recientes
```

---

## 13.2 Reportes operativos

**Resultado:** Parcial  
**Prioridad:** Media

Los reportes ya existen, pero falta consolidarlos mejor con el panel del día y alertas accionables.

### Corrección recomendada

Conectar reportes con acciones:

```txt
stock bajo -> ir a inventario
lote con variación -> abrir lote
factura con error -> abrir fiscal
cliente con deuda -> abrir cliente
ruta sin liquidar -> abrir ruta
```

---

# 14. Alertas y notificaciones

## 14.1 Centro de alertas

**Resultado:** Parcial  
**Prioridad:** Media

El centro de alertas ya existe, pero las alertas se derivan en frontend. No hay persistencia ni flujo de resolución.

### Limitaciones actuales

```txt
- no hay responsable
- no hay estado resuelta/ignorada
- no hay historial
- no hay endpoint formal
- no hay conteo centralizado
```

### Corrección recomendada

Crear un módulo backend de alertas en una fase posterior.

---

## 14.2 Contador de alertas en header

**Resultado:** Parcial  
**Prioridad:** Media

Mismo problema detectado en navegación: el header puede mostrar `Alertas 0` aunque existan alertas derivadas.

### Corrección recomendada

Debe resolverse antes de piloto con usuarios reales.

---

# 15. Piloto controlado

## 15.1 Estado general

**Resultado:** Pasa con condiciones  
**Prioridad:** Media

El sistema es apto para piloto controlado local/staging, siempre que se respete alcance.

### Se puede validar en piloto

```txt
- owner / gerente
- cajero
- producción
- platform_owner
- POS
- caja
- producción por receta
- inventario
- rutas desde gerente
- clientes/crédito
- reportes básicos
```

### No prometer en piloto

```txt
- repartidor autenticado
- contador como rol final
- búsqueda global funcional
- báscula real
- alertas backend formales
- PAC real si no está configurado
- tolerancia configurable por organización
- agua inventariable
- flujo obligatorio masa -> tortilla
- descuento automático de empaques en venta
```

---

# 16. Resumen de hallazgos por prioridad

## Críticos

```txt
No se detectan bloqueadores críticos para piloto controlado staging.
```

## Altos

```txt
1. Autorización de variación >10% en producción aún no tiene flujo supervisor/PIN.
```

## Medios

```txt
1. Header muestra Alertas 0 si no recibe conteo real.
2. Alertas derivadas frontend no son persistentes.
3. Movimientos de inventario muestran referencias/usuarios poco legibles.
4. Dashboard aún no concentra todos los focos operativos.
5. No existe UI dedicada para repartidor autenticado.
6. No existe experiencia final para contador.
7. Conciliación requiere mejor revisión/resolución de diferencias.
8. Algunos errores fiscales y de dominio requieren copy más específico.
```

## Bajos

```txt
1. Normalización total de acentos/copy.
2. Optimización de bundle/chunk size.
3. Editor masivo de conversiones.
```

---

# 17. Correcciones recomendadas en orden

## 17.1 Antes de piloto con usuarios reales

```txt
1. Corregir contador de alertas en OperationalHeader.
2. Documentar claramente que alertas son frontend-derived.
3. Validar manualmente POS, caja, producción, inventario y rutas en staging.
4. Confirmar variables VITE_USE_MOCKS=false, API URL, CORS y seed demo.
5. Confirmar que no se promete repartidor, contador, búsqueda global ni báscula real.
```

## 17.2 Después del piloto controlado

```txt
1. Implementar alertas backend persistentes.
2. Enriquecer movimientos con usuario/nombre/folio.
3. Crear autorización supervisor/PIN para variación alta.
4. Crear UI dedicada para repartidor.
5. Completar dashboard operativo.
6. Mejorar conciliación de diferencias.
7. Endurecer mensajes fiscales y errores de dominio.
```

---

# 18. Veredicto final QA

```txt
GO condicionado para piloto controlado staging.
NO-GO para despliegue con usuarios reales sin checklist manual previo.
```

El sistema después del commit `09db71b` tiene una base funcional y UX considerablemente más sólida. Los flujos principales están cubiertos y no se detectan bloqueadores críticos para un piloto controlado.

El riesgo principal no es técnico inmediato, sino de expectativa operativa: no se deben prometer funcionalidades que aún están fuera de alcance, especialmente repartidor autenticado, búsqueda global, báscula real, contador y alertas backend formales.

---

# 19. Regla de actualización

Este reporte debe actualizarse cuando ocurra cualquiera de estos eventos:

```txt
- se corrija el contador real de alertas
- se implemente autorización supervisor/PIN en producción
- se agregue backend formal de alertas
- se enriquezcan movimientos con usuario/referencia legible
- se ejecute piloto manual staging
- se detecte una deuda alta/crítica nueva
- se apruebe piloto con usuarios reales
```
