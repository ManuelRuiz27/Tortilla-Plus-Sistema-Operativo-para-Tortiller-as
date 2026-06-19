# Tortilla Plus - Roadmap de Ejecucion UX V0.1

**Area:** UX/UI, frontend, QA  
**Estado:** Auditoria inicial creada desde frontend actual  
**Fecha:** 2026-06-17  
**Documentos base:**  
- `docs/system-modules-and-flows-source-of-truth-v0.1.md`
- `docs/ux/source-of-truth-ux-post-r8-addendum-v0.1.md`
- `docs/ux/ux-ui-redesign-strategy-post-r8-v0.1.md`
- `docs/ux/information-architecture-and-navigation-v0.1.md`
- `docs/ux/operational-design-system-v0.1.md`
- `docs/ux/critical-operational-flows-v0.1.md`
- `docs/ux/p0-screen-specs-v0.1.md`
- `docs/ux/ui-copy-and-domain-language-v0.1.md`
- `docs/ux/ux-implementation-roadmap-post-r8-v0.1.md`

---

## 1. Estado real del frontend auditado

El frontend actual es una app React/Vite con rutas separadas por contexto:

```txt
apps/web/src/app/router.tsx
apps/web/src/shared/layouts/manager-layout.tsx
apps/web/src/shared/layouts/pos-layout.tsx
apps/web/src/shared/layouts/platform-layout.tsx
apps/web/src/modules/manager
apps/web/src/modules/pos
apps/web/src/modules/platform
```

Hallazgos principales:

```txt
- Existe base operativa funcional para POS, caja, inventario, insumos, recetas, produccion por receta, rutas, clientes, facturacion y reportes.
- Existen guards por autenticacion, sucursal, rol, features y permisos.
- POS ya tiene flujo usable, carrito, cliente opcional, cobro, terminal Mercado Pago, productos principales y atajos parciales.
- Produccion por receta ya permite crear lote, capturar reales, cerrar lote y auditar movimientos.
- Reportes ya incluyen produccion por receta, consumo de insumos, ventas y caja.
- La navegacion manager aun expone una lista mixta de modulos y submodulos, no areas de trabajo cerradas.
- El header actual no cumple el header operativo persistente completo: faltan rol visible, alertas criticas, busqueda global y acceso rapido consistente a POS.
- No existe centro de alertas.
- No existe navegacion por rol final para dueno, gerente, cajero, produccion, repartidor y contador segun la especificacion UX.
- Produccion por receta aun no es wizard de 5 pasos.
- Inventario muestra existencias y ajustes, pero no una experiencia completa de movimientos trazables.
- Caja tiene cierre en una pantalla, pero no cierre guiado por pasos.
- Reparto esta orientado a gerente; no existe modo repartidor dedicado.
```

---

## 2. Brechas contra documentacion UX

| Area UX | Estado actual | Brecha |
|---|---|---|
| Navegacion por areas | Parcial | `ManagerLayout` lista Inicio, Ventas, Clientes, Reparto, Inventario, Insumos, Recetas, Productos, Precios, Caja, Reportes, Conciliacion, Configuracion. Falta agrupar Produccion, Administracion y Fiscal / Reportes como areas. |
| Header operativo | Parcial | Muestra sucursal, usuario, plan o caja. Falta rol visible, alertas, busqueda global y acceso rapido POS persistente. |
| Panel del dia | Parcial | `DashboardPage` muestra resumen, acciones rapidas y alertas basicas. Faltan bloques P0 completos: produccion abierta, lotes con variacion, rutas pendientes, stock bajo, credito pendiente, facturas pendientes y alertas criticas consolidadas. |
| Centro de alertas | Pendiente | No hay pantalla ni modelo frontend para alertas accionables. |
| POS teclado-first | Parcial/alto avance | Atajos implementados no coinciden con especificacion: hoy `F8` cobra y `F9` cancela; UX pide `F9` cobrar y `Esc` cancelar. Falta `F6` buscar producto. |
| Produccion por receta wizard | Parcial | Existe creacion/cierre de lote, pero no wizard de pasos con estado, revision y bloqueo explicito. |
| Inventario trazable | Parcial | Existencias y ajustes existen. Movimientos aparecen en detalle de lote, pero falta pantalla de movimientos con filtros, referencia y lenguaje operativo completo. |
| Reparto | Parcial | Existe planeacion y detalle de ruta. Falta experiencia separada para repartidor. |
| Clientes / credito | Parcial | Existen clientes y detalle. Falta ficha comercial final con saldo, limite, precios especiales y alertas como flujo unificado. |
| Fiscal / reportes | Parcial/avanzado | Facturacion y reportes existen. Falta conectarlos con alertas accionables y endurecer lenguaje/estados. |
| Design system operativo | Parcial | Hay tokens `--tp-*` y componentes base, pero la paleta no coincide totalmente con el sistema propuesto y no hay capa de componentes operativos P0 consolidada. |
| Lenguaje UI | Parcial | Existe `labels.ts`, pero quedan textos sin acentos por normalizacion, algunas etiquetas tecnicas o internas y fallback que transforma enums no registrados. |

---

## 3. Reglas de ejecucion

