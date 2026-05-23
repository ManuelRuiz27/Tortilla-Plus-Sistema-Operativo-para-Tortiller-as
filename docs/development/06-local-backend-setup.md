# Arranque Local Backend

## Requisitos

- Node.js 22 o superior.
- npm 11 o superior.
- Docker con Docker Compose y Docker Desktop/daemon corriendo.
- Espacio libre suficiente para instalar dependencias de Node y Prisma.

## Configuracion

Los comandos se ejecutan desde la raiz del monorepo y delegan al workspace `apps/api`.

1. Copiar variables de entorno del backend:

```bash
cp apps/api/.env.example apps/api/.env
```

En Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

La API carga `apps/api/.env` automaticamente al iniciar en local.

2. Levantar PostgreSQL:

```bash
docker compose up -d postgres
```

3. Instalar dependencias:

```bash
npm install
```

4. Validar Prisma:

```bash
npm run db:validate
```

5. Ejecutar migracion inicial:

```bash
npm run db:migrate
```

6. Compilar y ejecutar seed:

```bash
npm run build
npm run db:seed
```

7. Levantar API:

```bash
npm run dev
```

8. Probar healthcheck:

```bash
curl http://localhost:3000/api/v1/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "tortilla-plus-backend"
}
```

## Scripts

| Script | Uso |
|---|---|
| `npm run dev` | Levanta API en modo desarrollo usando Node 22. |
| `npm run build` | Compila TypeScript a `apps/api/dist/`. |
| `npm run start` | Ejecuta build compilado. |
| `npm run test` | Compila y ejecuta pruebas con `node:test`. |
| `npm run lint` | Ejecuta `tsc --noEmit` como verificacion estatica minima. |
| `npm run db:validate` | Valida `apps/api/prisma/schema.prisma`. |
| `npm run db:migrate` | Ejecuta migraciones Prisma en desarrollo. |
| `npm run db:seed` | Ejecuta seed minimo. |

## Nota Sprint 0

La migracion inicial usa `apps/api/prisma/migrations/0001_initial/migration.sql`, derivada del DDL canonico de handoff. `apps/api/prisma/schema.prisma` queda como fuente de trabajo para Prisma y debe pasar `prisma validate` antes de avanzar a Sprint 1.

## Credenciales demo Sprint 1

El seed crea usuarios operativos para probar autenticacion, roles, permisos, PIN y suscripcion activa.

| Rol | Email | Password | PIN |
|---|---|---|---|
| Owner | `owner.demo@tortillaplus.mx` | `Demo1234!` | `1234` |
| Supervisor | `supervisor.demo@tortillaplus.mx` | `Demo1234!` | `1234` |
| Cajero | `cashier.demo@tortillaplus.mx` | `Demo1234!` | `1234` |

