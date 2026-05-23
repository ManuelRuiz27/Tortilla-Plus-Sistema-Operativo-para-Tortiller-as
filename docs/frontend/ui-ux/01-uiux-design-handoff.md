# Tortilla Plus — UI/UX Design Handoff V0.1

## 1. Objetivo

Definir la experiencia visual y funcional de la PWA de **Tortilla Plus — V1 Operativa Comercial** para dos módulos:

```txt
POS Cajero
PWA Gerente
```

La prioridad no es que “se vea moderna” solamente. La prioridad es:

```txt
rapidez de operación
claridad en caja
baja carga cognitiva
control visual de dinero/mercancía
mínimos errores del usuario
```

---

## 2. Principios UX

### 2.1 POS primero: velocidad

El POS se usa en mostrador, con presión y repetición.

Debe funcionar con:

```txt
teclado
clics mínimos
botones grandes
lectura inmediata
errores claros
sin pantallas saturadas
```

No debe parecer dashboard administrativo.

---

### 2.2 Gerente: control operativo

La PWA del gerente debe responder rápido:

```txt
cuánto se vendió
cuánto dinero debe haber
qué retiros están pendientes
qué inventario está bajo o negativo
qué rutas están pendientes
qué falta facturar
```

No meter gráficas decorativas en V1.

---

### 2.3 Jerarquía visual fuerte

Cada pantalla debe tener una acción principal clara.

Ejemplos:

```txt
Abrir caja
Cobrar
Autorizar retiro
Registrar producción
Cargar ruta
Timbrar factura global
```

Si una pantalla tiene 5 acciones primarias, está mal diseñada.

---

## 3. Identidad visual base

### 3.1 Personalidad visual

Tortilla Plus debe sentirse:

```txt
operativo
confiable
limpio
local/comercial
rápido
no corporativo excesivo
```

Evitar que parezca una app bancaria o dashboard SaaS genérico.

---

### 3.2 Paleta recomendada

Base cálida, relacionada con maíz/tortilla, pero sin caer en colores chillantes.

```css
:root {
  --tp-bg: #faf7ef;
  --tp-surface: #ffffff;
  --tp-surface-soft: #f3eadb;

  --tp-primary: #b56b1f;
  --tp-primary-hover: #945719;
  --tp-primary-soft: #f3d2a6;

  --tp-secondary: #2f5d50;
  --tp-secondary-soft: #d8ebe5;

  --tp-text: #241a12;
  --tp-text-soft: #6f6257;
  --tp-text-muted: #9a8b7c;

  --tp-border: #e0d3c2;
  --tp-border-strong: #c5aa8c;

  --tp-success: #2f7d4f;
  --tp-warning: #c98118;
  --tp-danger: #b83a32;
  --tp-info: #2f5d7c;

  --tp-cash: #2f7d4f;
  --tp-card: #2f5d7c;
  --tp-credit: #8a5a9c;
}
```

### Regla de color

No usar muchos colores.  
Los colores deben comunicar estado:

```txt
verde = correcto / efectivo / éxito
azul = tarjeta / información
amarillo = advertencia
rojo = error / bloqueo
morado = crédito
```

---

## 4. Tipografía

Recomendación:

```txt
Inter
```

Razón: alta legibilidad en pantallas POS, tablets y desktop.

Alternativa:

```txt
Montserrat
```

Pero Inter es más limpia para tablas, números y formularios.

### Escala

```txt
Título pantalla: 24–28px
Subtítulo/sección: 18–20px
Texto normal: 14–16px
Texto auxiliar: 12–13px
Números importantes: 28–40px
Total POS: 40–56px
```

---

## 5. Diseño POS

### 5.1 Objetivo visual del POS

El POS debe sentirse como una caja registradora digital.

Debe priorizar:

```txt
producto
cantidad
carrito
total
cobro
```

No debe priorizar:

```txt
gráficas
menús grandes
configuraciones
reportes
```

---

### 5.2 Layout POS recomendado

```txt
┌──────────────────────────────────────────────┐
│ Header compacto                              │
│ Sucursal | Caja abierta | Cajero | Hora      │
├───────────────────────────────┬──────────────┤
│ Captura rápida                │ Carrito      │
│                               │              │
│ Tortilla kg   Tortilla $      │ Items        │
│ Masa kg       Masa $          │              │
│ Paquete 800g                  │ Total grande │
│                               │              │
│ Productos frecuentes          │ Cobrar       │
│                               │ Cancelar     │
└───────────────────────────────┴──────────────┘
```