```txt
- No agregar reglas de negocio nuevas en UX-R1 a UX-R9.
- No modificar backend salvo bloqueo critico documentado.
- No mezclar sprints: cada sprint debe cerrar su alcance antes de iniciar el siguiente.
- Mantener compatibilidad con rutas existentes mediante redirects o rutas alias durante migracion.
- Toda pantalla modificada debe conservar permisos, feature flags y flujos E2E existentes.
- Toda deuda critica o alta debe registrarse en `docs/ux/ux-technical-debt-log-v0.1.md`.
```

---

## 4. UX-R0 Auditoria frontend y decisiones tecnicas

### Objetivo

Auditar el frontend actual contra la documentacion UX post R8 y dejar decisiones tecnicas cerradas antes de tocar UI.

### Alcance

```txt
- Revisar router, layouts, guards, stores, pages y E2E actuales.
- Crear roadmap de ejecucion UX.
- Crear log de deuda tecnica UX.
- Crear registro de decisiones abiertas si aplica.
- Definir si UX-R1 puede iniciar.
```

### Fuera de alcance

```txt
- Cambios visuales.
- Refactor de componentes.
- Nuevas APIs.
- Cambios backend.
- Nuevas reglas de negocio.
```

### Archivos probables a tocar

```txt
docs/ux/ux-implementation-execution-roadmap-v0.1.md
docs/ux/ux-technical-debt-log-v0.1.md
docs/ux/ux-r0-decisions-v0.1.md
```

### Riesgos

```txt
- Subestimar deuda de navegacion por estar parcialmente resuelta con permisos.
- Confundir modulos backend con areas UX.
- Iniciar rediseño visual sin cerrar compatibilidad de rutas.
```

### Criterios de aceptacion

```txt
- Roadmap creado con sprints UX-R0 a UX-R9.
- Deuda critica/alta registrada.
- Decisiones abiertas registradas.
- Estado de frontend y brechas documentadas.
- Decision explicita sobre inicio de UX-R1.
```

### Pruebas necesarias

```txt
- No aplica ejecucion funcional obligatoria; sprint documental.
- Validar que los documentos nuevos existen y no contradicen documentos oficiales.
```

### Deuda tecnica esperada

```txt
- Deuda documental cerrada en este sprint.
- Deuda de implementacion queda registrada para UX-R1+.
```

---

## 5. UX-R1 Base visual y layout operativo

### Objetivo

Crear la base visual operativa y un shell compartido que soporte header persistente, areas de trabajo, densidad operativa y estados.

### Alcance

```txt
- Alinear tokens CSS con `operational-design-system-v0.1.md`.
- Crear o consolidar componentes base: OperationalHeader, WorkspaceShell, OperationalCard, OperationalTable, AlertBadge.
- Definir estructura de layout para manager/operacion sin romper POS.
- Mantener POS compacto pero con estado de caja visible.
- Preparar slots para alertas, busqueda global y acceso rapido a POS, aunque algunas fuentes de datos sean placeholders controlados.
```

### Fuera de alcance

```txt
- Centro de alertas completo.
- Navegacion por rol final.
- Rediseño profundo de POS.
- Wizard de produccion.
- Nuevas reglas de negocio.
```

### Archivos probables a tocar

```txt
apps/web/src/styles/globals.css
apps/web/src/shared/layouts/manager-layout.tsx
apps/web/src/shared/layouts/pos-layout.tsx
apps/web/src/shared/layouts/supervisor-layout.tsx
apps/web/src/shared/components/*
apps/web/src/shared/utils/labels.ts
```

### Riesgos

```txt
- Romper estilos existentes al cambiar tokens globales.
- Saturar POS con header demasiado grande.
- Duplicar layouts en vez de consolidar patrones.
```

### Criterios de aceptacion

```txt
- La app conserva navegacion funcional existente.
- Header operativo muestra sucursal, caja, usuario, rol y acceso rapido a POS donde aplique.
- La base visual usa colores y estados operativos consistentes.
- No aparecen cambios de reglas de negocio.
- POS no pierde estado de caja ni flujo de cobro.
```

### Pruebas necesarias

```txt
- `npm run lint -w @tortilla-plus/web`
- Smoke manual de login, seleccion de sucursal, POS, manager dashboard.
- Playwright smoke si el entorno local esta disponible.
```

### Deuda tecnica esperada

```txt
- Centro de alertas aun pendiente.
- Busqueda global puede quedar solo estructurada, no funcional completa.
- Algunos componentes legacy seguiran usando estilos directos.
```

---

## 6. UX-R2 Navegacion por areas de trabajo y rol

### Objetivo

Reestructurar la navegacion para que el usuario opere por areas de trabajo y rol, no por lista plana de modulos.

### Alcance

```txt
- Definir `workspaceNavigation` con Inicio, Mostrador, Produccion, Inventario, Reparto, Clientes, Administracion, Fiscal / Reportes, Configuracion.
- Mapear permisos/features existentes a areas UX.
- Ajustar rutas visibles por rol sin eliminar rutas existentes.
- Agregar badges operativos basicos cuando existan datos ya disponibles.
- Mantener redirects actuales para compatibilidad.
```

### Fuera de alcance

```txt
- Crear pantallas nuevas de cada area si no existen.
- Cambiar permisos backend.
- Crear rol repartidor como `UserRole` si backend no lo soporta.
```

### Archivos probables a tocar

