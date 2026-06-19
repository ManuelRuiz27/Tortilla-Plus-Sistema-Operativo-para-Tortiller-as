# Tortilla Plus - Manual de produccion V0.1

**Rol:** Produccion  
**Estado:** Base para piloto  
**Screenshots:** `docs/manuals/screenshots/`

---

## 1. Objetivo del rol

Registrar produccion por receta, capturar cantidades reales y cerrar lotes para que inventario refleje consumo de insumos y entrada de producto terminado.

---

## 2. Que puede hacer

- Revisar la pantalla de produccion.
- Crear lote por receta activa.
- Confirmar insumos esperados.
- Capturar salida real.
- Capturar insumos reales.
- Registrar motivo de variacion cuando aplica.
- Cerrar lote si tiene permiso.
- Revisar movimientos generados al cierre.

---

## 3. Que no puede hacer

- No cambia reglas de tolerancia.
- No configura recetas historicas directamente.
- No promete flujo obligatorio masa a tortilla si no esta habilitado como proceso separado.
- No promete agua inventariable si no esta configurada.
- No sustituye autorizacion supervisor/PIN no disponible.

---

## 4. Pasos principales

1. Entrar a Produccion.
2. Abrir Nuevo lote por receta.
3. Elegir receta activa.
4. Revisar salida esperada e insumos esperados.
5. Crear lote.
6. Capturar salida real e insumos reales.
7. Revisar rendimiento y variacion.
8. Capturar motivo si la variacion lo requiere.
9. Cerrar lote.
10. Confirmar que aparecen movimientos de inventario.

---

## 5. Errores comunes

| Caso | Que hacer |
|---|---|
| No hay recetas activas | Pedir al gerente revisar recetas. |
| Falta stock de insumo | Revisar inventario antes de cerrar el lote. |
| Variacion mayor a 3% | Capturar motivo operativo claro. |
| Variacion mayor a 10% | Seguir el criterio de autorizacion disponible para piloto. |
| No aparecen movimientos | Refrescar lote e inventario; si persiste, registrar hallazgo. |

---

## 6. Screenshots referenciados

- Produccion: `screenshots/10-produccion.png`
- Nuevo lote por receta: `screenshots/11-nuevo-lote-receta.png`
- Cierre de lote por receta: `screenshots/12-cierre-lote-receta.png`
- Inventario: `screenshots/13-inventario.png`
- Movimientos de inventario: `screenshots/14-movimientos-inventario.png`
- Reportes: `screenshots/20-reportes.png`

---

## 7. Recomendaciones operativas

- Capturar cantidades reales al cierre del proceso, no estimadas.
- Escribir motivos de variacion entendibles para auditoria.
- Revisar inventario despues del cierre para confirmar entradas y consumos.
- No cerrar lotes con dudas de captura sin validar con gerente.
