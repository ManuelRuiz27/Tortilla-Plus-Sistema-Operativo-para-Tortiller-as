# Tortilla Plus - UX-R9 Piloto Controlado y Ajustes V0.1

**Area:** UX/UI, frontend, QA operativo  
**Fecha:** 2026-06-19  
**Estado:** Piloto controlado local ejecutado con evidencia automatica  
**Ambiente:** Local, `VITE_USE_MOCKS=false`, API local con seed E2E  

---

## 1. Objetivo

Validar que los flujos UX trabajados de UX-R0 a UX-R8 pueden operar juntos en un piloto controlado sin mocks de frontend, sin reglas de negocio nuevas y sin regresiones visibles en los caminos principales.

---

## 2. Alcance validado

```txt
- Plataforma: acceso platform owner y paneles operativos principales.
- Owner / manager: dashboard, caja, reportes, rutas, cliente, fiscal y ajustes.
- POS: caja requerida, atajos teclado-first, venta con precio especial, venta retail con stock.
- Produccion por receta: cierre de lote, movimientos auditables y reportes.
- Inventario: ajuste, merma y ledger trazable.
- Fiscal: autofactura publica con PDF/XML mock elegible.
```

Fuera de alcance del piloto controlado UX-R9:

```txt
- Repartidor como usuario autenticado.
- Bascula real.
- Busqueda global funcional.
- Endpoint formal de alertas.
- Enriquecimiento backend de usuario/folio en movimientos de inventario.
- Validacion fisica en LAN/tablet/telefono.
```

---

## 3. Evidencia automatica

Comandos ejecutados:

```powershell
npm run test:e2e -w @tortilla-plus/web
npm run lint -w @tortilla-plus/web
npm run build -w @tortilla-plus/web
```

Resultado:

```txt
E2E: 9 passed
Lint web: passed
Build web: passed
```

Nota de build:

```txt
Vite mantiene warning conocido de chunk mayor a 500 kB. No bloquea UX-R9, pero puede atenderse como optimizacion tecnica posterior.
```

---

## 4. Casos E2E cubiertos

| Caso | Flujo | Estado |
|---|---|---|
| UX-R9-E2E-01 | Manager/owner entra a dashboard, caja, reportes, rutas, cliente, facturacion, ajustes y export CSV | Pasa |
| UX-R9-E2E-02 | POS bloquea venta sin caja y rechaza input numerico destructivo | Pasa |
| UX-R9-E2E-03 | POS muestra atajos teclado-first y completa flujo de cobro | Pasa |
| UX-R9-E2E-04 | Precio especial de cliente se aplica en POS | Pasa |
| UX-R9-E2E-05 | Producto retail recibe stock inicial y se vende en POS | Pasa |
| UX-R9-E2E-06 | Autofactura publica genera factura y documentos PDF/XML mock | Pasa |
| UX-R9-E2E-07 | Produccion por receta cierra lote y genera movimientos auditables | Pasa |
| UX-R9-E2E-08 | Inventario registra ajuste, merma y movimientos trazables | Pasa |
| UX-R9-E2E-09 | Platform owner entra a rutas de plataforma y paneles principales | Pasa |

---

## 5. Hallazgos clasificados

### Criticos

```txt
Ninguno detectado en el piloto controlado automatizado.
```

### Altos

```txt
UX-DEBT-006 Roles UX incompletos queda aceptado para post piloto.
No bloquea este piloto controlado porque el alcance aprobado mantiene repartidor como entidad operativa, no UserRole, y no introduce contador como usuario piloto.
```

### Medios

```txt
UX-DEBT-016 Busqueda global funcional sigue pendiente.
UX-DEBT-017 Barrido total de estados vacios queda para validacion manual/piloto real.
UX-DEBT-020 Alertas siguen derivadas en frontend, sin endpoint formal.
UX-DEBT-021 Movimientos de inventario no tienen usuario/folio enriquecido desde API.
```

### Bajos

```txt
Warning de chunk size en build web.
Warning Prisma config deprecated durante webServer E2E.
```

---

## 6. Go / No-Go UX

Decision UX-R9:

```txt
GO condicionado para piloto controlado local/staging.
```

Condiciones antes de piloto con usuarios reales:

```txt
- Ejecutar checklist manual en dispositivo real o LAN.
- Confirmar CORS y URL publica del API/frontend.
- Confirmar que el alcance de roles piloto excluye repartidor autenticado y contador.
- Confirmar que busqueda global no se promete como funcional completa.
- Revisar que modulos fuera de alcance sigan ocultos o bloqueados por feature/permiso.
```

No-Go si aparece cualquiera de estos puntos en staging:

```txt
- Pantalla visible que requiera mocks.
- POS no bloquea caja cerrada, POS sin licencia u organizacion suspendida.
- Usuario de organizacion entra a /platform.
- Platform owner opera flujos de sucursal.
- Produccion por receta no genera movimientos auditables.
- Facturacion/autofactura falla en flujo elegible.
```

---

## 7. Ajustes aplicados durante ciclo UX-R9

```txt
- No se modifico backend.
- No se agregaron reglas de negocio.
- Se consolido evidencia E2E transversal con VITE_USE_MOCKS=false.
- Se documento decision Go condicionado para piloto controlado.
- Se reclasifico deuda de roles como aceptada post piloto bajo alcance actual.
```

---

## 8. Siguiente ciclo recomendado

```txt
1. Ejecutar piloto manual en LAN/staging con owner, manager, cajero y platform_owner.
2. Registrar fricciones con el formato de hallazgos.
3. Resolver solo bloqueadores criticos/altos observados.
4. Separar backlog post piloto: busqueda global, alertas backend, roles futuros, enriquecimiento de movimientos y optimizacion bundle.
```