```txt
apps/web/src/app/router.tsx
apps/web/src/shared/layouts/manager-layout.tsx
apps/web/src/shared/utils/role.ts
apps/web/src/shared/guards/role-guard.tsx
apps/web/src/shared/stores/auth.store.ts
apps/web/src/modules/manager/pages/not-found-page.tsx
```

### Riesgos

```txt
- Ocultar accidentalmente accesos utiles para manager/owner.
- Desalinear rutas sugeridas `/app/production`, `/app/inventory`, etc. contra rutas actuales `/app/manager/...`.
- Romper E2E que navegan a rutas actuales.
```

### Criterios de aceptacion

```txt
- El menu visible ya no parece una lista de modulos tecnicos.
- Cada rol aterriza en una pantalla util.
- POS esta a un click desde areas operativas permitidas.
- Configuracion queda oculta para roles no autorizados.
- Rutas legacy siguen funcionando con redirects.
```

### Pruebas necesarias

```txt
- E2E login por owner, manager y cashier.
- Verificacion manual de visibilidad de nav por rol.
- Smoke de rutas legacy y nuevas rutas alias.
```

### Deuda tecnica esperada

```txt
- Badges pueden iniciar con conteos parciales.
- Repartidor puede requerir decision funcional posterior si sigue sin rol de usuario.
```

---

## 7. UX-R3 Panel del dia y alertas operativas

### Objetivo

Convertir Inicio en un panel del dia accionable y crear el centro de alertas operativo.

### Alcance

```txt
- Rediseñar `DashboardPage` como Panel del dia.
- Agregar bloques P0: ventas, caja, produccion abierta, lotes con variacion, rutas pendientes, stock bajo, credito pendiente, facturas pendientes, alertas criticas.
- Crear `AlertsPage` o seccion equivalente.
- Crear modelo frontend de alerta derivado de datos existentes.
- Mostrar acciones recomendadas sin inventar reglas nuevas.
```

### Fuera de alcance

```txt
- Motor backend formal de alertas.
- Notificaciones push.
- SLA o asignacion real de responsables si no existe backend.
```

### Archivos probables a tocar

```txt
apps/web/src/modules/manager/pages/dashboard-page.tsx
apps/web/src/modules/manager/pages/reports-page.tsx
apps/web/src/modules/manager/pages/inventory-page.tsx
apps/web/src/modules/manager/pages/billing-page.tsx
apps/web/src/api/manager.api.ts
apps/web/src/shared/components/status-badge.tsx
```

### Riesgos

```txt
- Necesitar datos que hoy no entrega `managerDashboardRequest`.
- Duplicar consultas y degradar performance.
- Presentar alertas que parezcan reglas nuevas.
```

### Criterios de aceptacion

```txt
- Dueño/gerente entiende el estado del dia en menos de 10 segundos.
- Alertas criticas aparecen arriba del fold.
- Cada alerta muestra que paso, por que importa y que accion tomar.
- Estados vacios usan copy oficial.
- No se muestran errores tecnicos crudos.
```

### Pruebas necesarias

```txt
- Unit tests de agregador frontend de alertas si se crea.
- Playwright smoke de dashboard con datos semilla.
- Verificacion manual de estados vacios.
```

### Deuda tecnica esperada

```txt
- Si no hay endpoint de alertas, quedara deuda alta para backend post piloto.
- Algunos conteos pueden ser aproximados por datos existentes.
```

---

## 8. UX-R4 POS teclado-first

### Objetivo

Alinear POS con la especificacion teclado-first y reducir friccion de venta de mostrador.

### Alcance

```txt
- Ajustar atajos: F1 tortilla kg, F2 tortilla $, F3 masa kg, F4 masa $, F5 paquete, F6 buscar producto, F9 cobrar, Esc cancelar.
- Mantener total dominante y ticket visible.
- Validar que insumos, empaques y no vendibles no aparezcan.
- Revisar copy de bloqueos: caja cerrada, producto sin precio, stock insuficiente, pago incompleto.
- Mantener cliente opcional y precio especial.
```

### Fuera de alcance

```txt
- Bascula real.
- Nuevos metodos de pago.
- Cambios a reglas de credito.
- Cambios a descuento de empaques.
```

### Archivos probables a tocar

```txt
apps/web/src/modules/pos/pages/sale-page.tsx
apps/web/src/modules/pos/components/cart-panel.tsx
apps/web/src/modules/pos/components/payment-modal.tsx
apps/web/src/modules/pos/components/product-quick-grid.tsx
apps/web/src/modules/pos/components/product-sale-modal.tsx
apps/web/src/modules/pos/hooks/use-pos-products.ts
apps/web/e2e/audit-smoke.spec.ts
```

### Riesgos

```txt
- Cambiar atajos puede afectar memoria operativa de usuarios actuales.
- `Esc` puede cerrar modales inesperadamente si no se ordena prioridad.
- F9 puede entrar en conflicto con navegador/SO en algunos entornos.
```

### Criterios de aceptacion

```txt
- Venta rapida sin mouse para productos principales.
- Cobro en menos de 3 acciones despues de capturar productos.
- F9 cobra y Esc cancela segun especificacion.
- F6 enfoca busqueda de producto.
- No se muestran insumos ni empaques en POS.
```

### Pruebas necesarias

