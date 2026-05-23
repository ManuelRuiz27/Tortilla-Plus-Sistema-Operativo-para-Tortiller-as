# Deuda tecnica frontend

Actualizado: 2026-05-23

## Resuelto en el ultimo avance

- Login: removido selector de modo cajero/gerente; la navegacion ahora depende solo de roles devueltos por la API.
- API: verificado `http://localhost:3000/api/v1/health` con respuesta `200`; `.env.local` apunta a `http://localhost:3000/api/v1` con mocks apagados.
- Responsive: `ManagerLayout` ahora cambia a navegacion superior desplazable en pantallas chicas.
- Responsive: `POSLayout` ahora envuelve header y reduce padding en mobile.
- Responsive: tablas manager ahora tienen scroll horizontal para evitar romper el viewport.
- QA tecnico: build/lint verificados despues de la pasada responsive.
- Permisos: acciones sensibles migradas a `PermissionButton` en productos, precios, inventario, produccion, caja, clientes, rutas, retiros y facturacion.
- Configuracion: refresh de plan/features conectado a `GET /subscriptions/features`.
- Configuracion: vista de roles y permisos cargados para depurar bloqueos.
- Suscripcion: el login ahora carga features reales despues de autenticar.
- Guards: textos de `FeatureGuard`, `RoleGuard` y `PermissionGuard` normalizados sin caracteres rotos.
- Permisos: agregado `PermissionButton` reutilizable para deshabilitar acciones sin permiso.
- Facturacion: filtros por fecha, refresh manual y estados vacios para ventas/facturas.
- Reportes: filtros por rango de fechas/sucursal activa y estados vacios por grafica.
- Rutas: detalle `/app/manager/routes/:routeId` creado.
- Rutas: creacion de pedido conectada a `POST /delivery-orders`.
- Rutas: preparar, cargar, marcar en ruta y entregar conectados a endpoints de `delivery-orders`.
- Rutas: cobro conectado a `POST /delivery-orders/{id}/payments`.
- Rutas: liquidacion conectada a `POST /delivery-settlements`, cierre y deposito a caja.
- Caja: resumen conectado a `GET /cash-sessions/{id}/summary`.
- Caja: cierre conectado a `POST /cash-sessions/{id}/close`.
- Caja: ingreso manual conectado a `POST /cash-movements/income`.
- Caja: solicitud de retiro conectada a `POST /cash-movements/withdrawals`.
- Inventario: registro de merma conectado a `POST /waste-records`.
- Produccion: alta de lote corregida para usar productos reales marcados con `requiresProduction`, sin IDs demo hardcodeados.
- Produccion: accion de cierre conectada a `PATCH /production/batches/{id}/close`.
- Clientes: detalle `/app/manager/customers/:customerId`, edicion, credito, balance y precio especial conectados a endpoints disponibles.
- Productos: alta y edicion base conectadas a `POST /products` y `PATCH /products/{id}`.
- Precios: alta de precio por sucursal conectada a `POST /prices/branch`.
- Invalidacion de cache para refrescar catalogo manager y productos POS despues de cambios.
- Tipos frontend de producto alineados con campos reales de API: `barcode`, `isSellable`, stock, produccion y estado.

## Deuda critica

- Falta QA manual end to end contra API viva: login, sucursal, POS, venta, productos, precios, inventario y manager.
- Falta validar responsive/mobile con screenshots reales en rutas principales; ya se corrigieron layout base y tablas, pero no hay captura automatizada.
- Faltan pruebas manuales con usuarios de permisos reducidos para validar bloqueos visuales vs. errores backend.
- Faltan estados vacios consistentes en varias tablas cuando la API regresa listas vacias.
- Falta manejo visual uniforme de errores de mutaciones en formularios manager.

## Deuda por endpoints backend faltantes

- `GET /cash-movements?status=pending_authorization&branchId=` para retiros pendientes reales.
- `GET /production/batches?branchId=&date=` para lista real de produccion diaria.
- `GET /reports/sales-by-day`, `/sales-by-branch`, `/sales-by-product`, `/sales-by-customer`, `/cash-withdrawals-by-reason`, `/cash-differences`.
- `GET /billing/invoices?branchId=&date=` o equivalente para facturas emitidas/facturables.
- `GET /billing/invoices/{id}/documents` para XML/PDF.
- `GET /delivery-orders?branchId=&status=` para operar pedidos de ruta desde UI.
- `GET /branches`, `PATCH /branches/{id}`, `GET/POST /pos-devices`, `PATCH /pos-devices/{id}/activate`.
- `GET /customers/{id}` sigue pendiente; el detalle de cliente resuelve datos generales desde `GET /customers` y balance desde `GET /customers/{id}/balance`.

## Deuda funcional frontend

- Productos: falta soporte UI para configuracion de paquetes (`packageConfig`) y categorias si se habilitan en backend.
- Precios: falta edicion asistida desde una fila existente y validacion por modo recomendado segun tipo de producto.
- Clientes: falta historial/listado de precios especiales activos y mejor manejo visual de errores por feature `customer_credit`.
- Rutas: falta listado real de pedidos por ruta por ausencia de `GET /delivery-orders`; el detalle usa fallback para mostrar pedidos.
- Rutas: falta UI completa para devoluciones revisables porque no hay listado GET de devoluciones pendientes.
- Produccion: falta lectura real de lotes porque sigue pendiente `GET /production/batches?branchId=&date=`.
- Inventario: falta historial de movimientos y validaciones mas estrictas de cantidad segun unidad del producto.
- Caja: falta catalogo/listado de motivos de caja para no capturar `reasonId` manualmente y falta vista historica por falta de `GET /cash-movements`.
- Facturacion: UI base con filtros lista, pero faltan flujos reales de timbrado, cancelacion y documentos.
- Reportes: visual base con filtros lista, pero falta conexion real a endpoints de reportes.
- Configuracion: vista base lista y features reales conectadas, pero falta edicion real de sucursal, POS devices y motivos de caja.

## Deuda tecnica de implementacion

- Los builders demo siguen centralizados en `mock-data.ts`; conviene separarlos por dominio si crecen mas.
- Algunas pantallas manager repiten patrones de tabla/formulario; se puede extraer un componente de `DataTable` cuando el comportamiento se estabilice.
- El modo mock no persiste altas/ediciones de productos y precios; solo simula respuesta. Para QA offline conviene store mock en memoria.
- Falta suite automatizada de UI o smoke tests para rutas protegidas.
- Falta verificar instalacion PWA y comportamiento offline mas alla del build del service worker.