### Proporción

```txt
Área captura: 65%
Carrito: 35%
```

---

## 6. POS — Pantallas UX

### 6.1 Login

#### Objetivo

Entrar rápido al sistema.

#### Elementos

```txt
Logo Tortilla Plus
Email
Contraseña
Botón entrar
Error legible
```

#### No incluir

```txt
frases comerciales largas
imágenes grandes
animaciones pesadas
```

---

### 6.2 Selección de sucursal

Solo si el usuario tiene más de una sucursal.

#### Card de sucursal

```txt
Nombre sucursal
Dirección breve
Estado activa/inactiva
Botón entrar
```

#### UX

La sucursal debe quedar clara, porque todas las ventas dependen de eso.

---

### 6.3 Apertura de caja

#### Jerarquía

```txt
1. Saldo sugerido
2. Saldo contado
3. Diferencia
4. Botón abrir caja
```

#### Layout

```txt
Caja inicial

Saldo sugerido: $500.00
Saldo contado: [        ]

Diferencia: $0.00

[ Abrir caja ]
```

#### Si hay discrepancia

Mostrar alerta amarilla:

```txt
El saldo contado no coincide con el saldo sugerido.
La diferencia quedará registrada en auditoría.
```

No bloquear.

---

### 6.4 Venta POS

#### Captura rápida

Botones grandes:

```txt
Tortilla kg
Tortilla $
Masa kg
Masa $
Paquete 800g
```

Cada botón debe abrir input enfocado.

#### Ejemplo input por kg

```txt
Tortilla por kilo

Cantidad: [ 1.5 ] kg
Precio: $28/kg
Total: $42.00

[ Agregar ]
```

#### Ejemplo input por monto

```txt
Tortilla por monto

Monto: [ 20 ] pesos
Equivalente: 0.714 kg
Precio: $28/kg

[ Agregar ]
```

---

### 6.5 Carrito POS

Debe ser más importante que los productos secundarios.

#### Debe mostrar

```txt
Producto
Cantidad
Total
Eliminar
```

#### Total

El total debe ser el elemento más visible del POS.

```txt
TOTAL
$86.00
```

#### Botones

```txt
[ Cobrar ]
[ Cancelar ticket ]
```

Cobrar siempre debe estar fijo abajo.

---

### 6.6 Modal de cobro

#### Tabs

```txt
Efectivo
Tarjeta
Mixto
```

#### Efectivo

```txt
Total: $86.00
Recibido: [ 100 ]
Cambio: $14.00

[ Completar venta ]
```

#### Tarjeta

```txt
Total: $86.00
Referencia terminal: [        ]
Proveedor: [ Terminal manual ]

[ Completar venta ]
```

#### Mixto

```txt
Total: $86.00

Efectivo: [ 40 ]
Tarjeta: [ 46 ]
Referencia: [ MP-123456 ]

Estado: Pago completo

[ Completar venta ]
```

#### Reglas UX

- Botón deshabilitado si el pago no cuadra.
- En tarjeta, enfocar referencia si falta.
- No cerrar modal si backend falla.
- No limpiar carrito hasta venta completada.

---

### 6.7 Venta exitosa

Modal corto.

```txt
Venta completada

Folio: SUC-000124
Total: $86.00
Pago: Efectivo
Cambio: $14.00

[ Nueva venta ]
[ Imprimir ticket ] futuro
```

Enter debe iniciar nueva venta.

---

## 7. Diseño Manager PWA

### 7.1 Objetivo visual

Debe sentirse como panel de control operativo, no como POS.

Prioridades:

```txt
alertas
caja
ventas
inventario
producción
rutas
facturación
```

---

### 7.2 Layout Manager

```txt
┌───────────────────────────────────────────────┐
│ Topbar: sucursal | usuario | plan | alertas   │
├───────────────┬───────────────────────────────┤
│ Sidebar       │ Contenido                      │
│               │                               │
└───────────────┴───────────────────────────────┘
```

### Sidebar

```txt
Dashboard
Caja
Inventario
Producción
Productos
Precios
Clientes
Rutas
Facturación
Reportes
Configuración
```

---

## 8. Manager — Pantallas UX

### 8.1 Dashboard

No debe iniciar con gráficas grandes.

#### Cards principales

```txt
Ventas del día
Caja actual
Efectivo esperado
Retiros pendientes
Stock negativo
Rutas pendientes
Facturación pendiente
```