```txt
- Playwright de atajos POS.
- E2E venta tortilla, masa, paquete y retail.
- E2E caja cerrada bloquea venta.
- Verificacion de producto sin precio y retail sin stock.
```

### Deuda tecnica esperada

```txt
- Bascula futura seguira como deuda funcional aceptada.
- Puede quedar pendiente soporte tactil optimizado para tablets.
```

---

## 9. UX-R5 Produccion por receta guiada

### Objetivo

Convertir produccion por receta en wizard operacional de 5 pasos con bloqueos claros.

### Alcance

```txt
- Crear flujo: elegir receta, confirmar insumos esperados, capturar reales, revisar rendimiento, cerrar lote.
- Comparar esperado vs real en misma fila.
- Mostrar variacion en kg y porcentaje.
- Mostrar motivo/autorizacion cuando aplique.
- Mostrar movimientos generados al cierre.
- Mantener reglas backend existentes de variacion.
```

### Fuera de alcance

```txt
- Tolerancia configurable por organizacion.
- Agua inventariable.
- Flujo obligatorio masa -> tortilla.
- Cambiar reglas de autorizacion.
```

### Archivos probables a tocar

```txt
apps/web/src/modules/manager/pages/production-recipe-new-page.tsx
apps/web/src/modules/manager/pages/production-recipe-batch-page.tsx
apps/web/src/modules/manager/pages/production-page.tsx
apps/web/src/modules/manager/pages/recipes-page.tsx
apps/web/src/api/manager.api.ts
apps/web/e2e/inventory-recipes.spec.ts
```

### Riesgos

```txt
- Separar crear lote y cerrar lote puede producir doble fuente de estado UI.
- Autorizador actual se infiere con `currentUserId` si variacion > 10; puede requerir decision UX sin tocar regla backend.
- Wizard puede ocultar informacion necesaria para usuarios expertos.
```

### Criterios de aceptacion

```txt
- Usuario sabe en que paso esta.
- No puede cerrar lote bloqueado sin explicacion.
- Variacion <3%, 3%-10% y >10% se distinguen visualmente.
- Motivo y autorizacion se explican con lenguaje operativo.
- Cierre muestra impacto en inventario.
```

### Pruebas necesarias

```txt
- E2E lote sin variacion.
- E2E variacion con motivo.
- E2E variacion alta con autorizacion si el backend lo permite en entorno de prueba.
- Regression de movimientos `production_input_out` y `production_in`.
```

### Deuda tecnica esperada

```txt
- Puede quedar deuda de selector formal de autorizador si backend no soporta PIN o usuario supervisor en la UI actual.
```

---

## 10. UX-R6 Inventario, movimientos y trazabilidad

### Objetivo

Hacer que inventario explique que paso con el stock, por que y desde que referencia.

### Alcance

```txt
- Separar vista de existencias, movimientos, ajustes y merma.
- Crear filtros visibles para producto, sucursal, fecha, tipo de movimiento y referencia.
- Usar labels de movimiento del diccionario UX.
- Mostrar stock bajo/negativo con estados claros.
- Mostrar referencia legible: venta, lote, ruta, ajuste, merma.
```

### Fuera de alcance

```txt
- Nuevas reglas de stock negativo.
- Reordenes automaticos.
- Agua inventariable.
- Descuento de empaques en venta.
```

### Archivos probables a tocar

```txt
apps/web/src/modules/manager/pages/inventory-page.tsx
apps/web/src/modules/manager/pages/inputs-page.tsx
apps/web/src/api/manager.api.ts
apps/web/src/shared/utils/labels.ts
```

### Riesgos

```txt
- `inventoryRequest` puede no traer todos los movimientos; puede requerir reutilizar `inventoryMovementsRequest`.
- Ajustes y merma en la misma pantalla pueden seguir confundiendo si no se separan bien.
- Fallback de labels puede exponer enums desconocidos.
```

### Criterios de aceptacion

```txt
- Cada movimiento visible tiene producto, cantidad, unidad, tipo legible, referencia, usuario/fecha cuando exista.
- Filtros son visibles y no ocultos en UI secundaria.
- Stock bajo y negativo son accionables.
- Ajustes manuales explican motivo.
```

### Pruebas necesarias

```txt
- E2E ajuste entrada/salida.
- E2E merma.
- E2E movimientos por lote de produccion.
- Tests de labels para movimientos conocidos.
```

### Deuda tecnica esperada

```txt
- Si falta usuario o referencia enriquecida en API, registrar deuda backend post UX-R6.
```

---

## 11. UX-R7 Rutas, caja y clientes

### Objetivo

Endurecer flujos P1: reparto, cierre de caja guiado y ficha comercial de cliente.

### Alcance

```txt
- Reparto: separar planeacion gerente de ejecucion repartidor si las rutas y permisos actuales lo permiten.
- Caja: convertir cierre en pasos, mostrar diferencia antes de confirmar y copy claro.
- Clientes: ficha comercial con saldo, limite, precios especiales, ventas y pagos.
- Mantener liquidacion y deposito a caja sin reglas nuevas.
```

### Fuera de alcance

```txt
- Nuevo rol backend repartidor si no existe.
- Nuevas reglas de credito.
- Cambios contables.
- Conciliacion bancaria avanzada.
```

### Archivos probables a tocar

