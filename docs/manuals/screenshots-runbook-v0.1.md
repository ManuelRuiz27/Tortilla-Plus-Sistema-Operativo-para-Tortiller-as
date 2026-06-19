# Tortilla Plus - Runbook de screenshots automatizados V0.1

**Area:** QA Automation / Documentacion operativa  
**Spec:** `apps/web/e2e/manual-screenshots.spec.ts`  
**Salida:** `docs/manuals/screenshots/`

---

## 1. Objetivo

Regenerar screenshots oficiales para manuales de usuario final por rol operativo sin modificar backend ni reglas de negocio.

---

## 2. Preparar ambiente

1. Tener base local disponible para la API.
2. Aplicar migraciones necesarias.
3. Confirmar que el seed E2E/demo crea usuarios operativos.
4. Confirmar que frontend usa API real local y mocks apagados.
5. Confirmar que no hay otro proceso ocupando los puertos `3199` y `5179`.

El `playwright.config.ts` del web levanta automaticamente:

```txt
API: http://127.0.0.1:3199/api/v1
Web: http://127.0.0.1:5179
```

---

## 3. Variables requeridas

El webServer E2E define estas variables minimas:

```env
VITE_API_BASE_URL=http://127.0.0.1:3199/api/v1
VITE_APP_ENV=audit
VITE_USE_MOCKS=false
```

La API E2E usa:

```env
DATABASE_URL=postgresql://tortilla_plus:tortilla_plus_dev@localhost:5432/tortilla_plus?schema=public
HOST=127.0.0.1
PORT=3199
JWT_SECRET=change_me_in_local_development
CORS_ORIGINS=http://127.0.0.1:5179
```

Variable opcional del spec:

```env
E2E_API_BASE_URL=http://127.0.0.1:3199/api/v1
```

---

## 4. Comando para correr screenshots

Desde la raiz del repo:

```powershell
npm run test:e2e -w @tortilla-plus/web -- manual-screenshots.spec.ts
```

---

## 5. Donde se guardan

Los archivos PNG se guardan en:

```txt
docs/manuals/screenshots/
```

Lista esperada:

```txt
01-login.png
02-seleccion-sucursal.png
03-panel-del-dia.png
04-centro-alertas.png
05-pos-nueva-venta.png
06-pos-ticket-con-productos.png
07-modal-cobro.png
08-caja.png
09-cierre-caja.png
10-produccion.png
11-nuevo-lote-receta.png
12-cierre-lote-receta.png
13-inventario.png
14-movimientos-inventario.png
15-clientes.png
16-detalle-cliente.png
17-rutas.png
18-detalle-ruta.png
19-facturacion.png
20-reportes.png
```

---

## 6. Como actualizar manuales

1. Ejecutar el spec de screenshots.
2. Revisar visualmente los PNG generados.
3. Si cambia el nombre de un PNG, actualizar las referencias en:
   - `docs/manuals/manual-cajero-v0.1.md`
   - `docs/manuals/manual-gerente-v0.1.md`
   - `docs/manuals/manual-produccion-v0.1.md`
   - `docs/manuals/manual-inventario-v0.1.md`
   - `docs/manuals/manual-administrador-v0.1.md`
4. Si cambia el flujo operativo, actualizar primero la documentacion UX fuente de verdad.
5. No documentar funciones fuera de alcance del piloto.

---

## 7. Fallas conocidas y registro

Si el spec falla por ambiente, registrar aqui:

```txt
Fecha:
Comando:
Error exacto:
Causa probable:
Decision:
```

Estado actual:

```txt
2026-06-19:
npm run test:e2e -w @tortilla-plus/web -- manual-screenshots.spec.ts -> passed, 20 screenshots generados.

Nota:
Las pantallas de rutas usan fixtures controlados con Playwright dentro del spec porque el seed local no expone rutas operables para screenshots en todos los roles demo. Esto no modifica backend ni activa funcionalidad productiva.
```

---

## 8. Fuera de alcance a no prometer

```txt
- Repartidor autenticado.
- Contador final role.
- Busqueda global funcional.
- Bascula real.
- Alertas backend formales.
- PAC real si no esta configurado.
```