Flujo rapido:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner.demo@tortillaplus.mx","password":"Demo1234!"}'
```

Usar el `accessToken` devuelto como `Authorization: Bearer <accessToken>` para:

- `GET /api/v1/auth/me`
- `POST /api/v1/auth/validate-pin`
- `GET /api/v1/subscriptions/current`
- `GET /api/v1/subscriptions/features`

## Smoke Sprint 2

Con el `accessToken` de owner o cajero, primero obtener `branchId` desde `GET /api/v1/auth/me`.

Flujo minimo de caja:

1. `POST /api/v1/cash-sessions/open` con `branchId` y `openingAmountCounted`.
2. `POST /api/v1/cash-movements/income` para registrar ingreso manual.
3. `POST /api/v1/cash-movements/withdrawals` para solicitar retiro.
4. `POST /api/v1/cash-movements/{id}/authorize` con token de supervisor y PIN `1234`.
5. `GET /api/v1/cash-sessions/{id}/summary`.
6. `POST /api/v1/cash-sessions/{id}/close` con `countedCashAmount`.

El cajero demo puede abrir caja, registrar ingresos y solicitar retiros, pero no puede autorizar retiros.

## Smoke Sprint 3

El seed crea productos demo:

- `TORTILLA-KG`
- `MASA-KG`
- `PAQUETE-800G`
- `SALSA-250`

Flujo minimo de inventario:

1. `GET /api/v1/products`.
2. `GET /api/v1/prices/branch/{branchId}`.
3. `GET /api/v1/inventory/branch/{branchId}`.
4. `POST /api/v1/inventory/adjustments` con token de supervisor u owner.
5. `POST /api/v1/production/batches` con producto tortilla o masa.
6. `PATCH /api/v1/production/batches/{id}/close`.
7. `POST /api/v1/waste-records`.

El cajero demo puede consultar productos e inventario, pero no puede ajustar inventario ni cerrar produccion.

## Smoke Sprint 4

Requiere caja abierta en la sucursal.

Flujo minimo POS:

1. `POST /api/v1/cash-sessions/open`.
2. `POST /api/v1/sales` con `branchId`.
3. `POST /api/v1/sales/{id}/items` con `saleMode` `by_kg`, `by_amount`, `by_package` o `by_unit`.
4. `POST /api/v1/sales/{id}/complete` con pagos exactos.
5. `GET /api/v1/sales/{id}`.
6. `POST /api/v1/sales/{id}/cancel-draft` para venta draft.
7. `POST /api/v1/sales/{id}/cancel-paid` con token de owner/manager.

Reglas visibles:

- Sin caja abierta devuelve `NO_OPEN_CASH_SESSION`.
- Tarjeta sin `reference` devuelve `CARD_REFERENCE_REQUIRED`.
- Pagos que no cuadran devuelven `PAYMENT_TOTAL_MISMATCH`.
- Paquete 800g descuenta `0.800 kg` de `TORTILLA-KG` por paquete.
- Cajero no puede cancelar venta cobrada.

## Smoke Sprint 5

El seed crea `Cliente Demo Credito` con credito habilitado.

Flujo minimo de clientes y credito:

1. `POST /api/v1/customers`.
2. `POST /api/v1/customers/{id}/credit`.
3. `POST /api/v1/customers/{id}/prices`.
4. Crear venta con `customerId`.
5. Completar venta con `paymentMethod: "credit"`.
6. `GET /api/v1/customers/{id}/balance`.
7. Crear devolucion parcial con `POST /api/v1/sales/{id}/returns`.

Reglas visibles:

- Credito sin cliente devuelve `CUSTOMER_REQUIRED_FOR_CREDIT`.
- Cliente sin credito devuelve `CUSTOMER_CREDIT_DISABLED`.
- Credito sobre limite requiere `authorizationPin`.
- Precio especial de cliente se aplica antes que precio de sucursal.
- Devolucion mayor a lo vendido devuelve `INVALID_RETURN_QUANTITY`.

## Smoke Sprint 6

El seed crea `Repartidor Demo`, `Ruta Demo` y asigna `Cliente Demo Credito` a la ruta.

Flujo minimo de rutas:

1. `GET /api/v1/delivery-drivers`.
2. `GET /api/v1/delivery-routes?branchId={branchId}`.
3. `POST /api/v1/delivery-orders` con cliente, ruta, repartidor y productos.
4. `POST /api/v1/delivery-orders/{id}/prepare`.
5. `POST /api/v1/delivery-orders/{id}/load`.
6. `POST /api/v1/delivery-orders/{id}/in-route`.
7. `POST /api/v1/delivery-orders/{id}/deliver`.
8. `POST /api/v1/delivery-orders/{id}/payments`.
9. `POST /api/v1/delivery-returns/{id}/review`.
10. `POST /api/v1/delivery-settlements`.
11. `POST /api/v1/delivery-settlements/{id}/close`.
12. Abrir caja y `POST /api/v1/delivery-settlements/{id}/deposit-to-cash`.

Reglas visibles:

- La carga de ruta descuenta inventario con movimiento `route_load_out`.
- El cobro de ruta no entra a caja automaticamente.
- La devolucion queda `pending_review` hasta revisarse.
- Devolucion vendible crea `route_return_in`; merma crea `return_waste`.
- Deposito de liquidacion a caja crea `route_cash_in`.