```txt
apps/web/src/modules/manager/pages/routes-page.tsx
apps/web/src/modules/manager/pages/route-detail-page.tsx
apps/web/src/modules/manager/pages/cash-page.tsx
apps/web/src/modules/manager/pages/customers-page.tsx
apps/web/src/modules/manager/pages/customer-detail-page.tsx
apps/web/src/app/router.tsx
```

### Riesgos

```txt
- Experiencia repartidor puede quedar incompleta si no hay usuario/rol formal.
- Cierre de caja puede requerir reglas de motivo por diferencia que aun no estan declaradas.
- Ficha cliente puede mezclar venta, credito y precios sin jerarquia.
```

### Criterios de aceptacion

```txt
- Caja muestra esperado, contado y diferencia antes de confirmar.
- Repartidor o modo ruta muestra cliente actual y siguiente accion.
- Cliente muestra saldo, limite, credito disponible y precios especiales.
- Liquidacion pendiente se alerta claramente.
```

### Pruebas necesarias

```txt
- E2E cierre de caja.
- E2E ruta con pedido, pago/devolucion y liquidacion si la semilla lo soporta.
- E2E cliente con precio especial y venta POS.
```

### Deuda tecnica esperada

```txt
- Decision de rol repartidor puede seguir abierta si se confirma que es entidad operativa, no UserRole.
```

---

## 12. UX-R8 Reportes operativos y hardening UX

### Objetivo

Convertir reportes en herramientas accionables y cerrar hardening UX transversal.

### Alcance

```txt
- Mejorar reportes de produccion, rendimiento, consumo de insumos, merma y variacion.
- Conectar reportes con alertas y acciones cuando sea posible.
- Revisar lenguaje visible contra diccionario UX.
- Revisar estados vacios, errores, loading y permisos en pantallas principales.
- Endurecer responsive y accesibilidad basica.
```

### Fuera de alcance

```txt
- BI avanzado.
- Exportadores nuevos si ya existe export operativo suficiente.
- Reglas funcionales post piloto.
```

### Archivos probables a tocar

```txt
apps/web/src/modules/manager/pages/reports-page.tsx
apps/web/src/modules/manager/pages/billing-page.tsx
apps/web/src/modules/manager/pages/settings-page.tsx
apps/web/src/shared/components/*
apps/web/src/shared/utils/labels.ts
apps/web/e2e/*.spec.ts
```

### Riesgos

```txt
- Reportes pueden quedarse como graficas/tablas sin decision accionable.
- Algunas mejoras pueden depender de datos que hoy solo existen en backend avanzado.
- Hardening visual puede crecer si no se limita a P0/P1.
```

### Criterios de aceptacion

```txt
- Reportes responden preguntas operativas concretas.
- Lotes con variacion y consumo de insumos son faciles de interpretar.
- Estados vacios y errores son consistentes.
- No hay enums tecnicos visibles conocidos.
- E2E principal sigue pasando.
```

### Pruebas necesarias

```txt
- Playwright reportes.
- Smoke de facturacion y autofactura.
- Revision manual de responsive en desktop/tablet/mobile.
- `npm run lint -w @tortilla-plus/web`
```

### Deuda tecnica esperada

```txt
- Puede quedar deuda de visualizacion avanzada post piloto.
```

---

## 13. UX-R9 Piloto controlado y ajustes

### Objetivo

Validar el sistema con operacion real o simulada y convertir hallazgos en ajustes UX o deuda funcional.

### Alcance

```txt
- Ejecutar checklist de piloto con roles reales.
- Medir tiempos de POS, caja, produccion, ruta y facturacion.
- Registrar fricciones y preguntas frecuentes.
- Clasificar hallazgos en bug, deuda UX, deuda tecnica o deuda funcional.
- Decidir si se activan deudas post piloto: tolerancia configurable, agua inventariable, masa -> tortilla, empaques en venta.
```

### Fuera de alcance

```txt
- Implementar deudas funcionales sin evidencia del piloto.
- Cambios estructurales grandes no priorizados.
- Reescritura de frontend.
```

### Archivos probables a tocar

```txt
docs/ux/ux-technical-debt-log-v0.1.md
docs/inventory/inventory-recipes-post-r8-pilot-checklist-v0.1.md
docs/product/pilot-deploy-readiness-roles-v0.1.md
apps/web/e2e/*.spec.ts
```

### Riesgos

```txt
- El piloto descubre brechas funcionales fuera de UX.
- Datos semilla no representan operacion real.
- Usuarios mezclan rol real con permisos actuales.
```

### Criterios de aceptacion

```txt
- Piloto ejecutado con evidencias.
- Hallazgos clasificados por severidad.
- Deudas funcionales post piloto aceptadas, rechazadas o reprogramadas.
- UX queda lista para siguiente ciclo de producto.
```

### Pruebas necesarias

```txt
- Checklist manual de piloto.
- E2E completo antes y despues de ajustes.
- Validacion LAN/staging en dispositivos reales si aplica.
```

### Deuda tecnica esperada

```txt
- Deuda residual documentada y priorizada para siguiente fase.
```

---

## 14. Puede iniciar UX-R1?

Si, UX-R1 puede iniciar con restricciones.

Condiciones:

