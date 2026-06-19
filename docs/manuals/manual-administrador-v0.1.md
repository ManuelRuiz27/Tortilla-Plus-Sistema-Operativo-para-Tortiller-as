# Tortilla Plus - Manual del administrador V0.1

**Rol:** Administrador / dueno de organizacion  
**Estado:** Base para piloto  
**Screenshots:** `docs/manuals/screenshots/`

---

## 1. Objetivo del rol

Configurar y supervisar la operacion de la organizacion y sus sucursales dentro del alcance habilitado para el piloto.

---

## 2. Que puede hacer

- Iniciar sesion y seleccionar sucursal.
- Revisar panel del dia y centro de alertas.
- Supervisar caja, inventario, produccion, clientes, rutas, facturacion y reportes.
- Revisar configuracion operativa disponible.
- Dar seguimiento a hallazgos del piloto.

---

## 3. Que no puede hacer

- No debe prometer contador como rol final.
- No debe prometer repartidor autenticado.
- No debe prometer busqueda global funcional.
- No debe prometer bascula real.
- No debe presentar alertas como modulo backend formal.
- No debe prometer PAC real sin configuracion productiva o sandbox validada.

---

## 4. Pasos principales

1. Entrar con usuario administrador.
2. Seleccionar sucursal.
3. Revisar panel del dia.
4. Abrir centro de alertas.
5. Revisar flujos P0: POS, caja, produccion, inventario y clientes.
6. Revisar rutas si el plan lo habilita.
7. Revisar facturacion segun ambiente.
8. Revisar reportes operativos.
9. Registrar hallazgos y decisiones de piloto.

---

## 5. Errores comunes

| Caso | Que hacer |
|---|---|
| Se espera una funcion fuera de alcance | Confirmar lista de "no prometer" del piloto. |
| Alertas sin conteo en header | Entrar al centro de alertas; no hay backend formal de alertas. |
| Facturacion real no disponible | Verificar PAC/sandbox/configuracion antes de prometer timbrado. |
| Movimientos con IDs tecnicos | Registrar deuda de enriquecimiento de referencia/usuario. |
| Ruta bloqueada por plan | Confirmar plan y features de la organizacion. |

---

## 6. Screenshots referenciados

- Login: `screenshots/01-login.png`
- Seleccion de sucursal: `screenshots/02-seleccion-sucursal.png`
- Panel del dia: `screenshots/03-panel-del-dia.png`
- Centro de alertas: `screenshots/04-centro-alertas.png`
- Caja: `screenshots/08-caja.png`
- Produccion: `screenshots/10-produccion.png`
- Inventario: `screenshots/13-inventario.png`
- Clientes: `screenshots/15-clientes.png`
- Rutas: `screenshots/17-rutas.png`
- Facturacion: `screenshots/19-facturacion.png`
- Reportes: `screenshots/20-reportes.png`

---

## 7. Recomendaciones operativas

- Usar este manual como base de capacitacion, no como contrato funcional final.
- Confirmar ambiente, CORS, seed y variables antes de capturar material de piloto.
- Registrar todo bloqueo con rol, pantalla, pasos y evidencia.
- Mantener comunicacion clara sobre funcionalidades fuera de alcance.
