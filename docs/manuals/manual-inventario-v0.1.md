# Tortilla Plus - Manual de inventario V0.1

**Rol:** Inventario  
**Estado:** Base para piloto  
**Screenshots:** `docs/manuals/screenshots/`

---

## 1. Objetivo del rol

Mantener control operativo de existencias, ajustes, merma y movimientos trazables del ledger de inventario.

---

## 2. Que puede hacer

- Revisar existencias.
- Identificar stock correcto, bajo, agotado o negativo.
- Registrar ajustes permitidos.
- Registrar merma con motivo.
- Filtrar movimientos por producto, tipo, fecha o referencia.
- Revisar movimientos generados por venta, ruta, produccion o ajuste.

---

## 3. Que no puede hacer

- No cambia reglas de stock negativo.
- No registra movimientos fuera del ledger.
- No promete reorden automatico.
- No promete descuento automatico de empaques en venta.
- No debe interpretar IDs tecnicos como folios finales enriquecidos.

---

## 4. Pasos principales

1. Entrar a Inventario.
2. Revisar resumen de existencias.
3. Buscar producto o insumo.
4. Registrar ajuste o merma solo con motivo real.
5. Revisar Movimientos trazables.
6. Filtrar por producto o tipo de movimiento.
7. Confirmar cantidad, unidad, referencia y fecha.

---

## 5. Errores comunes

| Caso | Que hacer |
|---|---|
| Producto no aparece | Confirmar que sea stockeable. |
| Stock bajo | Avisar a gerente o produccion segun el insumo/producto. |
| Referencia poco legible | Registrar hallazgo; actualmente puede mostrarse referencia tecnica. |
| Ajuste sin motivo claro | No registrar hasta tener motivo operativo. |
| Merma confundida con ajuste | Usar Merma cuando el producto no regresa como vendible. |

---

## 6. Screenshots referenciados

- Inventario: `screenshots/13-inventario.png`
- Movimientos de inventario: `screenshots/14-movimientos-inventario.png`
- Produccion: `screenshots/10-produccion.png`
- Cierre de lote por receta: `screenshots/12-cierre-lote-receta.png`
- Reportes: `screenshots/20-reportes.png`

---

## 7. Recomendaciones operativas

- Todo ajuste debe tener motivo claro.
- Revisar movimientos despues de cada cierre de lote.
- Usar filtros antes de asumir que un movimiento no existe.
- Escalar referencias tecnicas poco legibles como deuda de auditoria, no como error de captura.