#### Jerarquía

Las alertas deben ir arriba.

```txt
⚠ Hay 2 retiros pendientes por autorizar
⚠ Hay 3 productos con stock negativo
```

---

### 8.2 Caja

#### Vista

```txt
Caja actual
Retiros pendientes
Ventas por método
Faltante/sobrante
Historial
```

#### Acciones

```txt
Autorizar retiro
Rechazar retiro
Ver detalle
Cerrar caja
```

Si hay retiro pendiente, el cierre debe mostrarse bloqueado visualmente.

---

### 8.3 Detalle de caja

Debe parecer un corte.

```txt
Fondo inicial
Ventas efectivo
Ventas tarjeta
Ventas transferencia
Ventas crédito
Ingresos
Retiros autorizados
Retiros pendientes
Efectivo esperado
Efectivo contado
Diferencia
```

#### Visual

Usar tabla compacta, no cards enormes.

---

### 8.4 Inventario

Tabla clara.

```txt
Producto
Tipo
Stock actual
Mínimo
Estado
Última actualización
Acciones
```

Estados:

```txt
OK
Stock bajo
Stock negativo
Sin stock
```

Stock negativo debe ir en rojo.

---

### 8.5 Producción

Pantalla simple.

```txt
Producción del día

Tortilla producida: [     ] kg
Masa producida: [     ] kg

[ Registrar producción ]
[ Cerrar producción ]
```

No meter formularios complejos.

---

### 8.6 Productos y precios

Productos:

```txt
Nombre
Tipo
Unidad
Estado
Inventario
Acciones
```

Precios:

```txt
Producto
Modo venta
Precio actual
Vigencia
Acción
```

Cuando se cambia precio:

```txt
Nuevo precio
Fecha de inicio
Motivo opcional
```

Mostrar advertencia:

```txt
Las ventas anteriores conservarán su precio histórico.
```

---

### 8.7 Clientes

Lista:

```txt
Nombre
Tipo
Crédito
Límite
Saldo
Estado
```

Detalle:

```txt
Datos generales
Saldo actual
Límite
Precios especiales
Ventas recientes
Movimientos
```

Si saldo supera límite, resaltar.

---

### 8.8 Rutas

Debe diferenciar tres cosas:

```txt
producto cargado
producto entregado
dinero cobrado
dinero liquidado
```

Vista de ruta:

```txt
Ruta Centro
Repartidor
Pedidos del día
Cargado
Entregado
Devuelto
Cobrado
Pendiente de liquidar
```

No mezclar cobro de ruta con caja hasta que se deposite.

---

### 8.9 Facturación

Separar:

```txt
Facturas individuales
Factura global diaria
Errores de timbrado
Documentos
```

La factura global debe tener una card específica:

```txt
Factura global del día

Sucursal: Principal
Fecha: 2026-05-22
Ventas incluidas: 124
Total: $8,420.00

[ Generar global ]
```

Si ya existe:

```txt
Factura global ya generada
[ Ver XML ]
[ Ver PDF ]
```

---

## 9. Componentes visuales base

### Botones

#### Primary

Para acción principal.

```txt
Cobrar
Abrir caja
Completar venta
Autorizar retiro
Registrar producción
```

#### Secondary

Acciones normales.

```txt
Cancelar
Ver detalle
Editar
```

#### Danger

Acciones destructivas o delicadas.

```txt
Cancelar venta
Rechazar retiro
Desactivar producto
```

---

### Cards

Usar cards solo para resumen.

No abusar.  
Tablas son mejores para datos operativos.

---

### Tables

Deben soportar:

```txt
búsqueda
filtro simple
estado visual
acción por fila
empty state
loading state
```

---

### Modales

Usar para:

```txt
cobro
confirmaciones
PIN
autorizar retiro
cambiar precio
ajustar inventario
```

No usar modales para pantallas completas.

---

## 10. Estados visuales obligatorios

Cada pantalla debe contemplar:

```txt
loading
empty
error
success
disabled
blocked by plan
blocked by permission
```

### Blocked by plan

Ejemplo:

```txt
Rutas de reparto no está disponible en tu plan.

Este módulo permite gestionar pedidos, carga, entrega y liquidación de repartidores.

[ Ver planes ] futuro
```

No mostrar 403 crudo.

---

## 11. Diseño responsive

### POS

Prioridad:

```txt
desktop / laptop horizontal
tablet horizontal
```

No optimizar primero para celular.  
Un POS en celular no es cómodo para operación real.

