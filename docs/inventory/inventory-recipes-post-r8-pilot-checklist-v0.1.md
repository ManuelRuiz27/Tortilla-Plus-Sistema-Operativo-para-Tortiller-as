# Tortilla Plus - Checklist Piloto Inventario con Recetas Post R8-B V0.1

**Producto:** Tortilla Plus - V1 Operativa Comercial  
**Fase:** Post R8-B - Piloto operativo controlado  
**Fuente de verdad funcional:** `docs/system-modules-and-flows-source-of-truth-v0.1.md`  
**Roadmap asociado:** `docs/inventory/inventory-recipes-post-r8-roadmap-v0.1.md`  
**Checklist deploy general:** `docs/deployment/pilot-deploy-execution-checklist-v0.1.md`  
**Estado:** Listo para ejecucion de piloto local/staging  
**Fecha:** 2026-06-17  

---

## 1. Objetivo

Validar el flujo operativo de inventario con recetas usando datos reales o semi-reales, roles reales y dispositivos externos, sin ampliar alcance funcional.

El piloto debe confirmar que una tortilleria puede:

1. Consultar insumos.
2. Crear o revisar recetas.
3. Crear lote por receta.
4. Capturar salida e insumos reales.
5. Cerrar lote.
6. Ver movimientos auditables.
7. Ver reportes de rendimiento y consumo.
8. Seguir operando POS, caja, rutas, credito y facturacion sin regresiones.

---

## 2. Datos demo requeridos

El seed local debe dejar disponibles:

| Dato | Esperado |
|---|---|
| Organizacion | `Demo Tortilla Plus` |
| Sucursal | `Sucursal Principal` |
| Owner | `owner.demo@tortillaplus.mx` |
| Gerente | `manager.demo@tortillaplus.mx` |
| Supervisor | `supervisor.demo@tortillaplus.mx` |
| Cajero | `cashier.demo@tortillaplus.mx` |
| Password demo | `Demo1234!` |
| PIN demo | `1234` |
| Producto salida | `MASA-KG` |
| Insumos | `MAIZ-BLANCO-KG`, `HARINA-MAIZ-KG`, `CAL-KG` |
| Conversiones | costal/cubeta para maiz, costal para harina, bulto para cal |
| Receta | `Masa estandar demo` |
| Stock inicial insumos | suficiente para cerrar al menos un lote demo |

---

## 3. Validacion automatica antes de piloto

Ejecutar:

```powershell
npm run db:validate -w @tortilla-plus/api
npm run build -w @tortilla-plus/api
npm run db:seed -w @tortilla-plus/api
npm run test -w @tortilla-plus/api
$env:DATABASE_URL='postgresql://tortilla_plus:tortilla_plus_dev@localhost:5432/tortilla_plus?schema=public'
$env:DIRECT_URL=$env:DATABASE_URL
npm run test:integration -w @tortilla-plus/api
npm run build -w @tortilla-plus/web
npm run test:e2e -w @tortilla-plus/web
```

Criterio:

- Todas las pruebas pasan.
- `Post R8-B seed exposes pilot users, inputs, conversions and demo recipe` pasa.
- E2E de inventario/recetas pasa.
- E2E smoke de POS, reportes, plataforma y autofactura pasa.

---

## 4. Validacion manual por rol

### 4.1 Owner

- [ ] Login con `owner.demo@tortillaplus.mx`.
- [ ] Entra a manager.
- [ ] Puede navegar a Productos, Insumos, Recetas, Produccion y Reportes.
- [ ] No entra a `/platform`.
- [ ] Puede revisar configuracion de negocio si el plan lo permite.

### 4.2 Gerente

- [ ] Login con `manager.demo@tortillaplus.mx`.
- [ ] Ve inventario e insumos.
- [ ] Ve receta `Masa estandar demo`.
- [ ] Crea lote por receta.
- [ ] Captura salida real.
- [ ] Captura consumo real de maiz/harina/cal.
- [ ] Cierra lote con variacion menor a 3% sin motivo.
- [ ] Cierra otro lote con variacion 3%-10% con motivo.
- [ ] Consulta movimientos `production_input_out` y `production_in`.
- [ ] Consulta reportes de produccion y rendimiento.

### 4.3 Supervisor

- [ ] Login con `supervisor.demo@tortillaplus.mx`.
- [ ] Entra a panel de supervisor.
- [ ] Autoriza/rechaza retiros si hay solicitudes.
- [ ] Si se usa variacion alta de produccion, valida que exista autorizador con `production.authorize_variance`.
- [ ] No accede a funciones de plataforma.

### 4.4 Cajero

- [ ] Login con `cashier.demo@tortillaplus.mx`.
- [ ] Entra a POS.
- [ ] Abre caja.
- [ ] No ve insumos como productos vendibles.
- [ ] Vende tortilla/masa/retail.
- [ ] Solicita retiro.
- [ ] No puede vender `raw_material` ni `packaging`.

---

## 5. Flujos transversales a verificar

| Flujo | Validacion |
|---|---|
| POS | venta normal descuenta inventario via ledger |
| Caja | apertura, retiro, autorizacion y cierre conservan reglas |
| Produccion por receta | cierre descuenta insumos e ingresa salida |
| Inventario | movimientos consultables por lote |
| Reportes | produccion y consumo aparecen despues del cierre |
| Rutas | no cargan insumos ni empaques |
| Credito | cliente demo conserva precio especial y limite |
| Facturacion | autofactura sigue disponible para recibo elegible |
| Plataforma | suspension de organizacion bloquea operacion |

---

## 6. Prueba con dispositivo externo

Con backend y frontend levantados en LAN:

```txt
API: http://<LAN_IP>:3000/api/v1
Frontend: http://<LAN_IP>:5173
```

Validar en telefono/tablet:

- [ ] Login carga correctamente.
- [ ] Manager navega a Produccion.
- [ ] La pantalla de cierre de lote es usable.
- [ ] Reportes se leen sin tablas rotas.
- [ ] POS se puede usar sin zoom excesivo.
- [ ] No hay errores de CORS.

---

## 7. Go / No-Go Post R8-B

Go si:

- [ ] Validacion automatica pasa completa.
- [ ] Owner, gerente, supervisor y cajero entran al destino correcto.
- [ ] Se cierra al menos un lote por receta desde UI.
- [ ] Reportes muestran el lote cerrado.
- [ ] POS/caja/rutas/facturacion no presentan regresiones.
- [ ] No hay deuda critica o alta abierta.

No-Go si:

- [ ] Se requiere mock para una pantalla visible del piloto.
- [ ] Los insumos aparecen como vendibles.
- [ ] Cierre de lote no genera movimientos auditables.
- [ ] Reportes no cuadran con lote cerrado.
- [ ] Hay error de permisos por rol en flujos esperados.
- [ ] Dispositivo externo no puede operar por CORS, layout roto o servidor inaccesible.

---

## 8. Registro de hallazgos

Formato:

```txt
ID:
Fecha:
Rol:
Dispositivo:
Flujo:
Severidad:
Descripcion:
Resultado esperado:
Resultado observado:
Evidencia:
Decision:
```

Todo hallazgo critico o alto debe registrarse en `docs/inventory/inventory-recipes-technical-debt-log-v0.1.md` antes de avanzar a Post R8-C.