```txt
- No tocar backend.
- No cambiar reglas de negocio.
- Mantener rutas actuales y E2E existentes.
- Cerrar o aceptar explicitamente las decisiones UX-R0-D01 a UX-R0-D05 en `ux-r0-decisions`.
- Tratar busqueda global y alertas como slots estructurales en UX-R1; funcionalidad completa queda para UX-R3 salvo decision contraria.
```

---

## 15. Estado UX-R1

UX-R1 queda cerrado como base tecnica/visual inicial.

Implementado:

```txt
- Tokens `--tp-*` alineados con la paleta operativa sin romper aliases existentes.
- Header operativo compartido con sucursal, caja, usuario, rol, slot de alertas, busqueda visual y acceso rapido a POS.
- Header integrado en layout manager, POS compacto y supervisor.
- Componentes base: OperationalCard, OperationalAlert, OperationalTable y WorkspacePageHeader.
- Aplicacion inicial de componentes base en Inicio e Inventario como pantallas de bajo riesgo.
```

Pendiente para siguientes sprints:

```txt
- Busqueda global funcional: UX-R3/UX-R8.
- Centro de alertas real: UX-R3.
- Navegacion por areas y rol: UX-R2.
- Reemplazo progresivo de patrones legacy en pantallas restantes: UX-R2 a UX-R8.
```

Decision:

```txt
UX-R2 puede iniciar.
```

---

## 16. Estado UX-R2

UX-R2 queda cerrado para la capa de navegacion e IA visible.

Implementado:

```txt
- Menu manager reorganizado por areas de trabajo: Inicio, Mostrador, Produccion, Inventario, Reparto, Clientes, Administracion, Fiscal / Reportes y Configuracion.
- Subnavegacion visible en desktop para acciones secundarias por area.
- Filtros de visibilidad siguen usando permisos y features existentes.
- Rutas canonicas bajo `/app/...` para areas principales.
- Rutas legacy `/app/manager/...` se conservan para compatibilidad y E2E existentes.
- Login/seleccion de sucursal para manager/owner aterriza en `/app`.
```

Pendiente para siguientes sprints:

```txt
- Badges con conteos operativos reales: UX-R3.
- Experiencia dedicada de repartidor y cierre de caja guiado: UX-R7.
- Centro de alertas: UX-R3.
```

Decision:

```txt
UX-R3 puede iniciar.
```

---

## 17. Estado UX-R3

UX-R3 queda cerrado para Panel del dia y alertas operativas con datos disponibles.

Implementado:

```txt
- Panel del dia ampliado con ventas, caja, produccion abierta, rutas pendientes, stock por revisar, credito pendiente, facturas pendientes y alertas criticas.
- Alertas derivadas desde endpoints existentes: caja, retiros, inventario, produccion, reparto, clientes y fiscal.
- Centro de alertas en `/app/alerts`.
- Header operativo enlaza a alertas.
- Navegacion Inicio incluye Panel del dia y Alertas.
```

Limitaciones aceptadas:

```txt
- No se agrego backend de alertas.
- Las alertas no tienen estado persistente, responsable ni resolucion.
- Lotes con variacion detallada quedan para UX-R5/UX-R8, porque requieren el flujo guiado y/o reporte especifico.
```

Decision:

```txt
UX-R4 puede iniciar.
```

---

## 18. Estado UX-R4

UX-R4 queda cerrado para el contrato teclado-first del POS.

Implementado:

```txt
- Atajos alineados con especificacion: F1 tortilla kg, F2 tortilla por monto, F3 masa kg, F4 masa por monto, F5 paquete, F6 buscar, F9 cobrar, Esc cancelar/cerrar capa activa.
- Se conserva Ctrl+F como alias adicional de busqueda, sin hacerlo visible como atajo principal.
- Guia visible de atajos en la cabecera del POS.
- Ticket muestra acciones `Cobrar (F9)` y `Cancelar venta (Esc)`.
- Prueba E2E agregada para atajos visibles, flujo rapido con F1, apertura de cobro desde `Cobrar (F9)` y cierre con Esc.
```

Limitaciones aceptadas:

```txt
- Bascula real sigue fuera de alcance.
- No se agregaron nuevas reglas de cobro, credito, stock o productos.
- No se modifico backend.
```

Decision:

```txt
UX-R5 puede iniciar.
```

---

## 19. Estado UX-R5

UX-R5 queda cerrado para produccion por receta guiada.

Implementado:

```txt
- Nuevo lote por receta muestra pasos 1 y 2: elegir receta y confirmar insumos esperados.
- Cierre de lote por receta muestra wizard de 5 pasos.
- Captura de reales separa salida real, motivo de variacion e insumos reales.
- Revision de rendimiento compara esperado vs real, diferencia absoluta y porcentaje.
- Variacion menor a 3%, de 3% a 10% y mayor a 10% se comunica con estados visuales.
- Cierre bloqueado por motivo requerido se explica en lenguaje operativo.
- Variacion mayor a 10% muestra autorizacion requerida sin cambiar backend.
- Movimientos generados quedan visibles como paso 5.
- Enlaces de produccion migrados a rutas canonicas `/app/production/...`.
```

Limitaciones aceptadas:

```txt
- No se implemento PIN ni selector formal de autorizador.
- No se modificaron reglas de variacion.
- No se agrego tolerancia configurable por organizacion.
```

Decision:

```txt
UX-R6 puede iniciar.
```

---

## 20. Estado UX-R6

UX-R6 queda cerrado para inventario, movimientos y trazabilidad con los datos actuales.

