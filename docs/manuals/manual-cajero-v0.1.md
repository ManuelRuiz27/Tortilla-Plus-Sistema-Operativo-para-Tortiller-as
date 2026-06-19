# Tortilla Plus - Manual del cajero V0.1

**Rol:** Cajero  
**Estado:** Base para piloto  
**Screenshots:** `docs/manuals/screenshots/`

---

## 1. Objetivo del rol

Operar ventas de mostrador, cobrar tickets y mantener la caja diaria controlada durante el turno.

---

## 2. Que puede hacer

- Iniciar sesion y trabajar en la sucursal asignada.
- Abrir POS y registrar ventas de mostrador.
- Agregar productos vendibles al ticket.
- Cobrar en efectivo, tarjeta, transferencia o credito cuando el cliente aplica.
- Consultar el ticket antes de completar la venta.
- Abrir caja si el flujo lo solicita.
- Revisar caja actual y participar en el cierre guiado cuando tenga permiso.

---

## 3. Que no puede hacer

- No administra productos, precios, recetas ni usuarios.
- No configura reglas de credito.
- No opera como repartidor autenticado.
- No emite promesas de bascula real ni busqueda global funcional.
- No resuelve alertas backend formales; las alertas visibles son operativas y derivadas del frontend.

---

## 4. Pasos principales

1. Entrar al sistema desde login.
2. Confirmar la sucursal de trabajo si el sistema lo solicita.
3. Entrar a POS.
4. Agregar producto al ticket.
5. Revisar cantidad, precio y total.
6. Abrir cobro.
7. Capturar metodo de pago.
8. Completar venta.
9. Al final del turno, revisar caja y cierre guiado si corresponde.

---

## 5. Errores comunes

| Caso | Que hacer |
|---|---|
| No hay caja abierta | Abrir caja desde el flujo de POS o avisar al gerente. |
| Producto no aparece en POS | Confirmar con gerente que sea vendible y tenga precio. |
| Pago incompleto | Revisar que el monto cubra el total del ticket. |
| Cliente sin credito disponible | Usar otro metodo de pago o pedir autorizacion operativa. |
| Se capturo cantidad incorrecta | Corregir el item antes de cobrar o cancelar el ticket. |

---

## 6. Screenshots referenciados

- Login: `screenshots/01-login.png`
- Seleccion de sucursal: `screenshots/02-seleccion-sucursal.png`
- POS nueva venta: `screenshots/05-pos-nueva-venta.png`
- POS ticket con productos: `screenshots/06-pos-ticket-con-productos.png`
- Modal de cobro: `screenshots/07-modal-cobro.png`
- Caja: `screenshots/08-caja.png`
- Cierre de caja: `screenshots/09-cierre-caja.png`

---

## 7. Recomendaciones operativas

- Mantener visible el total antes de cobrar.
- Confirmar producto y cantidad con el cliente antes de completar venta.
- No cerrar caja si existe diferencia sin comentario operativo.
- Usar los atajos visibles en POS solo como apoyo; no dependen de bascula real.
