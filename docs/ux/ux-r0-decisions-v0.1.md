# Tortilla Plus - Decisiones UX-R0 V0.1

**Area:** UX/UI, frontend  
**Estado:** Decisiones abiertas detectadas en auditoria  
**Fecha:** 2026-06-17  

---

## 1. Proposito

Registrar decisiones pendientes antes de iniciar o durante el arranque de UX-R1. Estas decisiones no agregan reglas de negocio; definen direccion tecnica/UX para implementar la documentacion oficial sin romper el producto actual.

---

## 2. Decisiones abiertas

### UX-R0-D01 - Estrategia de rutas

**Decision:**  
Definir si se crean rutas canonicas nuevas como `/app/production`, `/app/inventory`, `/app/reports`, manteniendo redirects desde `/app/manager/...`, o si se conserva `/app/manager/...` y solo cambia la navegacion visible.

**Contexto:**  
La documentacion UX sugiere rutas por intencion de usuario. El frontend actual centraliza operacion manager bajo `/app/manager/...`.

**Opciones:**

```txt
A. Crear rutas canonicas por area y mantener legacy redirects.
B. Mantener rutas actuales y cambiar solo labels/nav.
```

**Resolucion UX-R2:**  
A. Se crearon rutas canonicas bajo `/app/...` para las areas principales y se conservaron las rutas legacy `/app/manager/...`.

**Impacto:**  
UX-R2.

---

### UX-R0-D02 - Busqueda global

**Decision pendiente:**  
Definir si UX-R1 solo crea el slot visual/atajo `Ctrl+K` o si implementa busqueda funcional.

**Contexto:**  
La documentacion exige busqueda global, pero no se detecto endpoint unico para producto, cliente, receta, lote, venta, factura, ruta y movimiento.

**Opciones:**

```txt
A. UX-R1 crea componente y atajo sin busqueda completa; UX-R3/R8 conectan fuentes.
B. UX-R1 implementa busqueda local por fuentes disponibles.
C. Bloquear UX-R1 hasta tener endpoint global.
```

**Recomendacion:**  
A. No bloquear base visual por una capacidad que puede requerir backend.

**Impacto:**  
UX-R1, UX-R3, UX-R8.

---

### UX-R0-D03 - Alertas operativas sin backend dedicado

**Decision:**  
Definir si el centro de alertas inicial deriva alertas desde datos existentes o espera un endpoint formal.

**Contexto:**  
No existe pagina de alertas. `DashboardPage` ya muestra algunas excepciones con datos del dashboard.

**Opciones:**

```txt
A. Derivar alertas frontend desde datos existentes.
B. Solicitar endpoint backend de alertas antes de UX-R3.
C. Hacer solo alertas visuales estaticas.
```

**Resolucion UX-R3:**  
A. Se implemento centro de alertas con derivacion frontend desde datos existentes. La falta de endpoint formal queda registrada como `UX-DEBT-020`.

**Impacto:**  
UX-R3.

---

### UX-R0-D04 - Rol repartidor

**Decision:**  
Definir si la experiencia repartidor se implementa con permisos/ruta dedicada sobre usuarios existentes o si requiere nuevo `UserRole`.

**Contexto:**  
La fuente de verdad post R8 indica que repartidor sigue como entidad operativa, no `UserRole`, en el estado actual preparado para piloto.

**Opciones:**

```txt
A. Crear modo repartidor accesible por gerente/operador autorizado sin nuevo rol backend.
B. Crear nuevo rol frontend/backend.
C. Mantener solo vista gerente para piloto.
```

**Resolucion UX-R9:**  
A. Para piloto controlado, el repartidor no entra como usuario autenticado. Permanece como entidad operativa administrada desde rutas por gerente/owner. No se crea nuevo `UserRole`.

**Impacto:**  
UX-R7, UX-R9.

---

### UX-R0-D05 - Autorizacion de variacion alta en produccion

**Decision:**  
Definir la UX para autorizacion de variacion >10% sin cambiar reglas backend.

**Contexto:**  
La UI actual envia `authorizedByUserId` como usuario actual cuando la variacion es mayor a 10%. La documentacion UX pide que se explique que requiere autorizacion de gerente.

**Opciones:**

```txt
A. Mostrar bloqueo/copy de autorizacion y usar permiso actual si backend ya valida.
B. Pedir PIN/autorizador en UI si endpoint lo permite.
C. Dejar comportamiento actual y solo mejorar copy.
```

**Resolucion UX-R5:**  
A. Se muestra bloqueo/copy de autorizacion y se conserva el comportamiento actual sin agregar PIN ni nuevo autorizador. La UI explica que el cierre usara el usuario actual si tiene permiso.

**Impacto:**  
UX-R5.

---

### UX-R0-D06 - Alcance de tokens visuales

**Decision:**  
Definir si UX-R1 reemplaza todos los tokens `--tp-*` por los nombres oficiales o si mantiene aliases compatibles.

**Contexto:**  
El CSS actual ya tiene tokens y muchas clases Tailwind dependen de nombres existentes.

**Opciones:**

```txt
A. Mantener `--tp-*` y alinear valores como aliases del design system.
B. Renombrar tokens a `--color-*` en todo el frontend.
```

**Resolucion UX-R1:**  
A. Se mantuvieron aliases `--tp-*` y se alinearon valores base con el sistema de diseno operativo. Se agregaron componentes compartidos sin renombrar tokens en todo el frontend.

**Impacto:**  
UX-R1.

---

## 3. Decision para inicio UX-R1

UX-R1 puede iniciar sin bloquearse por estas decisiones si se adopta temporalmente la recomendacion de cada punto.

Bloqueos para UX-R1:

```txt
Ninguno critico.
```

Restricciones:

```txt
- No implementar busqueda global completa si requiere backend.
- No crear rol repartidor backend.
- No cambiar reglas de autorizacion de variacion.
- No romper rutas existentes.
```
