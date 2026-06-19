# Tortilla Plus - Manual del gerente V0.1

**Rol:** Gerente  
**Estado:** Base para piloto  
**Screenshots:** `docs/manuals/screenshots/`

---

## 1. Objetivo del rol

Supervisar la operacion diaria de la sucursal: ventas, caja, inventario, produccion, clientes, rutas, facturacion y reportes.

---

## 2. Que puede hacer

- Entrar al panel del dia.
- Revisar centro de alertas operativo.
- Supervisar POS y caja.
- Revisar inventario y movimientos.
- Gestionar clientes y saldos.
- Revisar rutas desde la experiencia de gerente.
- Consultar facturacion y reportes.
- Revisar produccion por receta y lotes abiertos.

---

## 3. Que no puede hacer

- No sustituye la autorizacion formal de supervisor/PIN para variaciones altas si esa capacidad no esta configurada.
- No usa una app dedicada de repartidor autenticado.
- No opera rol contador final.
- No debe prometer busqueda global funcional.
- No debe presentar alertas como backend formal persistente.

---

## 4. Pasos principales

1. Iniciar sesion.
2. Seleccionar sucursal si aplica.
3. Revisar el panel del dia.
4. Abrir el centro de alertas.
5. Revisar caja actual y cierre.
6. Revisar inventario y movimientos.
7. Revisar clientes con saldo o credito.
8. Revisar rutas y detalle de ruta.
9. Consultar facturacion.
10. Consultar reportes operativos.

---

## 5. Errores comunes

| Caso | Que hacer |
|---|---|
| Header no muestra conteo de alertas | Entrar al centro de alertas; el conteo puede no venir de una fuente backend formal. |
| Movimiento muestra referencia tecnica | Usar fecha, producto, tipo y motivo; registrar necesidad de folio legible si bloquea auditoria. |
| Ruta no disponible | Confirmar plan/features antes de operarla. |
| Facturacion no timbra real | Confirmar configuracion PAC/sandbox antes de prometer CFDI real. |
| Variacion alta de produccion | Registrar motivo y tratar autorizacion como flujo controlado segun permisos actuales. |

---

## 6. Screenshots referenciados

- Login: `screenshots/01-login.png`
- Seleccion de sucursal: `screenshots/02-seleccion-sucursal.png`
- Panel del dia: `screenshots/03-panel-del-dia.png`
- Centro de alertas: `screenshots/04-centro-alertas.png`
- Caja: `screenshots/08-caja.png`
- Cierre de caja: `screenshots/09-cierre-caja.png`
- Inventario: `screenshots/13-inventario.png`
- Movimientos de inventario: `screenshots/14-movimientos-inventario.png`
- Clientes: `screenshots/15-clientes.png`
- Detalle de cliente: `screenshots/16-detalle-cliente.png`
- Rutas: `screenshots/17-rutas.png`
- Detalle de ruta: `screenshots/18-detalle-ruta.png`
- Facturacion: `screenshots/19-facturacion.png`
- Reportes: `screenshots/20-reportes.png`

---

## 7. Recomendaciones operativas

- Iniciar el dia revisando panel, alertas y caja.
- Revisar movimientos de inventario despues de ajustes, merma, venta o produccion.
- Documentar hallazgos del piloto con pantalla, rol, pasos y resultado observado.
- Mantener fuera del discurso operativo los modulos no incluidos en piloto.