#### Breakpoints

```txt
>= 1024px layout completo
768px–1023px layout compacto
< 768px modo limitado / no recomendado
```

En móvil:

```txt
mostrar advertencia:
Para operar POS se recomienda tablet o pantalla grande.
```

---

### Manager

Debe funcionar en:

```txt
desktop
tablet
celular para consulta rápida
```

En celular:

```txt
sidebar colapsado
cards apiladas
tablas simplificadas
acciones críticas en menú
```

---

## 12. Microinteracciones

Usar pocas.

Permitidas:

```txt
feedback al agregar producto
resaltar total actualizado
toast venta completada
shake leve en error de validación
loading en botón
```

Evitar:

```txt
animaciones largas
transiciones pesadas
efectos decorativos
confetti
gráficas animadas en POS
```

---

## 13. Accesibilidad mínima

```txt
contraste suficiente
labels visibles
focus visible
navegación por teclado
botones grandes en POS
errores asociados al campo
no depender solo de color
```

Tamaños mínimos POS:

```txt
botón rápido: 96px x 64px
botón cobrar: alto mínimo 56px
input principal: alto mínimo 48px
```

---

## 14. QA UI/UX

### UX-QA-001

El cajero puede completar una venta básica sin usar mouse después de login.

### UX-QA-002

El total del carrito es visible a primera vista.

### UX-QA-003

El botón cobrar está siempre visible en venta.

### UX-QA-004

Tarjeta sin referencia enfoca el campo referencia.

### UX-QA-005

Error backend se muestra como mensaje operativo.

### UX-QA-006

El gerente identifica retiros pendientes desde dashboard.

### UX-QA-007

Stock negativo se distingue claramente.

### UX-QA-008

Plan free bloquea módulos premium sin pantalla técnica.

### UX-QA-009

La pantalla de rutas diferencia cobrado vs liquidado.

### UX-QA-010

Factura global diaria muestra si ya fue generada.

---

## 15. Entregables para diseñador UI/UX

El diseñador debe entregar:

```txt
1. Design tokens
2. Component library base
3. Wireframes low-fi POS
4. Wireframes low-fi Manager
5. Mockup high-fi POS venta
6. Mockup high-fi apertura de caja
7. Mockup high-fi modal cobro
8. Mockup high-fi Manager dashboard
9. Mockup high-fi Caja gerente
10. Mockup high-fi Inventario
11. Responsive tablet POS
12. Responsive mobile Manager
```

---

## 16. Orden de diseño recomendado

No diseñar todo al mismo tiempo.

### Bloque 1 — Design system

```txt
colores
tipografía
botones
inputs
cards
tablas
modales
badges
alerts
```

### Bloque 2 — POS

```txt
login
apertura caja
venta
cobro
venta exitosa
errores
```

### Bloque 3 — Manager core

```txt
layout
dashboard
caja
retiros
inventario
producción
```

### Bloque 4 — Manager avanzado

```txt
productos
clientes
rutas
facturación
reportes
settings
```

---

## 17. Riesgos de diseño

### Riesgo 1: hacerlo demasiado “SaaS genérico”

Mala idea.  
Tortilla Plus debe sentirse operativo y local.

### Riesgo 2: meter demasiadas cards

Las cards se ven bien, pero para operación diaria las tablas y listas son más útiles.

### Riesgo 3: ocultar errores

El cajero necesita saber qué corregir, no recibir mensajes vagos.

### Riesgo 4: diseñar mobile-first para POS

El POS debe ser tablet/desktop-first.

### Riesgo 5: dashboard con gráficas innecesarias

El gerente necesita alertas y estado operativo primero.

---

## 18. Definition of Done UI/UX V0.1

```txt
[ ] Design tokens definidos
[ ] Layout POS definido
[ ] Layout Manager definido
[ ] Componentes base definidos
[ ] Pantallas POS críticas diseñadas
[ ] Pantallas Manager core diseñadas
[ ] Estados loading/empty/error definidos
[ ] Estados blocked by plan definidos
[ ] Responsive POS tablet definido
[ ] Responsive Manager mobile definido
[ ] Atajos POS considerados
[ ] QA UX documentado
```

---

## 19. Siguiente paso

Después de este documento sigue:

```txt
UI/UX Screen Specification V0.1
```

Ese documento baja cada pantalla a:

```txt
objetivo
usuario
componentes
contenido
acciones
estado vacío
estado error
estado loading
validaciones
transiciones
```