Implementado:

```txt
- Inventario reorganizado como superficie operativa con resumen de stock correcto, bajo minimo, agotado y negativo.
- Existencias muestran producto, tipo, cantidad, minimo, estado y actualizacion con estados accionables.
- Ajustes y merma quedan en panel separado, conservando permisos y reglas existentes.
- Movimientos trazables visibles en la pantalla principal de inventario.
- Filtros visibles por producto, tipo de movimiento, referencia y rango de fechas.
- Referencias se muestran con lenguaje operativo: ajuste manual, lote de produccion, venta, merma, pedido/devolucion de ruta.
- Movimientos muestran fecha, producto, tipo legible, cantidad con signo, referencia, motivo y usuario cuando el API lo entrega.
- `inventoryMovementsRequest` reutiliza el endpoint existente y soporta filtros ya disponibles en backend.
- Datos demo de movimientos agregados para validar la experiencia con mocks.
- E2E agregado para ajuste de salida, merma y trazabilidad de movimientos desde UI.
```

Limitaciones aceptadas:

```txt
- No se modifico backend.
- No se agregaron reglas nuevas de stock negativo, reorden automatico, agua inventariable ni empaques.
- El API entrega IDs de usuario y referencia tecnica; nombres/folios enriquecidos quedan como deuda UX-DEBT-021.
```

Decision:

```txt
UX-R7 puede iniciar.
```

---

## 21. Estado UX-R7

UX-R7 queda cerrado para rutas, caja y clientes con el alcance permitido por frontend y APIs existentes.

Implementado:

```txt
- Caja actual usa cierre guiado de 3 pasos: contar, revisar diferencia y confirmar cierre.
- Diferencia de caja queda visible antes de confirmar, con alerta cuando hay diferencia y comentario operativo.
- Caja usa componentes operativos compartidos y ruta canonica `/app/cash` en accesos nuevos.
- Detalle de ruta muestra resumen de ejecucion: siguiente cliente, pedidos por cargar, pedidos en ruta y efectivo por liquidar.
- Detalle de ruta muestra una alerta de siguiente accion para preparar, cargar, salir a ruta, entregar o cobrar segun estado del pedido.
- Ficha de cliente muestra resumen comercial arriba: saldo, limite, credito disponible, ruta y cantidad de precios especiales.
- Ficha de cliente alerta credito excedido o saldo pendiente sin cambiar reglas de credito.
- Clientes ya no se caen si reparto/rutas no esta disponible; la asignacion a ruta queda deshabilitada y la ficha sigue operable.
- Smoke E2E cubre caja guiada, modo de ruta y ficha comercial.
```

Limitaciones aceptadas:

```txt
- No se creo un nuevo UserRole repartidor.
- No se modificaron reglas de credito, liquidacion ni cierre de caja.
- No se agrego flujo offline/mobile dedicado para repartidor.
- Devoluciones detalladas por ruta siguen usando capacidades existentes del backend y quedan para hardening posterior si el piloto lo exige.
```

Decision:

```txt
UX-R8 puede iniciar.
```

---

## 22. Estado UX-R8

UX-R8 queda cerrado para reportes operativos y hardening UX transversal de alto impacto.

Implementado:

```txt
- Reportes agregan alertas operativas accionables para rendimiento de produccion, consumo de insumos y diferencias de caja.
- Reportes enlazan acciones hacia Produccion, Inventario y Caja segun la alerta.
- Tabla de lotes recientes muestra severidad visual de variacion: normal, advertencia y riesgo.
- Reportes usan componentes operativos compartidos para cards, alertas y tablas.
- Facturacion muestra alertas para ventas pendientes, errores de timbrado y tickets QR activos.
- Facturacion destaca errores fiscales con estado visual de riesgo.
- `labelFrom` deja de exponer enums desconocidos y usa copy neutral `Sin clasificar`.
- Se retiro de POS el control visible deshabilitado `Bascula futura`.
- Se corrigio mojibake visible en auditoria de ajustes.
```

Limitaciones aceptadas:

```txt
- Busqueda global funcional sigue pendiente porque no hay endpoint unico ni modelo de busqueda transversal.
- Estados vacios fueron endurecidos en reportes/facturacion, pero el barrido total queda para piloto.
- El centro de alertas sigue derivado en frontend; endpoint formal queda como deuda.
- Movimientos de inventario siguen sin usuario/nombre de referencia enriquecidos desde API.
```

Decision:

```txt
UX-R9 puede iniciar.
```

---

## 23. Estado UX-R9

UX-R9 queda cerrado para piloto controlado local con evidencia automatica.

Implementado:

```txt
- Se ejecuto E2E completo del frontend con `VITE_USE_MOCKS=false`.
- Se validaron 9 casos E2E transversales: plataforma, dashboard, caja, POS, cliente, retail, autofactura, produccion por receta e inventario trazable.
- Se ejecuto lint y build web.
- Se creo `docs/ux/ux-r9-controlled-pilot-report-v0.1.md`.
- Se clasificaron hallazgos y deuda residual por severidad.
- Se resolvio la decision UX-R0-D04: repartidor queda como entidad operativa, no UserRole, para piloto.
- Se marco UX-DEBT-006 como aceptada post piloto bajo el alcance controlado.
```

Evidencia:

```txt
npm run test:e2e -w @tortilla-plus/web -> 9 passed
npm run lint -w @tortilla-plus/web -> passed
npm run build -w @tortilla-plus/web -> passed con warning conocido de chunk size
```

Decision:

```txt
GO condicionado para piloto controlado local/staging.
```

Condiciones restantes antes de usuarios reales:

```txt
- Ejecutar checklist manual en LAN/staging.
- Confirmar CORS, dominios y variables productivas.
- Confirmar que busqueda global, repartidor autenticado, contador y bascula real no se prometen como alcance del piloto.
- Registrar cualquier hallazgo manual critico/alto antes de expandir el piloto.
```

---

## 24. Estado UX-R10

UX-R10 queda preparado para piloto staging, sin cambios de backend ni reglas de negocio nuevas.

Corregido:

```txt
- Se aclaro en el reporte UX-R9 que UX-R9 no agrego reglas backend nuevas.
- Se dejo explicito que el ciclo UX-R0 a UX-R9 si incluyo soporte backend previo para reportes de produccion y seed demo en el commit afb709f7ed4e99ca39b209e78c4d94a96952400e.
- Se agrego `docs/ux/ux-r10-staging-pilot-checklist-v0.1.md`.
- Se registro UX-DEBT-022 por riesgo de `Alertas 0` falso en header operativo.
- Se cerro UX-DEBT-022 ocultando el numero de alertas cuando `OperationalHeader` no recibe una fuente real de conteo.
```

Validaciones ejecutadas:

```txt
npm run lint -w @tortilla-plus/web -> passed
npm run build -w @tortilla-plus/web -> passed con warning conocido de chunk size
npm run test:e2e -w @tortilla-plus/web -> 9 passed
```

Decision:

```txt
GO condicionado para piloto staging.
Condiciones: confirmar frontend publico, API publica, VITE_USE_MOCKS=false, CORS cerrado, migraciones/seed o bootstrap de piloto, y smoke manual completo.
```

Fuera de alcance a no prometer:

```txt
- Repartidor autenticado.
- Contador final role.
- Busqueda global funcional.
- Bascula real.
- Alertas backend formales.
- PAC real si no esta configurado.
```

---

## 25. Estado UX-R11

UX-R11 queda preparado como base automatizada para manuales de usuario final y screenshots operativos.

Implementado:

```txt
- Spec Playwright `apps/web/e2e/manual-screenshots.spec.ts`.
- Carpeta documental `docs/manuals/`.
- Runbook `docs/manuals/screenshots-runbook-v0.1.md`.
- Manuales base para cajero, gerente, produccion, inventario y administrador.
- Salida automatizada esperada en `docs/manuals/screenshots/`.
- Capturas cubren login, seleccion de sucursal, panel del dia, alertas, POS, cobro, caja, produccion, inventario, clientes, rutas, facturacion y reportes.
```

Reglas respetadas:

```txt
- No se modifico backend.
- No se agregaron reglas de negocio.
- No se agregaron `data-testid`.
- No se incluyo manual de repartidor autenticado.
- No se incluyo manual de contador.
- No se promete bascula real.
- No se promete busqueda global funcional.
- No se prometen alertas backend formales.
```

Validaciones objetivo:

```txt
npm run lint -w @tortilla-plus/web -> passed
npm run build -w @tortilla-plus/web -> passed con warning conocido de chunk size
npm run test:e2e -w @tortilla-plus/web -- manual-screenshots.spec.ts -> passed, 20 screenshots generados
```

Decision:

```txt
Listo para manuales de piloto como base V0.1.
Condicion: las capturas de rutas usan fixtures controlados en el spec hasta que el seed local/staging exponga rutas operables para screenshots sin intercepts.
```

---

## 26. Estado UX-R12

UX-R12 queda implementado como base de screenshots y manual de arranque para dueno nuevo.

Implementado:

```txt
- Spec Playwright `apps/web/e2e/manual-owner-onboarding-screenshots.spec.ts`.
- Screenshots 21 a 32 en `docs/manuals/screenshots/`.
- `docs/manuals/manual-arranque-dueno-v0.1.md` actualizado como primer manual de onboarding.
- Runbook actualizado con comando, usuario demo, variables, estado requerido y limitaciones.
```

Screenshots generados:

```txt
21-settings.png
22-productos-listado.png
23-producto-nuevo.png
24-precios.png
25-insumos-listado.png
26-insumo-nuevo.png
27-recetas-listado.png
28-receta-nueva.png
29-inventario-ajuste-inicial.png
30-cliente-nuevo.png
31-apertura-caja.png
32-venta-prueba-pos.png
```

Deudas detectadas:

```txt
UX-DEBT-024 Onboarding de dueno nuevo incompleto visualmente.
```

Validaciones objetivo:

```txt
npm run lint -w @tortilla-plus/web -> passed
npm run build -w @tortilla-plus/web -> passed con warning conocido de chunk size
npm run test:e2e -w @tortilla-plus/web -- manual-owner-onboarding-screenshots.spec.ts -> passed, 12 screenshots generados
```

Decision:

```txt
Listo para manual de arranque V0.1 con deuda UX-DEBT-024 abierta.
Condicion: el arranque se documenta sobre pantallas operativas existentes, no sobre un wizard dedicado de cuenta nueva.
```
