# Log De Pruebas Facturapi Sandbox V1

Usar este archivo para registrar cada corrida manual contra Facturapi sandbox.

Reglas:

- No pegar API keys, tokens, CSD, passwords ni secretos.
- Anonimizar RFC/nombres reales si no son datos de prueba.
- No pegar XML completo si contiene datos sensibles.
- Registrar el error normalizado y el mensaje sanitizado.

## Resumen

| Campo | Valor |
|---|---|
| Responsable |  |
| Ambiente | local / staging |
| Fecha inicio |  |
| `BILLING_PROVIDER` | facturapi |
| `FACTURAPI_ENV` | sandbox |
| Cuenta Facturapi | sandbox |
| Commit/branch |  |
| Resultado global | pendiente |

## Checklist De Casos

| Caso | Resultado | Evidencia |
|---|---|---|
| A - Autofactura tarjeta | pendiente |  |
| B - Individual Manager | pendiente |  |
| C - Global diaria | pendiente |  |
| D - Transferencia/credito bajo solicitud | pendiente |  |
| E - Cancelacion CFDI | pendiente |  |
| Logs sin secretos | pendiente |  |
| XML persistente | pendiente |  |
| PDF bajo demanda | pendiente |  |

## Corridas

### Corrida 001

| Campo | Valor |
|---|---|
| Fecha/hora |  |
| Caso | A - Autofactura tarjeta |
| Usuario/rol |  |
| Branch/sucursal |  |
| Sale ID |  |
| Receipt ID |  |
| Invoice ID |  |
| Provider invoice ID |  |
| CFDI UUID |  |
| Estado final |  |
| Resultado | pendiente |

Pasos ejecutados:

```txt
1.
2.
3.
```

Evidencia:

```txt
Provider log ID:
XML contentSha256:
PDF descargado: si/no
```

Errores:

```txt
errorCode:
errorMessage sanitizado:
respuesta Facturapi sanitizada:
```

Notas:

```txt

```

### Corrida 002

| Campo | Valor |
|---|---|
| Fecha/hora |  |
| Caso | B - Individual Manager |
| Usuario/rol |  |
| Branch/sucursal |  |
| Sale ID |  |
| Receipt ID | n/a |
| Invoice ID |  |
| Provider invoice ID |  |
| CFDI UUID |  |
| Estado final |  |
| Resultado | pendiente |

Pasos ejecutados:

```txt
1.
2.
3.
```

Evidencia:

```txt
Provider log ID:
XML contentSha256:
PDF descargado: si/no
```

Errores:

```txt
errorCode:
errorMessage sanitizado:
respuesta Facturapi sanitizada:
```

Notas:

```txt

```

### Corrida 003

| Campo | Valor |
|---|---|
| Fecha/hora |  |
| Caso | C - Global diaria |
| Usuario/rol |  |
| Branch/sucursal |  |
| Sale IDs incluidos |  |
| Invoice ID |  |
| Provider invoice ID |  |
| CFDI UUID |  |
| Estado final |  |
| Resultado | pendiente |

Pasos ejecutados:

```txt
1.
2.
3.
```

Evidencia:

```txt
Provider log ID:
XML contentSha256:
PDF descargado: si/no
Ventas included_in_global: si/no
```

Errores:

```txt
errorCode:
errorMessage sanitizado:
respuesta Facturapi sanitizada:
```

Notas:

```txt

```

### Corrida 004

| Campo | Valor |
|---|---|
| Fecha/hora |  |
| Caso | D - Transferencia/credito bajo solicitud |
| Usuario/rol |  |
| Branch/sucursal |  |
| Sale IDs |  |
| Receipt IDs |  |
| Estado final |  |
| Resultado | pendiente |

Validaciones:

```txt
Transfer sin requestInvoice no genera receipt:
Transfer con requestInvoice genera receipt:
Credito sin requestInvoice queda global:
Credito con requestInvoice queda pending_customer_invoice:
```

Errores:

```txt
errorCode:
errorMessage sanitizado:
```

Notas:

```txt

```

### Corrida 005

| Campo | Valor |
|---|---|
| Fecha/hora |  |
| Caso | E - Cancelacion CFDI |
| Usuario/rol |  |
| Invoice ID |  |
| Provider invoice ID |  |
| CFDI UUID |  |
| Motivo SAT |  |
| Motivo interno |  |
| Estado final |  |
| Resultado | pendiente |

Evidencia:

```txt
Provider log ID:
Acuse XML disponible: si/no
Acuse PDF disponible: si/no
```

Errores:

```txt
errorCode:
errorMessage sanitizado:
respuesta Facturapi sanitizada:
```

Notas:

```txt

```

## Incidencias Para Codex

Copiar una seccion por cada problema que requiera ajuste de codigo.

### Incidencia 001

| Campo | Valor |
|---|---|
| Fecha/hora |  |
| Severidad | bloqueante / alta / media / baja |
| Caso |  |
| Paso donde fallo |  |
| Error normalizado |  |
| Reproducible | si/no |
| Requiere cambio codigo | pendiente |

Contexto:

```txt

```

Payload sanitizado:

```json
{}
```

Respuesta sanitizada:

```json
{}
```

Decision:

```txt

```
