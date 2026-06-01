# Mercado Pago Point Smart - Setup y Pruebas Locales

Fecha: 2026-06-01

## 1. Donde obtener las credenciales

Entra a Mercado Pago Developers:

```txt
https://www.mercadopago.com.mx/developers/panel
```

Luego:

```txt
Tus integraciones -> Crear aplicacion o abrir aplicacion existente -> Credenciales de produccion
```

Mercado Pago muestra nombres distintos a los del `.env`. Usa este mapeo:

| En Mercado Pago Developers | En Tortilla Plus `.env` | Uso |
|---|---|---|
| `Client ID` o `APP_ID` | `MERCADOPAGO_CLIENT_ID` | Identifica la aplicacion OAuth. |
| `Client Secret` | `MERCADOPAGO_CLIENT_SECRET` | Se usa en backend para intercambiar el `code` OAuth. |
| Redirect URL / URL de redireccion | `MERCADOPAGO_REDIRECT_URI` | Debe coincidir exactamente. |
| `Access Token` | No se configura en `.env` para clientes | Se obtiene por OAuth y se guarda cifrado. |
| `Public Key` | No se usa en Point integrado | Solo aplica a otros flujos como Checkout/API. |
| `User ID` | No se configura manualmente | Se recibe por OAuth como `mp_user_id`. |
| `Integrator ID` | `MERCADOPAGO_INTEGRATOR_ID` | Opcional; solo si Mercado Pago te lo entrega. |
| `platform_id` | `MERCADOPAGO_PLATFORM_ID` | Usa `mp` salvo indicacion distinta. |

Configura en `apps/api/.env`:

```env
PHYSICAL_INTEGRATIONS_MODE=real
MERCADOPAGO_CLIENT_ID=APP_USR_xxxxx
MERCADOPAGO_CLIENT_SECRET=xxxxxxxx
MERCADOPAGO_REDIRECT_URI=http://localhost:3000/api/v1/integrations/mercadopago/oauth/callback
MERCADOPAGO_PLATFORM_ID=mp
MERCADOPAGO_INTEGRATOR_ID=
PAYMENT_SECRET_ENCRYPTION_KEY=una_clave_random_larga_de_32_o_mas_caracteres
```

No configures `MERCADOPAGO_ACCESS_TOKEN` ni `MERCADOPAGO_TERMINAL_ID` para esta integracion SaaS. El token se obtiene por OAuth y el `terminal_id` se obtiene al sincronizar terminales.

## 2. Configurar Redirect URL en Mercado Pago

En la aplicacion de Mercado Pago Developers registra exactamente:

```txt
http://localhost:3000/api/v1/integrations/mercadopago/oauth/callback
```

Para pruebas desde otra computadora o celular, `localhost` no sirve. Usa una URL publica segura, por ejemplo un tunel HTTPS, y cambia tanto Mercado Pago Developers como `MERCADOPAGO_REDIRECT_URI`.

## 3. Preparar Point Smart

1. Enciende la Point Smart.
2. Inicia sesion en la terminal con la misma cuenta Mercado Pago que vas a autorizar por OAuth.
3. Verifica que la terminal tenga internet.
4. Verifica que la terminal este asociada a la cuenta y disponible en el panel de Mercado Pago.
5. Si Mercado Pago requiere modo integrado/PDV para Point, habilitalo desde la configuracion de Point indicada por Mercado Pago.

## 4. Levantar Tortilla Plus

Desde la raiz del repo:

```powershell
docker compose up -d postgres
npm run db:generate -w @tortilla-plus/api
npm run build -w @tortilla-plus/api
npm run db:seed -w @tortilla-plus/api
npm run start:api
```

En otra terminal:

```powershell
cd apps/web
npx vite --host 0.0.0.0
```

URLs:

```txt
API: http://localhost:3000/api/v1/health
Web: http://localhost:5173
```

## 5. Conectar Mercado Pago

1. Entra a `http://localhost:5173`.
2. Login demo:

```txt
manager.demo@tortillaplus.mx
Demo1234!
```

3. Ve a:

```txt
Configuracion -> Terminales
```

4. Da clic en `Conectar Mercado Pago`.
5. Mercado Pago abrira la pantalla OAuth.
6. Inicia sesion con la cuenta que tiene la Point Smart.
7. Autoriza la aplicacion.
8. Al volver al sistema, la conexion debe aparecer como `active`.

## 6. Sincronizar terminales

1. En `Configuracion -> Terminales`, da clic en `Probar conexion`.
2. Da clic en `Sincronizar terminales`.
3. El sistema llama a:

```txt
GET https://api.mercadopago.com/terminals/v1/list
```

4. Debe aparecer tu Point Smart con su `terminal_id`.
5. Si no aparece:
   - Confirma que la terminal esta en la misma cuenta autorizada por OAuth.
   - Confirma que la cuenta tiene Point habilitado.
   - Confirma que `PHYSICAL_INTEGRATIONS_MODE=real`.
   - Reautoriza la cuenta si cambiaste credenciales.

## 7. Asignar terminal a un POS

1. En `Configuracion -> Terminales`, selecciona el POS en el campo `POS`.
2. En la tarjeta de la terminal, da clic en `Asignar`.
3. El wizard debe marcar como listo:

```txt
Conectar cuenta
Sincronizar terminales
Seleccionar sucursal
Asignar terminal a POS
```

4. Solo puede haber una terminal Mercado Pago activa por POS.
5. Si asignas otra terminal al mismo POS, el binding anterior se desactiva.

## 8. Cobrar desde POS

1. Ve a:

```txt
Ventas -> POS
```

2. Agrega productos al carrito.
3. Da clic en cobrar.
4. Selecciona `MP` o `Tarjeta Mercado Pago`.
5. Da clic en `Enviar cobro a terminal`.
6. La Point Smart debe mostrar el cobro.
7. Completa el pago en la terminal.
8. El POS consulta estado cada 2.5 segundos.
9. Cuando Mercado Pago confirme `approved`, el sistema ejecuta checkout.
10. La venta queda completada con `provider=mercadopago`.

## 9. Escenarios de prueba obligatorios

Antes de liberar a clientes:

```txt
1. Cobro aprobado.
2. Cobro rechazado.
3. Cobro cancelado desde POS.
4. Orden expirada.
5. Recarga de pantalla con orden pendiente.
6. Cierre de caja con orden pendiente: debe bloquear.
7. Venta mixta efectivo + Mercado Pago aprobada.
8. Venta mixta con Mercado Pago rechazada: no debe completar venta.
9. Conciliacion: approved sin venta debe salir como missing_in_pos.
10. Tarjeta manual solo visible/usable con payments.manual_card_reference.
```

## 10. Notas de seguridad

- `MERCADOPAGO_CLIENT_SECRET` nunca va al frontend.
- `PAYMENT_SECRET_ENCRYPTION_KEY` no viene de Mercado Pago; es una clave propia para cifrar tokens.
- No subir `.env` a git.
- No loggear access tokens.
- Para produccion, usar HTTPS en `MERCADOPAGO_REDIRECT_URI`.
