# Tortilla Plus - UX-R10 Checklist Piloto Staging V0.1

**Area:** UX operativa / piloto staging  
**Estado:** Preparado para ejecucion manual  
**Fecha:** 2026-06-19  

---

## 1. Objetivo

Validar en staging que los flujos P0 construidos de UX-R1 a UX-R9 pueden operarse con usuarios reales de piloto, API real, mocks apagados y datos controlados, sin prometer modulos fuera de alcance.

---

## 2. Ambiente requerido

```txt
Frontend publico: pendiente de confirmar antes del piloto.
API publica: pendiente de confirmar antes del piloto.
API base esperada: https://API_DOMAIN/api/v1
Mocks frontend: VITE_USE_MOCKS=false
CORS API: CORS_ORIGINS debe incluir solo el dominio publico del frontend de staging.
Base de datos: migraciones aplicadas.
Datos: seed demo o bootstrap de piloto ejecutado segun tipo de entorno.
```

Referencia de deploy existente:

```txt
docs/deployment/pilot-deploy-execution-checklist-v0.1.md
apps/web/.env.render.example
apps/api/.env.render.example
```

---

## 3. Variables minimas

Frontend:

```env
VITE_API_BASE_URL="https://API_DOMAIN/api/v1"
VITE_APP_NAME="Tortilla Plus"
VITE_APP_ENV="production-pilot"
VITE_USE_MOCKS=false
```

API:

```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="32+ chars"
PAYMENT_SECRET_ENCRYPTION_KEY="32+ chars"
CORS_ORIGINS="https://APP_DOMAIN"
BILLING_PROVIDER=mock
PHYSICAL_INTEGRATIONS_MODE=mock
FACTURAPI_ENV=sandbox
```

---

## 4. Roles incluidos

```txt
platform_owner: administracion de plataforma y organizaciones.
organization_owner: administracion de sucursal, usuarios, configuracion y supervision operativa.
manager: operacion diaria, alertas, reportes, produccion, inventario, rutas, clientes y facturacion.
cashier: POS, caja y venta.
supervisor: autorizaciones si esta habilitado para el flujo probado.
```

---

## 5. Flujos manuales

### Plataforma

- [ ] Login con platform_owner.
- [ ] Dashboard de plataforma carga sin mocks.
- [ ] Crear o revisar organizacion piloto.
- [ ] Confirmar que platform_owner no opera POS ni manager de sucursal.

### Owner / Manager

- [ ] Login de organization_owner o manager.
- [ ] Seleccionar sucursal activa.
- [ ] Abrir panel del dia.
- [ ] Entrar a centro de alertas.
- [ ] Confirmar que el header no muestra conteo falso de alertas cuando no hay fuente conectada.
- [ ] Revisar reportes operativos y export CSV.
- [ ] Revisar configuracion basica de sucursal/usuarios si aplica.

### POS / Caja

- [ ] Login de cajero.
- [ ] Abrir caja.
- [ ] Registrar venta con teclado.
- [ ] Validar cobro y cancelacion por atajos.
- [ ] Cerrar caja guiada.
- [ ] Confirmar bloqueo o mensaje claro si no hay caja abierta.

### Produccion

- [ ] Crear lote desde receta.
- [ ] Capturar cantidades.
- [ ] Cerrar lote.
- [ ] Confirmar movimientos de inventario generados.
- [ ] Registrar hallazgo si autorizacion de variacion requiere supervisor/PIN fuera del soporte actual.

### Inventario

- [ ] Revisar stock.
- [ ] Registrar ajuste.
- [ ] Registrar merma.
- [ ] Filtrar movimientos.
- [ ] Confirmar trazabilidad minima: tipo, fecha, producto/insumo, cantidad, referencia tecnica.

### Rutas y Clientes

- [ ] Revisar ruta demo.
- [ ] Entrar a detalle de ruta.
- [ ] Validar ejecucion de entrega/cobro/devolucion desde manager.
- [ ] Revisar cliente con credito y precio especial.
- [ ] Confirmar que no se promete app o login dedicado de repartidor.

### Facturacion

- [ ] Revisar venta elegible.
- [ ] Ejecutar autofactura publica si el ambiente lo permite.
- [ ] Confirmar PDF/XML mock o sandbox segun configuracion.
- [ ] No prometer PAC real si no esta configurado.

---

## 6. Datos demo requeridos

```txt
Usuarios demo: owner, manager, supervisor, cashier y platform_owner.
Password temporal: definido por seed/bootstrap del entorno.
Sucursal demo con productos vendibles.
Cliente demo con credito y precio especial.
Ruta demo con cliente asignado.
Receta demo con insumos suficientes.
Stock suficiente para venta, ajuste, merma y cierre de lote.
Caja lista para apertura por cajero.
Configuracion fiscal sandbox o mock documentada.
```

---

## 7. Go / No-Go

GO staging si:

- [ ] Frontend publico carga con `VITE_USE_MOCKS=false`.
- [ ] API publica responde health y endpoints P0.
- [ ] CORS permite solo el frontend staging esperado.
- [ ] Login y redireccion por rol funcionan.
- [ ] Flujos manuales P0 pasan sin errores criticos.
- [ ] No hay promesas fuera de alcance durante el piloto.

GO condicionado si:

- [ ] Hay hallazgos medios/bajos documentados con workaround operativo.
- [ ] Alertas siguen derivadas en frontend, pero sin conteo falso en header.
- [ ] Movimientos muestran referencia tecnica sin enriquecimiento completo.

NO-GO si:

- [ ] Cualquier pantalla P0 requiere mocks.
- [ ] Login por rol redirige incorrectamente.
- [ ] POS permite venta sin caja cuando debe bloquear.
- [ ] Produccion no genera movimientos auditables.
- [ ] Inventario no muestra movimientos posteriores a ajuste/merma/lote.
- [ ] CORS bloquea dispositivos del piloto o queda abierto sin control.
- [ ] Se detecta acceso cruzado entre plataforma y operacion de sucursal.

---

## 8. Formato de hallazgos

```txt
ID:
Fecha:
Rol:
Pantalla:
Flujo:
Severidad: Critica / Alta / Media / Baja
Pasos:
Resultado esperado:
Resultado observado:
Evidencia:
Decision: corregir antes de piloto / aceptar con workaround / backlog post piloto
```

---

## 9. No prometer en piloto

```txt
- Repartidor autenticado.
- Contador final role.
- Busqueda global funcional.
- Bascula real.
- Alertas backend formales.
- PAC real si no esta configurado.
```

---

## 10. Decision UX-R10

```txt
GO condicionado para preparar piloto staging.
Condicion principal: confirmar URLs publicas, CORS, variables y smoke manual antes de usuarios reales.
```
