# Tortilla Plus - Deuda Tecnica UX V0.1

**Area:** UX/UI, frontend  
**Estado:** Inicial post auditoria UX-R0  
**Fecha:** 2026-06-17  

---

## 1. Escala de severidad

```txt
Critica: bloquea cumplimiento P0 o puede causar operacion incorrecta.
Alta: genera friccion fuerte, confusion operativa o riesgo de regresion en piloto.
Media: afecta consistencia, mantenibilidad o velocidad de operacion.
Baja: mejora deseable sin impacto operativo inmediato.
```

---

## 2. Deuda registrada

| ID | Severidad | Area | Deuda | Evidencia | Sprint objetivo | Estado |
|---|---|---|---|---|---|---|
| UX-DEBT-001 | Critica | IA / Navegacion | La navegacion manager aun mezcla areas y modulos: Inicio, Ventas, Clientes, Reparto, Inventario, Insumos, Recetas, Productos, Precios, Caja, Reportes, Conciliacion, Configuracion. No cumple el modelo por areas de trabajo. | `apps/web/src/shared/layouts/manager-layout.tsx` | UX-R2 | Cerrada en UX-R2 |
| UX-DEBT-002 | Critica | Alertas | No existe centro de alertas ni sistema frontend de alertas accionables P0. | No hay ruta/pagina dedicada en `apps/web/src/app/router.tsx`; `DashboardPage` solo muestra retiros pendientes y stock negativo. | UX-R3 | Cerrada en UX-R3 con alertas derivadas frontend |
| UX-DEBT-003 | Alta | Header operativo | Header actual no muestra rol visible, alertas criticas, busqueda global ni acceso rapido persistente a POS en manager. | `manager-layout.tsx`, `pos-layout.tsx` | UX-R1 | Cerrada en UX-R1 |
| UX-DEBT-004 | Alta | POS | Atajos POS no coinciden con especificacion UX. Implementado: `Ctrl+F`, `F8` cobrar, `F9` cancelar. Especificado: `F6` buscar, `F9` cobrar, `Esc` cancelar. | `apps/web/src/modules/pos/pages/sale-page.tsx` | UX-R4 | Cerrada en UX-R4 |
| UX-DEBT-005 | Alta | Produccion | Produccion por receta existe, pero no es wizard de 5 pasos. La captura/cierre vive como formulario de detalle. | `production-recipe-new-page.tsx`, `production-recipe-batch-page.tsx` | UX-R5 | Cerrada en UX-R5 |
| UX-DEBT-006 | Alta | Roles | Navegacion por rol final no cubre todos los roles documentados: produccion, repartidor y contador como experiencias separadas. | `router.tsx`, `role.ts`, `manager-layout.tsx` | UX-R2 / UX-R7 / UX-R9 | Aceptada post piloto; no bloquea piloto controlado porque repartidor queda como entidad operativa y contador queda fuera de alcance |
| UX-DEBT-007 | Alta | Panel del dia | Panel actual es resumen parcial; faltan bloques P0 completos: produccion abierta, lotes con variacion, rutas pendientes, stock bajo, credito pendiente, facturas pendientes y alertas criticas. | `dashboard-page.tsx` | UX-R3 | Cerrada en UX-R3 con datos disponibles; variacion por lote queda para UX-R5/R8 |
| UX-DEBT-008 | Alta | Inventario | No hay vista completa de movimientos trazables con filtros visibles y referencia legible como pantalla principal. | `inventory-page.tsx`; movimientos solo aparecen en detalle de lote por receta. | UX-R6 | Cerrada en UX-R6 |
| UX-DEBT-009 | Alta | Caja | Cierre de caja no esta guiado por pasos; captura contado, comentario y cierre en una sola tarjeta. | `cash-page.tsx` | UX-R7 | Cerrada en UX-R7 |
| UX-DEBT-010 | Alta | Reparto | La experiencia actual esta orientada a gerente; no existe modo repartidor con cliente actual, entregar, cobrar, devolver y siguiente cliente. | `routes-page.tsx`, `route-detail-page.tsx` | UX-R7 | Cerrada en UX-R7 con modo de ejecucion dentro de detalle de ruta; rol dedicado queda en UX-DEBT-006 |
| UX-DEBT-011 | Media | Design system | Tokens actuales `--tp-*` no coinciden completamente con la paleta oficial post R8 y no hay componentes operativos consolidados para cards/tablas/alertas. | `apps/web/src/styles/globals.css`, `shared/components` | UX-R1 | Cerrada en UX-R1 |
| UX-DEBT-012 | Media | Copy / lenguaje | `labelFrom` cae a `value.replace(/[_\.]/g, " ")`, lo que puede exponer enums desconocidos en UI en vez de copy operativo controlado. | `apps/web/src/shared/utils/labels.ts` | UX-R8 | Cerrada en UX-R8; fallback ahora usa copy neutral |
| UX-DEBT-013 | Media | POS | Hay UI visible "Bascula futura" deshabilitada. Puede comunicar funcionalidad no disponible en operacion. | `sale-page.tsx` | UX-R4 | Cerrada en UX-R8; control visible retirado |
| UX-DEBT-014 | Media | Reportes | Reportes ya tienen datos utiles, pero aun se presentan como paneles generales; falta conectar con alertas/acciones operativas. | `reports-page.tsx` | UX-R8 | Cerrada en UX-R8 |
| UX-DEBT-015 | Media | Rutas frontend | Rutas sugeridas por UX (`/app/production`, `/app/inventory`, etc.) no coinciden con la estructura actual principal (`/app/manager/...`). | `router.tsx` | UX-R2 | Cerrada en UX-R2 |
| UX-DEBT-016 | Media | Accesibilidad / teclado | No hay pruebas E2E especificas para atajos POS, busqueda global, navegacion por teclado en wizard ni foco despues de acciones criticas. | `apps/web/e2e/*.spec.ts` | UX-R4 / UX-R5 / UX-R8 | Parcial; POS, produccion, inventario y smoke operativo cubiertos. Busqueda global queda pendiente |
| UX-DEBT-017 | Media | Estados vacios | Estados vacios existen en algunas pantallas, pero no estan normalizados contra `ui-copy-and-domain-language`. | Varias paginas en `apps/web/src/modules/manager/pages` | UX-R8 | Parcial; reportes/facturacion endurecidos, barrido total queda para piloto |
| UX-DEBT-018 | Media | Autorizacion produccion | Para variacion >10%, la UI manda `authorizedByUserId` como usuario actual. Falta definir si UX requiere PIN/supervisor visible sin cambiar regla backend. | `production-recipe-batch-page.tsx` | UX-R5 | Cerrada en UX-R5 con copy explicito; PIN/supervisor queda fuera de alcance sin soporte backend |
| UX-DEBT-019 | Baja | Encoding / copy | Varios documentos y textos fuente muestran caracteres sin acento o mojibake historico. No bloquea UX, pero afecta consistencia documental y de UI. | `docs/*`, textos UI sin acentos | UX-R8 | Parcial; mojibake visible en ajustes corregido, normalizacion total queda pendiente |
| UX-DEBT-020 | Media | Alertas | El centro de alertas usa derivacion frontend desde endpoints existentes; no hay endpoint formal de alertas con estado, responsable o resolucion. | `alerts-page.tsx`, `operational-alerts.ts` | Post piloto / UX-R8 | Abierta |
| UX-DEBT-021 | Media | Inventario | Los movimientos muestran `createdByUserId` cuando existe, pero no nombre de usuario ni referencia enriquecida con folio/nombre. | `/inventory/movements` entrega IDs y referencia tecnica; `inventory-page.tsx` los hace legibles parcialmente. | UX-R8 / Post piloto | Abierta |

---

## 3. Deuda critica y alta por prioridad

### Critica

```txt
Sin deuda critica abierta tras UX-R3.
```

### Alta

```txt
UX-DEBT-006 Roles UX incompletos.
Aceptada post piloto; no bloquea UX-R9 bajo el alcance de piloto controlado.
```

### Media

```txt
UX-DEBT-016 Accesibilidad/teclado parcial: busqueda global sigue pendiente.
UX-DEBT-017 Estados vacios parcial: barrido total queda para piloto.
UX-DEBT-020 Alertas sin backend formal.
UX-DEBT-021 Movimientos sin usuario/referencia enriquecida.
```

---

## 4. Regla de actualizacion

Este log debe actualizarse cuando:

```txt
- Se cierre una deuda.
- Un hallazgo de piloto cambie severidad.
- Una deuda requiera backend.
- Una decision R0 cambie el alcance de UX-R1 a UX-R9.
```
